import { MemberLayout } from "@/components/layout/MemberLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, TrendingDown, TrendingUp, Activity } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function MemberHealth() {
  const weightData = [
    { date: "Week 1", weight: 85, target: 80 },
    { date: "Week 2", weight: 84.2, target: 80 },
    { date: "Week 3", weight: 83.5, target: 80 },
    { date: "Week 4", weight: 82.8, target: 80 },
  ];

  return (
    <MemberLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground">HEALTH TRACKER</h1>
          <p className="text-muted-foreground">Monitor your fitness progress and health metrics.</p>
        </div>

        {/* Health Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Weight</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">82.8 kg</div>
              <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                <TrendingDown className="h-3 w-3" /> 2.2 kg down
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">BMI</CardTitle>
              <Heart className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24.2</div>
              <p className="text-xs text-green-500 mt-1">Normal Range</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Body Fat</CardTitle>
              <Activity className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18%</div>
              <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                <TrendingDown className="h-3 w-3" /> Improving
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Muscle Mass</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">67.9 kg</div>
              <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                <TrendingUp className="h-3 w-3" /> +1.2 kg gain
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weight Progress Chart */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Weight Progress (30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData}>
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" domain={[79, 86]} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={3} name="Current" dot={{r: 4}} />
                <Line type="monotone" dataKey="target" stroke="hsl(var(--accent))" strokeWidth={2} strokeDasharray="5 5" name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Measurements */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Body Measurements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Chest", value: "98 cm", change: "+1.2 cm" },
                { label: "Waist", value: "82 cm", change: "-2.5 cm" },
                { label: "Arms", value: "34 cm", change: "+0.8 cm" },
                { label: "Thighs", value: "56 cm", change: "+1.5 cm" },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <span className="text-muted-foreground">{m.label}</span>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{m.value}</p>
                    <p className="text-xs text-green-500">{m.change}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Goals & Targets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { goal: "Target Weight", current: "82.8 kg", target: "80 kg", progress: 88 },
                { goal: "Body Fat %", current: "18%", target: "15%", progress: 65 },
                { goal: "Muscle Mass", current: "67.9 kg", target: "70 kg", progress: 75 },
              ].map((g, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{g.goal}</span>
                    <span className="text-muted-foreground">{g.current} / {g.target}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: `${g.progress}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  );
}
