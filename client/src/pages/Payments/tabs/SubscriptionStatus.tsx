import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, CheckCircle, Clock, AlertCircle, DollarSign, Loader2, FileText, X } from "lucide-react";
import type { Payment } from "@shared/schema";

function formatMoney(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-IN");
}

function formatDateTime(dateStr: string | Date | null) {
  if (!dateStr) return "-";
  const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
  return date.toLocaleString("en-IN");
}

interface SubscriptionStatus {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  plan: string;
  startDate: string;
  endDate: string | null;
  totalDue: number;
  originalTotalDue: number;
  discountPercentage: number;
  amountPaid: number;
  remaining: number;
  paymentStatus: "paid" | "pending" | "overdue";
  isActive: boolean;
}

interface MemberInfo {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  plan: string;
}

interface SubscriptionStatusProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

// Payment history dialog component
function PaymentHistoryDialog({ 
  memberId, 
  memberName, 
  open, 
  onOpenChange 
}: { 
  memberId: string; 
  memberName: string;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { data, isLoading } = useQuery<{
    member: MemberInfo;
    payments: Payment[];
  }>({
    queryKey: [`/api/payments/member/${memberId}/history`],
    queryFn: async () => {
      const res = await fetch(`/api/payments/member/${memberId}/history`);
      if (!res.ok) throw new Error("Failed to fetch payment history");
      return res.json();
    },
    enabled: open && !!memberId,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Paid</Badge>;
      case "pending": return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pending</Badge>;
      case "cancelled": return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payment History
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data?.payments.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No payment records found for this member.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium">{data?.member?.firstName} {data?.member?.lastName || ""}</p>
              <p className="text-sm text-muted-foreground">{data?.member?.phone}</p>
              <p className="text-sm text-muted-foreground">{data?.member?.plan}</p>
            </div>
            
            <div className="space-y-2">
              {data?.payments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-green-600">{formatMoney(payment.amount)}</div>
                    {getStatusBadge(payment.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date: </span>
                      <span className="font-mono">{formatDateTime(payment.paymentDate)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Method: </span>
                      <span className="capitalize">{payment.method.replace('_', ' ')}</span>
                    </div>
                  </div>
                  {payment.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <span className="font-medium">Notes: </span>{payment.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {data?.payments && data.payments.length > 0 && (
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between font-semibold">
                  <span>Total Paid:</span>
                  <span className="text-green-600">
                    {formatMoney(data.payments.reduce((sum, p) => sum + (p.status === 'paid' ? p.amount : 0), 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SubscriptionStatus({ searchQuery, onSearchChange }: SubscriptionStatusProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [historyMemberId, setHistoryMemberId] = useState<string | null>(null);
  const [historyMemberName, setHistoryMemberName] = useState<string>("");

  const { data: subscriptionData, isLoading } = useQuery<{
    members: SubscriptionStatus[];
    summary: {
      paid: number;
      pending: number;
      overdue: number;
      totalRevenue: number;
      totalMembers: number;
    };
  }>({
    queryKey: ["/api/payments/subscription-status"],
    queryFn: async () => {
      const res = await fetch("/api/payments/subscription-status");
      if (!res.ok) throw new Error("Failed to fetch subscription status");
      return res.json();
    },
  });

  const filteredSubscriptions = useMemo(() => {
    if (!subscriptionData?.members) return [];
    const q = searchQuery.trim().toLowerCase();
    let filtered = subscriptionData.members;
    if (statusFilter !== "all") {
      filtered = filtered.filter(s => s.paymentStatus === statusFilter);
    }
    if (q) {
      filtered = filtered.filter(s => {
        const name = `${s.firstName} ${s.lastName || ""}`.trim().toLowerCase();
        const phone = s.phone.toLowerCase();
        const plan = s.plan.toLowerCase();
        return name.includes(q) || phone.includes(q) || plan.includes(q);
      });
    }
    return filtered;
  }, [subscriptionData, searchQuery, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Paid</Badge>;
      case "pending": return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pending</Badge>;
      case "overdue": return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Overdue</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleViewHistory = (member: SubscriptionStatus) => {
    setHistoryMemberId(member.id);
    setHistoryMemberName(`${member.firstName} ${member.lastName || ""}`);
  };

  return (
    <>
      <PaymentHistoryDialog
        memberId={historyMemberId || ""}
        memberName={historyMemberName}
        open={!!historyMemberId}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryMemberId(null);
            setHistoryMemberName("");
          }
        }}
      />

      <div className="space-y-6">
        {subscriptionData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Paid</p>
                    <h3 className="text-3xl font-bold text-green-500">{subscriptionData.summary.paid}</h3>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-yellow-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <h3 className="text-3xl font-bold text-yellow-500">{subscriptionData.summary.pending}</h3>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                    <h3 className="text-3xl font-bold text-red-500">{subscriptionData.summary.overdue}</h3>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <h3 className="text-3xl font-bold">{formatMoney(subscriptionData.summary.totalRevenue)}</h3>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-card/50 p-4 rounded-lg border border-border backdrop-blur-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, plan..."
              className="pl-10 bg-background"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5" /> Member Subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No subscriptions found.</div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3 text-left">Member</th>
                      <th className="px-4 py-3 text-left">Plan</th>
                      <th className="px-4 py-3 text-left">End Date</th>
                      <th className="px-4 py-3 text-left">Original</th>
                      <th className="px-4 py-3 text-left">Discount</th>
                      <th className="px-4 py-3 text-left">Total Due</th>
                      <th className="px-4 py-3 text-left">Paid</th>
                      <th className="px-4 py-3 text-left">Remaining</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredSubscriptions.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">
                          {s.firstName} {s.lastName || ""}
                          <div className="text-xs text-muted-foreground">{s.phone}</div>
                        </td>
                        <td className="px-4 py-3">{s.plan}</td>
                        <td className="px-4 py-3 font-mono text-xs">{formatDate(s.endDate)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{formatMoney(s.originalTotalDue || s.totalDue)}</td>
                        <td className="px-4 py-3">
                          {s.discountPercentage > 0 ? (
                            <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                              {s.discountPercentage}%
                            </Badge>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3">{formatMoney(s.totalDue)}</td>
                        <td className="px-4 py-3 text-green-600">{formatMoney(s.amountPaid)}</td>
                        <td className="px-4 py-3 text-red-600 font-medium">{formatMoney(s.remaining)}</td>
                        <td className="px-4 py-3">{getStatusBadge(s.paymentStatus)}</td>
                        <td className="px-4 py-3">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => handleViewHistory(s)}
                          >
                            <FileText className="h-4 w-4" />
                            History
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
