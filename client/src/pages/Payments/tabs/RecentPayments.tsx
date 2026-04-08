import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Loader2, Plus, Search, AlertCircle } from "lucide-react";
import type { Member, Payment } from "@shared/schema";

const paymentMethods = [
  { label: "Cash", value: "cash" },
  { label: "UPI", value: "upi" },
  { label: "Card", value: "card" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Other", value: "other" },
] as const;

function formatMethod(method: string) {
  const found = paymentMethods.find((m) => m.value === method);
  return found?.label ?? method;
}

function formatMoney(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

interface SubscriptionStatus {
  id: string;
  totalDue: number;
  originalTotalDue: number;
  discountPercentage: number;
  amountPaid: number;
  remaining: number;
  paymentStatus: "paid" | "pending" | "overdue";
}

interface RecentPaymentsProps {
  members: Member[];
}

export function RecentPayments({ members }: RecentPaymentsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openCreate, setOpenCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [memberId, setMemberId] = useState<string | "all">("all");
  const [selectedMemberPending, setSelectedMemberPending] = useState<{
    remaining: number;
    originalAmount: number;
    discountPercentage: number;
  } | null>(null);
  const [showCustomAmount, setShowCustomAmount] = useState(false);

  const [form, setForm] = useState({
    memberId: "",
    originalAmount: "",
    discountPercentage: "0",
    finalAmount: "",
    method: "cash",
    notes: "",
  });

  // Fetch member subscription status when a member is selected
  const { data: subscriptionStatusData } = useQuery<{
    members: SubscriptionStatus[];
  }>({
    queryKey: ["/api/payments/subscription-status"],
    queryFn: async () => {
      const res = await fetch("/api/payments/subscription-status");
      if (!res.ok) throw new Error("Failed to fetch subscription status");
      return res.json();
    },
    enabled: !!form.memberId,
  });

  // Get the selected member's pending payment info
  const selectedMemberStatus = useMemo(() => {
    if (!form.memberId || !subscriptionStatusData?.members) return null;
    return subscriptionStatusData.members.find((m) => m.id === form.memberId);
  }, [form.memberId, subscriptionStatusData]);

  // Handle member selection and populate pending payment info
  const handleMemberSelect = (memberId: string) => {
    setForm((f) => ({
      ...f,
      memberId,
      originalAmount: "",
      discountPercentage: "0",
      finalAmount: "",
      notes: "",
    }));
    setSelectedMemberPending(null);
    setShowCustomAmount(false);
  };

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<
    Payment[]
  >({
    queryKey: [
      "/api/payments",
      memberId === "all" ? "" : `?memberId=${memberId}`,
    ],
    queryFn: async ({ queryKey }) => {
      const url = `${queryKey[0] as string}${(queryKey[1] as string) || ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
  });

  const membersById = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => {
      const member = membersById.get(p.memberId);
      const memberName = `${member?.firstName ?? ""} ${member?.lastName ?? ""}`
        .trim()
        .toLowerCase();
      const notes = (p.notes ?? "").toLowerCase();
      return (
        memberName.includes(q) ||
        notes.includes(q) ||
        p.method.toLowerCase().includes(q)
      );
    });
  }, [payments, search, membersById]);

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      let originalAmount: number;
      let discountPercentage: number;
      let amount: number;

      // If custom final amount is entered, use it directly
      if (form.finalAmount && parseInt(form.finalAmount, 10) > 0) {
        originalAmount = parseInt(form.originalAmount, 10) || 0;
        discountPercentage = parseInt(form.discountPercentage, 10) || 0;
        amount = parseInt(form.finalAmount, 10);
      } else if (selectedMemberPending) {
        // When applying pending balance, the originalAmount is the remaining balance
        // and discount is already factored in
        originalAmount = selectedMemberPending.originalAmount;
        discountPercentage = selectedMemberPending.discountPercentage;
        amount = selectedMemberPending.remaining;
      } else {
        originalAmount = parseInt(form.originalAmount, 10);
        discountPercentage = parseInt(form.discountPercentage, 10) || 0;
        amount = Math.round(originalAmount * (1 - discountPercentage / 100));
      }

      const payload = {
        memberId: form.memberId,
        originalAmount,
        amount,
        discountPercentage,
        method: form.method,
        notes: form.notes || undefined,
        status: "paid",
        sourceType: "membership",
      };

      const res = await apiRequest("POST", "/api/payments", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/payments/subscription-status"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Payment recorded" });
      setOpenCreate(false);
      setForm({
        memberId: "",
        originalAmount: "",
        discountPercentage: "0",
        finalAmount: "",
        method: "cash",
        notes: "",
      });
      setSelectedMemberPending(null);
      setShowCustomAmount(false);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to record payment",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    },
  });

  const selectedMemberName = (id: string) => {
    const m = membersById.get(id);
    if (!m) return id;
    return `${m.firstName} ${m.lastName || ""}`.trim();
  };

  return (
    <>
      <Sheet open={openCreate} onOpenChange={setOpenCreate}>
        <SheetTrigger asChild>
          <div className="w-full flex justify-end">
            <Button className="gap-2" data-testid="button-add-payment">
              <Plus className="h-4 w-4" /> Record Payment
            </Button>
          </div>
        </SheetTrigger>
        <SheetContent className="sm:max-w-xl w-full bg-card border-l border-border overflow-y-auto">
          <SheetHeader className="border-b border-border pb-6 mb-6">
            <SheetTitle className="text-2xl font-bold font-heading text-primary uppercase tracking-tight flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Record Payment
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Member
              </label>
              <Select value={form.memberId} onValueChange={handleMemberSelect}>
                <SelectTrigger className="bg-background border-border h-11">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName} {m.lastName || ""} ({m.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMemberStatus && selectedMemberStatus.remaining > 0 && (
                <div className="mt-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-2 text-yellow-600 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Pending Balance Found
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-yellow-600/80">
                    <p>
                      Original:{" "}
                      {formatMoney(selectedMemberStatus.originalTotalDue)}
                    </p>
                    <p>Discount: {selectedMemberStatus.discountPercentage}%</p>
                    <p>
                      Total Due: {formatMoney(selectedMemberStatus.totalDue)}
                    </p>
                    <p>
                      Already Paid:{" "}
                      {formatMoney(selectedMemberStatus.amountPaid)}
                    </p>
                    <p className="font-semibold text-yellow-600">
                      Pending: {formatMoney(selectedMemberStatus.remaining)}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10 font-medium"
                      onClick={() => {
                        const originalAmount =
                          selectedMemberStatus.originalTotalDue;
                        const discount =
                          selectedMemberStatus.discountPercentage;
                        setForm((f) => ({
                          ...f,
                          originalAmount: originalAmount.toString(),
                          discountPercentage: discount.toString(),
                          finalAmount:
                            selectedMemberStatus.remaining.toString(),
                          notes: f.notes || "Pending balance payment",
                        }));
                        setSelectedMemberPending({
                          remaining: selectedMemberStatus.remaining,
                          originalAmount,
                          discountPercentage: discount,
                        });
                        setShowCustomAmount(false);
                      }}
                    >
                      Pay Full ({formatMoney(selectedMemberStatus.remaining)})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10 font-medium"
                      onClick={() => {
                        const originalAmount =
                          selectedMemberStatus.originalTotalDue;
                        const discount =
                          selectedMemberStatus.discountPercentage;
                        const halfAmount = Math.round(
                          selectedMemberStatus.remaining / 2,
                        );
                        setForm((f) => ({
                          ...f,
                          originalAmount: originalAmount.toString(),
                          discountPercentage: discount.toString(),
                          finalAmount: halfAmount.toString(),
                          notes: f.notes || "Partial payment (50%)",
                        }));
                        setSelectedMemberPending({
                          remaining: selectedMemberStatus.remaining,
                          originalAmount,
                          discountPercentage: discount,
                        });
                        setShowCustomAmount(false);
                      }}
                    >
                      50% (
                      {formatMoney(
                        Math.round(selectedMemberStatus.remaining / 2),
                      )}
                      )
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10 font-medium"
                      onClick={() => {
                        const originalAmount =
                          selectedMemberStatus.originalTotalDue;
                        const discount =
                          selectedMemberStatus.discountPercentage;
                        setForm((f) => ({
                          ...f,
                          originalAmount: originalAmount.toString(),
                          discountPercentage: discount.toString(),
                          finalAmount: "",
                          notes: f.notes || "Custom installment payment",
                        }));
                        setSelectedMemberPending({
                          remaining: selectedMemberStatus.remaining,
                          originalAmount,
                          discountPercentage: discount,
                        });
                        setShowCustomAmount(true);
                      }}
                    >
                      Custom
                    </Button>
                  </div>
                </div>
              )}
              {selectedMemberStatus &&
                selectedMemberStatus.remaining <= 0 &&
                selectedMemberStatus.paymentStatus === "paid" && (
                  <div className="mt-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-2 text-green-600">
                      <span className="text-sm font-medium">
                        ✓ Member has no pending balance
                      </span>
                    </div>
                  </div>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Original Amount (₹)
                </label>
                <Input
                  type="number"
                  value={form.originalAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, originalAmount: e.target.value }))
                  }
                  placeholder="0"
                  className="bg-background border-border h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Discount %
                </label>
                <Input
                  type="number"
                  value={form.discountPercentage}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      discountPercentage: e.target.value,
                    }))
                  }
                  placeholder="0"
                  min="0"
                  max="100"
                  className="bg-background border-border h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Final Amount (₹)
                </label>
                {showCustomAmount ? (
                  <Input
                    type="number"
                    value={form.finalAmount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, finalAmount: e.target.value }))
                    }
                    placeholder="Enter custom amount"
                    min="1"
                    className="bg-background border-green-500/50 h-11"
                    autoFocus
                  />
                ) : selectedMemberPending ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-md h-11 px-4 flex items-center font-semibold text-green-600">
                    {form.finalAmount
                      ? formatMoney(parseInt(form.finalAmount, 10))
                      : formatMoney(selectedMemberPending.remaining)}
                  </div>
                ) : (
                  <div className="bg-muted/30 border border-border rounded-md h-11 px-4 flex items-center font-semibold text-green-600">
                    {(() => {
                      const original = parseInt(form.originalAmount, 10) || 0;
                      const discount =
                        parseInt(form.discountPercentage, 10) || 0;
                      return formatMoney(
                        Math.round(original * (1 - discount / 100)),
                      );
                    })()}
                  </div>
                )}
                {showCustomAmount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Remaining:{" "}
                    {formatMoney(selectedMemberPending?.remaining || 0)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Method
                </label>
                <Select
                  value={form.method}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, method: value }))
                  }
                >
                  <SelectTrigger className="bg-background border-border h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Notes
              </label>
              <Input
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Optional"
                className="bg-background border-border h-11"
              />
            </div>
            <div className="flex gap-3 pt-6 border-t border-border">
              <SheetClose asChild>
                <Button variant="outline" className="flex-1">
                  Cancel
                </Button>
              </SheetClose>
              <Button
                className="flex-1"
                onClick={() => createPaymentMutation.mutate()}
                disabled={
                  createPaymentMutation.isPending ||
                  !form.memberId ||
                  !form.originalAmount ||
                  parseInt(form.originalAmount, 10) <= 0 ||
                  (showCustomAmount &&
                    (!form.finalAmount || parseInt(form.finalAmount, 10) <= 0))
                }
              >
                {createPaymentMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Payment
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-card/50 p-4 rounded-lg border border-border backdrop-blur-sm mt-2 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by member, notes, method..."
            className="pl-10 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-payments"
          />
        </div>
        <div className="w-full md:w-64">
          <Select
            value={memberId}
            onValueChange={(val) => setMemberId(val as any)}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue placeholder="Filter by member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.firstName} {m.lastName || ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Recent Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPayments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No payments found.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Member</th>
                    <th className="px-4 py-3 text-left">Original</th>
                    <th className="px-4 py-3 text-left">Discount</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {new Date(p.paymentDate).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {selectedMemberName(p.memberId)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(p as any).originalAmount
                          ? formatMoney((p as any).originalAmount)
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {(p as any).discountPercentage > 0 ? (
                          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                            {(p as any).discountPercentage}%
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-600">
                        {formatMoney(p.amount)}
                      </td>
                      <td className="px-4 py-3">{formatMethod(p.method)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            p.status === "paid"
                              ? "bg-green-500/20 text-green-500 border-green-500/30"
                              : p.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                                : "bg-red-500/20 text-red-500 border-red-500/30"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
