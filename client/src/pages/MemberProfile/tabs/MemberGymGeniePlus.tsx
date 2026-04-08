import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Zap, Target, TrendingUp, Star, Crown, Shield, Clock, Dumbbell, Heart, Flame } from "lucide-react";
import { MemberProfileProps } from "../types";

export function MemberGymGeniePlus({ memberId }: MemberProfileProps) {
  // This component can be extended with various premium features
  // For now, it's a placeholder showing available premium features
  
  const premiumFeatures = [
    {
      icon: Crown,
      title: "Premium Membership",
      description: "Access to all premium features",
      status: "Active",
      color: "text-yellow-500"
    },
    {
      icon: Sparkles,
      title: "AI-Powered Coaching",
      description: "Personalized workout recommendations",
      status: "Available",
      color: "text-purple-500"
    },
    {
      icon: TrendingUp,
      title: "Advanced Analytics",
      description: "Detailed progress tracking & insights",
      status: "Available",
      color: "text-blue-500"
    },
    {
      icon: Target,
      title: "Smart Goals",
      description: "AI-suggested fitness goals",
      status: "Available",
      color: "text-green-500"
    },
    {
      icon: Heart,
      title: "Health Insights",
      description: "Comprehensive health analysis",
      status: "Coming Soon",
      color: "text-red-500"
    },
    {
      icon: Flame,
      title: "Calorie Intelligence",
      description: "Advanced calorie tracking & planning",
      status: "Coming Soon",
      color: "text-orange-500"
    }
  ];

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          GymGenie Plus
        </CardTitle>
        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
          Premium
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {premiumFeatures.map((feature, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-border bg-background/50 hover:bg-background transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-muted ${feature.color}`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                  <Badge 
                    variant="secondary" 
                    className={`mt-2 text-xs ${
                      feature.status === "Active" ? "bg-green-500/10 text-green-500" :
                      feature.status === "Available" ? "bg-blue-500/10 text-blue-500" :
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {feature.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon Section */}
        <div className="mt-8 p-6 rounded-lg bg-gradient-to-r from-yellow-500/10 via-purple-500/10 to-blue-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            <h3 className="font-bold text-lg">Coming Soon</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            We're working on bringing you more premium features including advanced AI coaching, 
            detailed health analytics, and personalized nutrition planning. Stay tuned!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
