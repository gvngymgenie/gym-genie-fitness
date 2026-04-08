import { MemberLayout } from "@/components/layout/MemberLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Flame, TrendingUp, Dumbbell, Clock, Loader2, Target, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Member, WorkoutProgram, MembershipPlan } from "@shared/schema";
import { useEffect } from "react";

interface DashboardData {
  member: Member;
  membershipPlan: MembershipPlan | null;
  attendance: {
    streak: number;
    monthlyVisits: number;
    totalVisits: number;
  };
  todayWorkout: WorkoutProgram | null;
  assignedPrograms: WorkoutProgram[];
  membership: {
    daysRemaining: number;
    totalDays: number;
    progress: number;
    paidAmount: number;
    balance: number;
  };
}

export default function MemberDashboard() {
  const { member, isMemberAuthenticated, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && !isMemberAuthenticated) {
      navigate("/member/login");
    }
  }, [authLoading, isMemberAuthenticated, navigate]);

  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/member", member?.id, "dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/member/${member?.id}/dashboard`);
      return res.json();
    },
    enabled: !!member?.id,
  });

  if (isLoading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MemberLayout>
    );
  }

  if (error || !dashboardData) {
    return (
      <MemberLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <p className="text-muted-foreground mb-4">
            {error ? "Failed to load dashboard data" : "No member profile found"}
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact your gym administrator to link your account.
          </p>
        </div>
      </MemberLayout>
    );
  }

  const { member: memberData, membershipPlan, attendance, todayWorkout, membership } = dashboardData;
  const memberName = memberData.firstName || "Member";
  const isActive = memberData.status === "Active";
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <MemberLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between" data-testid="section-welcome">
          <div>
            <h1 className="text-4xl font-bold font-heading text-foreground">
              Welcome, {memberName}!
            </h1>
            <p className="text-muted-foreground mt-2">Here's your fitness overview for today.</p>
          </div>
          <Badge 
            className={`${isActive ? 'bg-green-500/20 text-green-500 border-green-500/30' : 'bg-red-500/20 text-red-500 border-red-500/30'} border px-3 py-1`}
            data-testid="badge-member-status"
          >
            {isActive ? '✓ Active Member' : '✗ Inactive'}
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="section-quick-stats">
          <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Membership Plan</CardTitle>
              <Calendar className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-plan-name">
                {memberData.plan || "No Plan"}
              </div>
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-plan-expiry">
                Expires: {formatDate(memberData.endDate)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Days Left</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-days-remaining">
                {membership.daysRemaining}
              </div>
              <p className="text-xs text-muted-foreground mt-1">of your membership</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-streak">
                {attendance.streak}
              </div>
              <p className="text-xs text-muted-foreground mt-1">consecutive days</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-monthly-visits">
                {attendance.monthlyVisits}
              </div>
              <p className="text-xs text-muted-foreground mt-1">gym visits</p>
            </CardContent>
          </Card>
        </div>

        {/* Membership Progress */}
        <Card className="bg-card/50 backdrop-blur-sm" data-testid="section-subscription">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              Subscription Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Days Remaining</span>
                <span className="text-muted-foreground" data-testid="text-days-progress">
                  {membership.daysRemaining} / {membership.totalDays} days
                </span>
              </div>
              <Progress 
                value={membership.progress} 
                className="h-3"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-background">
                <p className="text-2xl font-bold text-accent" data-testid="text-paid-amount">
                  {formatCurrency(membership.paidAmount)}
                </p>
                <p className="text-xs text-muted-foreground">Total Paid</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background">
                <p className="text-2xl font-bold text-primary" data-testid="text-balance">
                  {formatCurrency(membership.balance)}
                </p>
                <p className="text-xs text-muted-foreground">Remaining Balance</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background">
                <p className="text-2xl font-bold text-green-500" data-testid="text-progress">
                  {membership.progress}%
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Activity */}
        <div className="grid gap-6 md:grid-cols-2" data-testid="section-today-activity">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                Today's Workout
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayWorkout ? (
                <div className="space-y-4" data-testid="card-today-workout">
                  {/* Workout Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg text-foreground">{todayWorkout.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {todayWorkout.day} • {todayWorkout.duration} mins
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-background">{todayWorkout.difficulty}</Badge>
                      <Badge className="bg-accent/20 text-accent border-accent/30 border">
                        <Zap className="h-3 w-3 mr-1" />
                        {todayWorkout.intensity}/10
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Exercise Cards Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {(todayWorkout.exercises as Array<{ name: string; sets: number; reps: string }>).map((exercise, idx) => (
                      <div 
                        key={idx}
                        className="group relative p-3 rounded-lg bg-gradient-to-br from-background to-muted/30 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-md hover:shadow-primary/5"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-300">
                            <Dumbbell className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {exercise.name}
                            </p>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {exercise.sets} × {exercise.reps}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Workout Goal */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t border-border">
                    <Target className="h-4 w-4" />
                    <span>Goal: {todayWorkout.goal}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-background border border-border text-center" data-testid="text-no-workout">
                  <Dumbbell className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No workout scheduled for today</p>
                  <p className="text-xs text-muted-foreground mt-1">Enjoy your rest day!</p>
                </div>
              )}
              <Link href="/member/workouts">
                <Button className="w-full gap-2" data-testid="button-view-workouts">
                  View Full Workout Plan
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground">Total Visits</span>
                <span className="font-bold" data-testid="text-total-visits">{attendance.totalVisits}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground">This Month</span>
                <span className="font-bold text-green-500" data-testid="text-monthly-visits-summary">
                  {attendance.monthlyVisits} visits
                </span>
              </div>
              <Link href="/member/trainers">
                <Button variant="outline" className="w-full" data-testid="button-view-trainers">
                  View Trainer Sessions
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  );
}
