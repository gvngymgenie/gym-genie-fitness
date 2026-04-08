import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Dumbbell,
  Utensils,
  CreditCard,
} from "lucide-react";
import {
  monthlyAICreditUsage,
  weeklyAICreditUsage,
  topAICreditUsers,
  workoutVsDietTrend,
} from "@/lib/mockData";
import { AdminLayout } from "@/components/layout/AdminLayout";
 
const AIUsage = () => {
  const [timeRange, setTimeRange] = useState("6months");

  // Calculate overall AI metrics
  const dashboardMetrics = useMemo(() => {
    const totalCredits = monthlyAICreditUsage.reduce(
      (acc, item) => acc + item.credits,
      0
    );
    const avgMonthlyCredits = totalCredits / monthlyAICreditUsage.length;
    const growthRate =
      monthlyAICreditUsage.length > 1
        ? ((monthlyAICreditUsage[monthlyAICreditUsage.length - 1].credits -
            monthlyAICreditUsage[0].credits) /
            monthlyAICreditUsage[0].credits) *
          100
        : 0;

    const totalWorkouts = workoutVsDietTrend.reduce(
      (acc, item) => acc + item.workouts,
      0
    );
    const totalDiet = workoutVsDietTrend.reduce(
      (acc, item) => acc + item.diet,
      0
    );

    return {
      totalCredits,
      avgMonthlyCredits,
      growthRate,
      totalWorkouts,
      totalDiet,
      workoutPercent: (totalWorkouts / (totalWorkouts + totalDiet)) * 100,
      dietPercent: (totalDiet / (totalWorkouts + totalDiet)) * 100,
    };
  }, []);

  const getGrowthColor = (value: number) => {
    return value >= 0 ? "text-green-600" : "text-red-600";
  };

  const getGrowthIcon = (value: number) => {
    return value >= 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          AI USAGE DASHBOARD
        </h1>
        <p className="text-muted-foreground">
          Track AI credit consumption and usage patterns for workout and diet generation.
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {["3months", "6months", "yearly"].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === "3months"
                ? "Last 3 Months"
                : range === "6months"
                  ? "Last 6 Months"
                  : "Yearly View"}
            </Button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          Data updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Overall AI Usage Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits Used</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardMetrics.totalCredits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all AI features
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(dashboardMetrics.avgMonthlyCredits).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Credits per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold flex items-center gap-2 ${getGrowthColor(dashboardMetrics.growthRate)}`}
            >
              {getGrowthIcon(dashboardMetrics.growthRate)}
              {Math.abs(dashboardMetrics.growthRate).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Month-over-month change
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topAICreditUsers.length}
            </div>
            <p className="text-xs text-muted-foreground">Top credit consumers</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly and Weekly Usage Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly AI Usage Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly AI Credit Usage</CardTitle>
            <CardDescription>
              Credit consumption over the past months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                credits: { label: "Credits", color: "blue" },
              }}
              className="h-[300px] w-full"
            >
              <BarChart data={monthlyAICreditUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey="credits"
                  fill="var(--color-credits)"
                  name="Credits Used"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Weekly Usage Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Credit Usage</CardTitle>
            <CardDescription>
              Weekly consumption trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                credits: { label: "Credits", color: "green" },
              }}
              className="h-[300px] w-full"
            >
              <LineChart data={weeklyAICreditUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="credits"
                  stroke="var(--color-credits)"
                  strokeWidth={2}
                  name="Credits Used"
                  dot={{ fill: "var(--color-credits)", strokeWidth: 2 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Credit Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Credit Users
          </CardTitle>
          <CardDescription>
            Members who use the most AI credits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topAICreditUsers.map((user, index) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.creditsUsed.toLocaleString()} credits used
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${user.usagePercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {user.usagePercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workout vs Diet Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workout vs Diet Line Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Workout vs Diet AI Generation Trends
            </CardTitle>
            <CardDescription>
              Comparison of AI usage for workout generation vs diet plan generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                workouts: { label: "Workout Generation", color: "blue" },
                diet: { label: "Diet Plan Generation", color: "green" },
              }}
              className="h-[300px] w-full"
            >
              <LineChart data={workoutVsDietTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="workouts"
                  stroke="var(--color-workouts)"
                  strokeWidth={2}
                  name="Workout Generation"
                  dot={{ fill: "var(--color-workouts)", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="diet"
                  stroke="var(--color-diet)"
                  strokeWidth={2}
                  name="Diet Plan Generation"
                  dot={{ fill: "var(--color-diet)", strokeWidth: 2 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Usage Distribution Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Workout Generation
            </CardTitle>
            <CardDescription>
              Total AI-generated workouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboardMetrics.totalWorkouts.toLocaleString()}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${dashboardMetrics.workoutPercent}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {dashboardMetrics.workoutPercent.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Diet Plan Generation
            </CardTitle>
            <CardDescription>
              Total AI-generated diet plans
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dashboardMetrics.totalDiet.toLocaleString()}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${dashboardMetrics.dietPercent}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {dashboardMetrics.dietPercent.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


const AdminAIUsage = () => {
  return (
    <AdminLayout>
      <AIUsage />
    </AdminLayout>
  );
};

export default AIUsage;
