import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
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
  merchandise,
  merchandiseSalesData,
  categorySalesData,
} from "@/lib/mockData";

const Merchandise = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Calculate dashboard metrics
  const dashboardMetrics = useMemo(() => {
    const totalSales = merchandise.reduce((acc, item) => {
      const latestSales = item.salesData[item.salesData.length - 1] || 0;
      return acc + latestSales * item.price;
    }, 0);

    const totalProfit = merchandise.reduce((acc, item) => {
      const latestSales = item.salesData[item.salesData.length - 1] || 0;
      const profitPerUnit = item.price - item.cost;
      return acc + latestSales * profitPerUnit;
    }, 0);

    const lowStockItems = merchandise.filter(
      (item) => item.stock <= item.reorderLevel,
    );
    const totalStockValue = merchandise.reduce(
      (acc, item) => acc + item.stock * item.cost,
      0,
    );

    return {
      totalSales,
      totalProfit,
      profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
      lowStockCount: lowStockItems.length,
      totalStockValue,
    };
  }, []);

  // Filter merchandise based on search and category
  const filteredMerchandise = useMemo(() => {
    return merchandise.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(merchandise.map((item) => item.category)),
    );
    return ["All", ...uniqueCategories];
  }, []);

  const getCategoryColor = (category: string) => {
    const colors = {
      Supplements: "#22c55e",
      Apparel: "#3b82f6",
      Accessories: "#f59e0b",
      "Training Aids": "#ef4444",
    };
    return colors[category as keyof typeof colors] || "#6b7280";
  };

  // Calculate category-wise sales for pie chart
  const categorySales = useMemo(() => {
    const categoryTotals = merchandise.reduce(
      (acc, item) => {
        const latestSales = item.salesData[item.salesData.length - 1] || 0;
        const salesValue = latestSales * item.price;

        if (!acc[item.category]) {
          acc[item.category] = 0;
        }
        acc[item.category] += salesValue;

        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
      fill: getCategoryColor(name),
    }));
  }, []);

  const getStockStatus = (stock: number, reorderLevel: number) => {
    if (stock <= reorderLevel)
      return { status: "Low Stock", variant: "destructive" };
    if (stock <= reorderLevel * 2)
      return { status: "Medium Stock", variant: "warning" };
    return { status: "In Stock", variant: "success" };
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold font-heading text-foreground">
          MERCHANDISE MANAGEMENT
        </h1>
        <p className="text-muted-foreground">
          Manage gym merchandise and health-related products.
        </p>
      </div>

      {/* Mini Status Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sales (Current Month)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{dashboardMetrics.totalSales.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <span className="h-4 w-4 text-muted-foreground">₹</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
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
              Low Stock Items
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardMetrics.lowStockCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Items need restocking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{dashboardMetrics.totalStockValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total inventory value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Sales Trend</CardTitle>
            <CardDescription>
              Sales performance over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total: {
                  label: "Sales",
                  color: "blue",
                },
              }}
              className="h-[300px] w-full"
            >
              <LineChart data={merchandiseSalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category-wise Sales Distribution</CardTitle>
            <CardDescription>
              Current month sales by product category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                supplements: { label: "Supplements", color: "green" },
                apparel: { label: "Apparel", color: "blue" },
                accessories: { label: "Accessories", color: "orange" },
                training: { label: "Training Aids", color: "red" },
              }}
              className="h-[300px] w-full"
            >
              <PieChart>
                <Pie
                  data={categorySales}
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
                  {categorySales.map((entry, index) => (
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

      {/* Merchandise Management */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search merchandise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full md:w-64"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Item
          </Button>
        </div>

        <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Image</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Monthly Sales</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMerchandise.map((item) => {
                const latestSales =
                  item.salesData[item.salesData.length - 1] || 0;
                const profitPerUnit = item.price - item.cost;
                const totalProfit = latestSales * profitPerUnit;
                const stockStatus = getStockStatus(
                  item.stock,
                  item.reorderLevel,
                );

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <div>{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.supplier}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.category}</Badge>
                    </TableCell>
                    <TableCell>₹{item.price.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={stockStatus.variant as any}>
                          {item.stock}
                        </Badge>
                        {item.stock <= item.reorderLevel && (
                          <span className="text-xs text-red-500">⚠️</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{latestSales}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      +₹{totalProfit.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm">
                          Restock
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Merchandise;
