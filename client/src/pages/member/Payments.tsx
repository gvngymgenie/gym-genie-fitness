import { MemberLayout } from "@/components/layout/MemberLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Loader2 } from "lucide-react";
import type { Payment } from "@shared/schema";

export default function MemberPayments() {
  const { member, isMemberAuthenticated, isLoading: authLoading } = useAuth();

  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments", member?.id],
    queryFn: async () => {
      if (!member?.id) return [];
      const res = await apiRequest("GET", `/api/payments?memberId=${member.id}&limit=100`);
      return res.json();
    },
    enabled: !!member?.id,
  });

  if (authLoading || !isMemberAuthenticated) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold font-heading text-foreground">MY PAYMENTS</h1>
            <p className="text-muted-foreground">Your payment history with the gym.</p>
          </div>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-accent" /> Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : payments.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No payments recorded yet.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Method</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">
                          {new Date(p.paymentDate).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-600">₹{p.amount}</td>
                        <td className="px-4 py-3">{p.method}</td>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  );
}
