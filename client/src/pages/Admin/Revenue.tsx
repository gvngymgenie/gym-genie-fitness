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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Settings,
  ShoppingBag,
  Package,
} from "lucide-react";
import {
  revenueData,
  subscriptionRevenueData,
  serviceCostData,
  revenueStreamsData,
  profitLossData,
  planRevenueBreakdown,
  expenseCategoriesData,
} from "@/lib/mockData";

const Revenue = () => {
  const [timeRange, setTimeRange] = useState("6months");

  // Calculate overall dashboard metrics
  const dashboardMetrics = useMemo(() => {
    const totalRevenue = revenueData.reduce((acc, item) => acc + item.total, 0);
    const totalSubscriptions = subscriptionRevenueData.reduce(
      (acc, item) =>
        acc + item.yearly + item.halfYearly + item.quarterly + item.monthly,
      0,
    );
    const totalExpenses = serviceCostData.reduce(
      (acc, item) => acc + item.equipment + item.maintenance + item.utilities,
      0,
    );
    const totalProfit = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalSubscriptions,
      totalExpenses,
      totalProfit,
      profitMargin,
      avgMonthlyRevenue: totalRevenue / revenueData.length,
      growthRate:
        revenueData.length > 1
          ? ((revenueData[revenueData.length - 1].total -
              revenueData[0].total) /
              revenueData[0].total) *
            100
          : 0,
    };
  }, []);

  // Calculate subscription breakdown
  const subscriptionBreakdown = useMemo(() => {
    const yearly = subscriptionRevenueData.reduce(
      (acc, item) => acc + item.yearly,
      0,
    );
    const halfYearly = subscriptionRevenueData.reduce(
      (acc, item) => acc + item.halfYearly,
      0,
    );
    const quarterly = subscriptionRevenueData.reduce(
      (acc, item) => acc + item.quarterly,
      0,
    );
    const monthly = subscriptionRevenueData.reduce(
      (acc, item) => acc + item.monthly,
      0,
    );

    return { yearly, halfYearly, quarterly, monthly };
  }, []);

  // Calculate expense breakdown
  const expenseBreakdown = useMemo(() => {
    const equipment = serviceCostData.reduce(
      (acc, item) => acc + item.equipment,
      0,
    );
    const maintenance = serviceCostData.reduce(
      (acc, item) => acc + item.maintenance,
      0,
    );
    const utilities = serviceCostData.reduce(
      (acc, item) => acc + item.utilities,
      0,
    );

    return { equipment, maintenance, utilities };
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
          REVENUE DASHBOARD
        </h1>
        <p className="text-muted-foreground">
          Comprehensive financial overview and revenue analytics.
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {["6months", "12months", "yearly"].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === "6months"
                ? "Last 6 Months"
                : range === "12months"
                  ? "Last 12 Months"
                  : "Yearly View"}
            </Button>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          Data updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      {/* Overall Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{dashboardMetrics.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all revenue streams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getGrowthColor(dashboardMetrics.totalProfit)}`}
            >
              ₹{dashboardMetrics.totalProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Profit margin: {dashboardMetrics.profitMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Subscription Revenue
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{dashboardMetrics.totalSubscriptions.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Membership income</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
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
      </div>

      {/* Revenue Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend Analysis</CardTitle>
            <CardDescription>
              Monthly income, expenses, and profit trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                income: { label: "Income", color: "green" },
                expenses: { label: "Expenses", color: "red" },
                profit: { label: "Profit", color: "blue" },
              }}
              className="h-[300px] w-full"
            >
              <BarChart data={profitLossData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey="income"
                  fill="var(--color-income)"
                  name="Income"
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--color-expenses)"
                  name="Expenses"
                />
                <Bar
                  dataKey="profit"
                  fill="var(--color-profit)"
                  name="Profit"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue Streams Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Stream Distribution</CardTitle>
            <CardDescription>Breakdown of income sources</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                subscriptions: { label: "Subscriptions", color: "blue" },
                merchandise: { label: "Merchandise", color: "green" },
                services: { label: "Services", color: "orange" },
                other: { label: "Other", color: "gray" },
              }}
              className="h-[300px] w-full"
            >
              <PieChart>
                <Pie
                  data={revenueStreamsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueStreamsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Revenue Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Revenue Breakdown</CardTitle>
            <CardDescription>Income by membership plan type</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                yearly: { label: "Yearly", color: "green" },
                halfYearly: { label: "Half Yearly", color: "blue" },
                quarterly: { label: "Quarterly", color: "orange" },
                monthly: { label: "Monthly", color: "red" },
              }}
              className="h-[300px] w-full"
            >
              <BarChart data={subscriptionRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey="yearly"
                  fill="var(--color-yearly)"
                  name="Yearly"
                />
                <Bar
                  dataKey="halfYearly"
                  fill="var(--color-halfyearly)"
                  name="Half Yearly"
                />
                <Bar
                  dataKey="quarterly"
                  fill="var(--color-quarterly)"
                  name="Quarterly"
                />
                <Bar
                  dataKey="monthly"
                  fill="var(--color-monthly)"
                  name="Monthly"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Expense Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Analysis</CardTitle>
            <CardDescription>Cost breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                equipment: { label: "Equipment Service", color: "red" },
                maintenance: { label: "Maintenance", color: "orange" },
                utilities: { label: "Utilities", color: "blue" },
                inventory: { label: "Inventory Purchases", color: "green" },
              }}
              className="h-[300px] w-full"
            >
              <PieChart>
                <Pie
                  data={expenseCategoriesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseCategoriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service and Maintenance Costs */}
      <Card>
        <CardHeader>
          <CardTitle>Service & Maintenance Costs</CardTitle>
          <CardDescription>
            Monthly equipment service and maintenance expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              equipment: { label: "Equipment Service", color: "red" },
              maintenance: { label: "Maintenance", color: "orange" },
              utilities: { label: "Utilities", color: "blue" },
            }}
            className="h-[300px] w-full"
          >
            <LineChart data={serviceCostData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="equipment"
                stroke="var(--color-equipment)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="maintenance"
                stroke="var(--color-maintenance)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="utilities"
                stroke="var(--color-utilities)"
                strokeWidth={2}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{dashboardMetrics.avgMonthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">6-month average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Equipment Service Costs
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{expenseBreakdown.equipment.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total service expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory & Purchases
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{expenseBreakdown.maintenance + expenseBreakdown.utilities}
            </div>
            <p className="text-xs text-muted-foreground">
              Maintenance + Utilities
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Revenue;
