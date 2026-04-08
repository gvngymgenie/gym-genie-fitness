import { useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, AlertCircle, IndianRupee, CreditCard, UserPlus, Loader2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Line, LineChart } from "recharts";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, addDays, isAfter, isBefore, parseISO, isToday, startOfWeek, eachDayOfInterval } from "date-fns";
import type { Member, Lead, Attendance } from "@shared/schema";

export default function Dashboard() {
  const { data: members = [], isLoading: loadingMembers } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: leads = [], isLoading: loadingLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // New: Fetch today's revenue from the revenue API
  const { data: todayRevenueData, isLoading: loadingRevenue } = useQuery({
    queryKey: ["/api/revenue/today"],
    queryFn: async () => {
      const res = await fetch("/api/revenue/today");
      if (!res.ok) throw new Error("Failed to fetch revenue data");
      return res.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const weekDays = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  }, []);

  const attendanceQueries = useQueries({
    queries: weekDays.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      return {
        queryKey: ["/api/attendance", dateStr],
        queryFn: async (): Promise<Attendance[]> => {
          const res = await fetch(`/api/attendance?date=${dateStr}`);
          if (!res.ok) return [];
          return res.json();
        },
      };
    }),
  });

  const weeklyAttendanceData = useMemo(() => {
    return weekDays.map((day, idx) => ({
      day: format(day, "EEE"),
      count: attendanceQueries[idx]?.data?.length || 0,
    }));
  }, [weekDays, attendanceQueries]);

  const monthlyRevenueData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTotals: Record<number, number> = {};
    
    members.forEach(m => {
      if (!m.createdAt || !m.amountPaid) return;
      try {
        const date = new Date(m.createdAt);
        const month = date.getMonth();
        monthlyTotals[month] = (monthlyTotals[month] || 0) + m.amountPaid;
      } catch {}
    });

    return monthNames.map((name, idx) => ({
      name,
      total: monthlyTotals[idx] || 0,
    }));
  }, [members]);

  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === "Active").length;
  }, [members]);

  const expiringMembers = useMemo(() => {
    const today = new Date();
    const sevenDaysFromNow = addDays(today, 7);
    return members.filter(m => {
      if (m.status !== "Active" || !m.endDate) return false;
      try {
        const endDate = parseISO(m.endDate);
        return isAfter(endDate, today) && isBefore(endDate, sevenDaysFromNow);
      } catch {
        return false;
      }
    }).length;
  }, [members]);

  const todaysRevenue = useMemo(() => {
    // Use real revenue data from API if available, fallback to mock calculation
    if (todayRevenueData && typeof todayRevenueData.total === 'number') {
      return todayRevenueData.total;
    }
    
    // Fallback to mock calculation based on member data
    return members.reduce((sum, m) => {
      if (!m.createdAt) return sum;
      try {
        const createdDate = new Date(m.createdAt);
        if (isToday(createdDate)) {
          return sum + (m.amountPaid || 0);
        }
      } catch {
        return sum;
      }
      return sum;
    }, 0);
  }, [members, todayRevenueData]);

  const newLeadsCount = useMemo(() => {
    return leads.filter(l => l.status === "new").length;
  }, [leads]);

  const expiringMembersList = useMemo(() => {
    const today = new Date();
    const sevenDaysFromNow = addDays(today, 7);
    return members.filter(m => {
      if (m.status !== "Active" || !m.endDate) return false;
      try {
        const endDate = parseISO(m.endDate);
        return isAfter(endDate, today) && isBefore(endDate, sevenDaysFromNow);
      } catch {
        return false;
      }
    }).slice(0, 3);
  }, [members]);

  const newLeadsList = useMemo(() => {
    return leads.filter(l => l.status === "new").slice(0, 3);
  }, [leads]);

  const isLoading = loadingMembers || loadingLeads;

  // Get navigation hook for click functionality
  const [, navigate] = useLocation();

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground" data-testid="heading-dashboard">DASHBOARD</h1>
          <p className="text-muted-foreground">Welcome back, Admin. Here's what's happening today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-primary bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Members</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground" data-testid="text-active-members">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : activeMembers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total active memberships</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground" data-testid="text-expiring-soon">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : expiringMembers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Within next 7 days</p>
            </CardContent>
          </Card>

          <Card 
            className="border-l-4 border-l-accent bg-card/50 backdrop-blur-sm cursor-pointer hover:bg-card/80 transition-colors"
            onClick={() => navigate('/admin/revenue')}
            data-testid="card-todays-revenue"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Revenue</CardTitle>
              <IndianRupee className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground" data-testid="text-todays-revenue">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `₹ ${todaysRevenue.toLocaleString('en-IN')}`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">From new memberships</p>
            </CardContent>
          </Card>

           <Card className="border-l-4 border-l-orange-500 bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">New Leads</CardTitle>
              <UserPlus className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground" data-testid="text-new-leads">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : newLeadsCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Requires follow-up</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-heading">Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} 
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                      cursor={{fill: 'hsl(var(--muted)/0.2)'}}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-heading">Weekly Attendance</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyAttendanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                     <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }} 
                      itemStyle={{ color: 'hsl(var(--accent))' }}
                    />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--accent))" strokeWidth={3} dot={{r: 4, fill: "hsl(var(--background))", strokeWidth: 2}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Actions */}
        <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-heading flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-destructive" />
                        Expiring Memberships
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {loadingMembers ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : expiringMembersList.length > 0 ? (
                          expiringMembersList.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50" data-testid={`card-expiring-${member.id}`}>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                        {member.avatar ? (
                                          <img src={member.avatar} alt={member.firstName} className="h-full w-full object-cover"/>
                                        ) : (
                                          <span className="text-sm font-bold">{member.firstName?.charAt(0) || "?"}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">{member.firstName} {member.lastName || ""}</p>
                                        <p className="text-xs text-muted-foreground">{member.plan}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-destructive">
                                      Expires {member.endDate ? format(parseISO(member.endDate), "dd MMM") : "Soon"}
                                    </p>
                                    <button className="text-xs text-primary hover:underline">Remind</button>
                                </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">No memberships expiring soon.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-heading flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-orange-500" />
                        New Leads Follow-up
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {loadingLeads ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : newLeadsList.length > 0 ? (
                          newLeadsList.map(lead => (
                            <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50" data-testid={`card-lead-${lead.id}`}>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold">
                                        {lead.firstName?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <p className="font-medium">{lead.firstName} {lead.lastName || ""}</p>
                                        <p className="text-xs text-muted-foreground">{lead.interestArea || lead.source}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <a 
                                      href={`tel:${lead.phone}`}
                                      className="h-8 px-3 rounded bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 flex items-center"
                                    >
                                      Call
                                    </a>
                                    <a 
                                      href={`https://wa.me/91${lead.phone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="h-8 px-3 rounded bg-accent/20 text-accent text-xs font-medium hover:bg-accent/30 flex items-center"
                                    >
                                      WhatsApp
                                    </a>
                                </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">No new leads.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </Layout>
  );
}