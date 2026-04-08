import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, CreditCard, Receipt, Clock, AlertTriangle, CheckCircle2, Edit2, IndianRupee, RotateCcw, Calculator, Settings2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { MemberProfileProps } from "../types";
import type { Member, MembershipPlan, Payment } from "@shared/schema";

export function MemberMemberships({ memberId }: MemberProfileProps) {
  const [openEdit, setOpenEdit] = useState(false);
  const [editMode, setEditMode] = useState<"details" | "renew">("details");
  
  const [editForm, setEditForm] = useState({
    plan: "",
    planId: "",
    startDate: "",
    endDate: "",
    totalDue: "",
    amountPaid: "",
    discount: "",
    status: "Active"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: member } = useQuery<Member>({
    queryKey: ["/api/members", memberId],
    queryFn: async () => {
      const res = await fetch(`/api/members/${memberId}`);
      if (!res.ok) throw new Error("Member not found");
      return res.json();
    },
    enabled: !!memberId,
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery<Payment[]>({
    queryKey: ["/api/payments", memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const res = await fetch(`/api/payments?memberId=${memberId}&limit=50`);
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
    enabled: !!memberId,
  });

  // Fetch available membership plans
  const { data: plans = [], isLoading: isLoadingPlans } = useQuery<MembershipPlan[]>({
    queryKey: ["/api/plans"],
    queryFn: async () => {
      const res = await fetch("/api/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      return res.json();
    },
  });

  // Sort plans by durationMonths (ascending)
  const sortedPlans = useMemo(() => 
    [...plans].sort((a, b) => (a.durationMonths || 0) - (b.durationMonths || 0)),
    [plans]
  );

  // Calculate payment info from payments table
  const paymentInfo = useMemo(() => {
    if (!member || payments.length === 0) {
      const due = member?.totalDue || 0;
      const paid = member?.amountPaid || 0;
      const discount = member?.discount || 0;
      const actualAmountDue = Math.round(due * (1 - discount / 100));
      return {
        totalPaid: paid,
        actualAmountDue,
        currentDiscount: discount,
        balance: actualAmountDue - paid,
        currentOriginalAmount: due,
      };
    }

    const paidPayments = payments.filter(p => p.status === "paid");
    const totalPaid = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Get most recent payment for current subscription details
    const sortedPayments = [...paidPayments].sort((a, b) => 
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    );
    
    const currentOriginalAmount = sortedPayments[0]?.originalAmount || member.totalDue || 0;
    const currentDiscount = sortedPayments[0]?.discountPercentage || member.discount || 0;
    const actualAmountDue = Math.round(currentOriginalAmount * (1 - currentDiscount / 100));
    const balance = actualAmountDue - totalPaid;
    
    return {
      totalPaid,
      actualAmountDue,
      currentDiscount,
      balance,
      currentOriginalAmount,
    };
  }, [payments, member]);

  // Initialize edit form when member data loads
  useEffect(() => {
    if (member) {
      setEditForm({
        plan: member.plan || "",
        planId: "",
        startDate: member.startDate || "",
        endDate: member.endDate || "",
        totalDue: member.totalDue?.toString() || "",
        amountPaid: member.amountPaid?.toString() || "",
        discount: member.discount?.toString() || "",
        status: member.status || "Active"
      });
    }
  }, [member]);

  // Auto-calculate end date when plan and start date change
  const calculateEndDate = (planName: string, startDateStr: string): string => {
    if (!planName || !startDateStr) return "";
    
    const selectedPlan = plans.find(p => p.name === planName);
    if (!selectedPlan || !selectedPlan.durationMonths) return "";
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + selectedPlan.durationMonths);
    
    return endDate.toISOString().split('T')[0];
  };

  const handlePlanChange = (planName: string) => {
    const selectedPlan = plans.find(p => p.name === planName);
    const newEndDate = calculateEndDate(planName, editForm.startDate) || editForm.endDate;
    const newTotalDue = selectedPlan ? selectedPlan.price.toString() : editForm.totalDue;
    
    setEditForm(prev => ({
      ...prev,
      plan: planName,
      planId: selectedPlan?.id || "",
      endDate: newEndDate,
      totalDue: editMode === "renew" ? newTotalDue : prev.totalDue
    }));
  };

  const handleStartDateChange = (startDate: string) => {
    const newEndDate = calculateEndDate(editForm.plan, startDate);
    if (newEndDate) {
      setEditForm(prev => ({ ...prev, startDate, endDate: newEndDate }));
    } else {
      setEditForm(prev => ({ ...prev, startDate }));
    }
  };

  const updateMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update membership");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members", memberId] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ 
        title: editMode === "renew" ? "Membership renewed successfully" : "Membership updated successfully" 
      });
      setOpenEdit(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update membership",
        variant: "destructive"
      });
    },
  });

  const handleSubmitMembership = () => {
    if (!member) return;

    const data = {
      plan: editForm.plan || member.plan,
      startDate: editForm.startDate || member.startDate,
      endDate: editForm.endDate || member.endDate,
      totalDue: editForm.totalDue ? parseInt(editForm.totalDue) : member.totalDue,
      amountPaid: editForm.amountPaid ? parseInt(editForm.amountPaid) : member.amountPaid,
      discount: editForm.discount ? parseInt(editForm.discount) : member.discount,
      status: editMode === "renew" ? "Active" : editForm.status
    };

    updateMemberMutation.mutate(data);
  };

  // Quick action handlers for common renewal scenarios
  const handleQuickRenew = (planName: string) => {
    const selectedPlan = plans.find(p => p.name === planName);
    const today = new Date().toISOString().split('T')[0];
    const endDate = calculateEndDate(planName, today) || "";
    
    setEditForm({
      plan: planName,
      planId: selectedPlan?.id || "",
      startDate: today,
      endDate,
      totalDue: selectedPlan?.price.toString() || "0",
      amountPaid: selectedPlan?.price.toString() || "0",
      discount: "0",
      status: "Active"
    });
    setEditMode("renew");
    setOpenEdit(true);
  };

  const getMembershipStatus = (member: Member) => {
    if (!member.endDate) return { status: "Unknown", color: "bg-gray-500/20 text-gray-500 border-gray-500/30" };

    const endDate = new Date(member.endDate);
    const today = new Date();

    if (endDate < today) return { status: "Expired", color: "bg-red-500/20 text-red-500 border-red-500/30" };
    if (member.status === "Active") return { status: "Active", color: "bg-green-500/20 text-green-500 border-green-500/30" };
    return { status: "Inactive", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" };
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getPaymentStatus = () => {
    const balance = paymentInfo.balance;

    if (balance <= 0) return { status: "Paid", color: "bg-green-500/20 text-green-500 border-green-500/30", icon: CheckCircle2 };
    if (paymentInfo.totalPaid > 0) return { status: "Partial", color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30", icon: Clock };
    return { status: "Unpaid", color: "bg-red-500/20 text-red-500 border-red-500/30", icon: AlertTriangle };
  };

  if (!member) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Loading membership information...
          </div>
        </CardContent>
      </Card>
    );
  }

  const membershipStatus = getMembershipStatus(member);
  const paymentStatus = getPaymentStatus();
  const daysRemaining = member.endDate ? getDaysRemaining(member.endDate) : 0;
  const PaymentIcon = paymentStatus.icon;
  const balance = paymentInfo.balance;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Membership Details
          </CardTitle>
          <Sheet open={openEdit} onOpenChange={(open) => {
            setOpenEdit(open);
            if (!open) {
              // Reset to details mode when closing
              setEditMode("details");
            }
          }}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Manage
              </Button>
            </SheetTrigger>
            <SheetContent className="max-w-xl bg-card border-border shadow-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-xl font-bold font-heading text-primary flex items-center gap-2">
                  {editMode === "renew" ? (
                    <RotateCcw className="h-5 w-5" />
                  ) : (
                    <Edit2 className="h-5 w-5" />
                  )}
                  {editMode === "renew" ? "Renew Membership" : "Edit Membership"}
                </SheetTitle>
              </SheetHeader>

              {/* Mode Switcher */}
              <Tabs value={editMode} onValueChange={(v) => setEditMode(v as "details" | "renew")} className="mt-4">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1 gap-2">
                    <Settings2 className="h-4 w-4" />
                    Update Details
                  </TabsTrigger>
                  <TabsTrigger value="renew" className="flex-1 gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Renew / Extend
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Update membership details, adjust dates, or change status.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Plan</Label>
                      {isLoadingPlans ? (
                        <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          Loading plans...
                        </div>
                      ) : (
                        <Select value={editForm.plan} onValueChange={handlePlanChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedPlans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.name}>
                                {plan.name} - ₹{plan.price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Status</Label>
                      <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Frozen">Frozen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Discount (₹)</Label>
                      <Input
                        type="number"
                        value={editForm.discount}
                        onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Start Date</Label>
                      <Input
                        type="date"
                        value={editForm.startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">End Date</Label>
                      <Input
                        type="date"
                        value={editForm.endDate}
                        onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Total Due (₹)</Label>
                      <Input
                        type="number"
                        value={editForm.totalDue}
                        onChange={(e) => setEditForm({ ...editForm, totalDue: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Amount Paid (₹)</Label>
                      <Input
                        type="number"
                        value={editForm.amountPaid}
                        onChange={(e) => setEditForm({ ...editForm, amountPaid: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <SheetClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </SheetClose>
                    <Button
                      onClick={handleSubmitMembership}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={updateMemberMutation.isPending}
                    >
                      {updateMemberMutation.isPending ? "Updating..." : "Update Membership"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="renew" className="space-y-4 mt-4">
                  {/* Quick Renew Cards */}
                  {sortedPlans.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <Calculator className="h-3 w-3" />
                        Quick Renew
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {sortedPlans.slice(0, 3).map((plan) => (
                          <Button
                            key={plan.id}
                            type="button"
                            variant={editForm.plan === plan.name ? "default" : "outline"}
                            size="sm"
                            className="flex-col h-auto py-3"
                            onClick={() => handleQuickRenew(plan.name)}
                          >
                            <span className="font-bold">{plan.name}</span>
                            <span className="text-xs opacity-70">₹{plan.price}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {membershipStatus.status === "Expired"
                        ? "Current membership has expired. Set up a new membership below."
                        : `Current membership ${daysRemaining > 0 ? `expires in ${daysRemaining} days` : "is active"}. Renew to continue services.`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">New Plan</Label>
                      {isLoadingPlans ? (
                        <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          Loading plans...
                        </div>
                      ) : (
                        <Select value={editForm.plan} onValueChange={handlePlanChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a plan" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedPlans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.name}>
                                {plan.name} - ₹{plan.price} ({plan.duration} months)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Start Date</Label>
                      <Input
                        type="date"
                        value={editForm.startDate}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">End Date</Label>
                      <Input
                        type="date"
                        value={editForm.endDate}
                        onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Total Due (₹)</Label>
                      <Input
                        type="number"
                        value={editForm.totalDue}
                        onChange={(e) => setEditForm({ ...editForm, totalDue: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Amount Paid (₹)</Label>
                      <Input
                        type="number"
                        value={editForm.amountPaid}
                        onChange={(e) => setEditForm({ ...editForm, amountPaid: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Discount (₹)</Label>
                      <Input
                        type="number"
                        value={editForm.discount}
                        onChange={(e) => setEditForm({ ...editForm, discount: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <SheetClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </SheetClose>
                    <Button
                      onClick={handleSubmitMembership}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={updateMemberMutation.isPending}
                    >
                      {updateMemberMutation.isPending ? "Processing..." : "Renew Membership"}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </SheetContent>
          </Sheet>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Membership Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Plan</span>
              </div>
              <p className="text-lg font-bold text-primary">{member.plan || "No Plan Assigned"}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={membershipStatus.color}>
                  {membershipStatus.status}
                </Badge>
              </div>
              {member.endDate && (
                <p className="text-sm text-muted-foreground">
                  Expires: {new Date(member.endDate).toLocaleDateString()}
                  {daysRemaining > 0 && (
                    <span className="ml-2 text-primary font-medium">
                      ({daysRemaining} days left)
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Highlighted Plan Cost */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Plan Cost</span>
              </div>
              <div className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    ₹{paymentInfo.actualAmountDue}
                  </p>
                  {paymentInfo.currentDiscount > 0 && (
                    <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 text-xs">
                      {paymentInfo.currentDiscount}% OFF
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-green-600 dark:text-green-500">
                  {paymentInfo.currentOriginalAmount !== paymentInfo.actualAmountDue 
                    ? `was ₹${paymentInfo.currentOriginalAmount}` 
                    : "Total Plan Amount"}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="border-t border-border pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <IndianRupee className="h-4 w-4" />
              Payment Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <PaymentIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Status</span>
                </div>
                <Badge className={paymentStatus.color + " w-fit"}>
                  {paymentStatus.status}
                </Badge>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Paid</span>
                </div>
                <p className="text-lg font-bold text-green-600">
                  ₹{paymentInfo.totalPaid}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Balance</span>
                </div>
                <p className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{Math.max(0, balance)}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="h-4 w-4 bg-blue-500/20 text-blue-500 border-blue-500/30" />
                  <span className="text-sm font-medium">Discount</span>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {paymentInfo.currentDiscount > 0 ? `${paymentInfo.currentDiscount}%` : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Membership Period */}
          <div className="border-t border-border pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Membership Period
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="text-xs text-muted-foreground mb-1">Start Date</div>
                <div className="font-semibold">
                  {member.startDate ? new Date(member.startDate).toLocaleDateString() : "Not set"}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="text-xs text-muted-foreground mb-1">End Date</div>
                <div className="font-semibold">
                  {member.endDate ? new Date(member.endDate).toLocaleDateString() : "Not set"}
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="border-t border-border pt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment History
            </h4>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Original</th>
                    <th className="px-4 py-3 text-left">Discount</th>
                    <th className="px-4 py-3 text-left">Paid</th>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-left">Balance</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoadingPayments ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                        Loading payments...
                      </td>
                    </tr>
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const paidPayments = payments
                        .filter(p => p.status === "paid")
                        .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

                      let runningPaid = 0;
                      let runningOriginal = 0;

                      return paidPayments.map((p, index) => {
                        runningPaid += p.amount || 0;
                        runningOriginal = p.originalAmount || 0;
                        const currentDiscount = p.discountPercentage || 0;
                        const currentTotalDue = Math.round(runningOriginal * (1 - currentDiscount / 100));
                        const runningBalance = currentTotalDue - runningPaid;
                        const isLastPayment = index === paidPayments.length - 1;

                        return (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs">
                              {new Date(p.paymentDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              ₹{(p as any).originalAmount || 0}
                            </td>
                            <td className="px-4 py-3">
                              {(p as any).discountPercentage > 0 ? (
                                <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 text-xs">
                                  {(p as any).discountPercentage}%
                                </Badge>
                              ) : "-"}
                            </td>
                            <td className="px-4 py-3 font-semibold text-green-600">₹{p.amount}</td>
                            <td className="px-4 py-3 capitalize">{p.method.replace('_', ' ')}</td>
                            <td className="px-4 py-3 font-semibold text-primary">₹{Math.max(0, runningBalance)}</td>
                            <td className="px-4 py-3">
                              <Badge
                                className={
                                  isLastPayment && runningBalance <= 0
                                    ? "bg-green-500/20 text-green-500 border-green-500/30"
                                    : "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                                }
                              >
                                {isLastPayment && runningBalance <= 0 ? "Paid" : "Partial"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      });
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {paymentInfo.currentDiscount > 0 && (
            <div className="border-t border-border pt-4">
              <h4 className="font-semibold mb-3">Additional Details</h4>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex text-xs text-muted-foreground mb-1 gap-2">
                  <span className="text-sm font-medium">Discount Applied:</span>
                  <span className="text-sm font-bold text-green-600">
                    {paymentInfo.currentDiscount}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
