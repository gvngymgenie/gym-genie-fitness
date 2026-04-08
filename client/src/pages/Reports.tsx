import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { revenueData, attendanceData } from "@/lib/mockData";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Line, LineChart, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Reports() {
  const pieData = [
    { name: 'Yearly', value: 400 },
    { name: 'Monthly', value: 300 },
    { name: 'Quarterly', value: 300 },
    { name: 'Half-Yearly', value: 200 },
  ];
  const COLORS = ['hsl(217, 91%, 60%)', 'hsl(84, 81%, 56%)', 'hsl(280, 80%, 60%)', 'hsl(43, 96%, 56%)'];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold font-heading text-foreground">REPORTS</h1>
                <p className="text-muted-foreground">Deep dive into your gym's performance metrics.</p>
            </div>
            <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Export All
            </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Revenue Trend (6 Months)</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                            <YAxis stroke="hsl(var(--muted-foreground))" />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                            <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Membership Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ 
                                color: 'hsl(var(--foreground))',    
                                backgroundColor: 'hsl(var(--card))', 
                                borderColor: 'hsl(var(--border))' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-4">
                        {pieData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                                <span className="text-sm text-muted-foreground">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="col-span-full bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Weekly Footfall Analysis</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={attendanceData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                            <YAxis stroke="hsl(var(--muted-foreground))" />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} cursor={{fill: 'hsl(var(--muted)/0.2)'}} />
                            <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
      </div>
    </Layout>
  );
}
