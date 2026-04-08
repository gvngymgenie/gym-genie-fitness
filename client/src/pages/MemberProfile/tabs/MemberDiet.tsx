import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Apple, Plus, Sparkles, Pencil, Trash2, ChevronDown, ChevronRight, Flame, Beef, Wheat, Droplet, FileText, Calendar, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MemberProfileProps } from "../types";
import { DietPlan, DietPlanAssignment } from "@shared/schema";
import { CreateDietSheet } from "@/components/CreateDietSheet";
import { GenieDietSheet } from "./GenieDietSheet";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Helper function to get meal type icon and color
function getMealTypeInfo(mealName: string): { icon: string; color: string; bgColor: string } {
  const mealLower = mealName.toLowerCase();
  
  if (mealLower.includes('breakfast') || mealLower.includes('morning')) {
    return { icon: '🌅', color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
  } else if (mealLower.includes('lunch') || mealLower.includes('midday')) {
    return { icon: '☀️', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' };
  } else if (mealLower.includes('dinner') || mealLower.includes('evening')) {
    return { icon: '🌙', color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' };
  } else if (mealLower.includes('snack')) {
    return { icon: '🍿', color: 'text-purple-500', bgColor: 'bg-purple-500/10' };
  } else if (mealLower.includes('pre') || mealLower.includes('post')) {
    return { icon: '⚡', color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
  }
  
  return { icon: '🍽️', color: 'text-green-500', bgColor: 'bg-green-500/10' };
}

// Helper function to format date
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper function to check if dates are different
function areDatesDifferent(date1: Date | string | null | undefined, date2: Date | string | null | undefined): boolean {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return Math.abs(d1.getTime() - d2.getTime()) > 60000; // More than 1 minute difference
}

// Helper function to get color for nutritional values
function getNutritionColor(value: number, type: 'calories' | 'protein' | 'carbs' | 'fat'): string {
  if (type === 'calories') {
    if (value < 300) return 'text-green-500';
    if (value < 600) return 'text-yellow-500';
    return 'text-red-500';
  }
  if (type === 'protein') {
    if (value >= 30) return 'text-green-500';
    if (value >= 15) return 'text-yellow-500';
    return 'text-muted-foreground';
  }
  if (type === 'carbs') {
    if (value < 30) return 'text-green-500';
    if (value < 60) return 'text-yellow-500';
    return 'text-red-500';
  }
  if (type === 'fat') {
    if (value < 10) return 'text-green-500';
    if (value < 20) return 'text-yellow-500';
    return 'text-red-500';
  }
  return 'text-muted-foreground';
}

export function MemberDiet({ memberId }: MemberProfileProps) {
  const [openCreateDiet, setOpenCreateDiet] = useState(false);
  const [openGenieDiet, setOpenGenieDiet] = useState(false);
  const [editingDiet, setEditingDiet] = useState<DietPlan | null>(null);
  const [expandedDiets, setExpandedDiets] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: dietAssignments = [] } = useQuery({
    queryKey: ["/api/members", memberId, "diet-assignments"],
    queryFn: async () => {
      const res = await fetch(`/api/members/${memberId}/diet-assignments`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!memberId,
  });

  const { data: allDiets = [] } = useQuery({
    queryKey: ["/api/diet-plans"],
    enabled: !!memberId,
  });

  const assignedDiets = (allDiets as DietPlan[]).filter((d: DietPlan) =>
    (dietAssignments as DietPlanAssignment[]).some((a: DietPlanAssignment) => a.dietPlanId === d.id)
  );

  const toggleDietExpansion = (dietId: string) => {
    const newExpanded = new Set(expandedDiets);
    if (newExpanded.has(dietId)) {
      newExpanded.delete(dietId);
    } else {
      newExpanded.add(dietId);
    }
    setExpandedDiets(newExpanded);
  };

  const deleteDietMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/diet-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diet-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "diet-assignments"] });
      toast({ title: "Diet plan deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleEditDiet = (diet: DietPlan) => {
    setEditingDiet(diet);
    setOpenCreateDiet(true);
  };

  const handleDeleteDiet = (diet: DietPlan) => {
    if (confirm("Are you sure you want to delete this diet plan?")) {
      deleteDietMutation.mutate(diet.id);
    }
  };

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-bold">Assigned Diet Plans</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"            
              onClick={() => setOpenGenieDiet(true)}
            >
              <Sparkles className="h-4 w-4" />
              Genie Diet
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setOpenCreateDiet(true)}
            >
              <Plus className="h-4 w-4" />
              Custom Diet
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assignedDiets.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <Apple className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm italic">No diet plans assigned to this member.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedDiets.map((diet) => {
                const isExpanded = expandedDiets.has(diet.id);
                const mealInfo = getMealTypeInfo(diet.meal);
                const foods = diet.foods as string[];

                return (
                  <Card key={diet.id} className="bg-background/50 border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleDietExpansion(diet.id)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          <div className={`p-2 rounded-lg ${mealInfo.bgColor}`}>
                            <Apple className={`h-5 w-5 ${mealInfo.color}`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground">{diet.meal}</h3>
                            <p className="text-sm text-muted-foreground">{foods.length} food items</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Custom Diet badge */}
                          {(diet as any).customDiet && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 h-8">
                              <Sparkles className="h-4 w-4 text-green-500 mr-1" />
                              AI Generated
                            </Badge>
                          )}
                          {/* Edit and Delete buttons */}
                           {(diet as any).customDiet &&
                           <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                            onClick={() => handleEditDiet(diet)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteDiet(diet)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
              </>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Nutritional Info Grid */}
                      
<div className="pb-4 ">
                          <div>
                            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                              <Apple className="h-4 w-4" />
                              Food Items
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {foods.map((food, index) => (
                                <Badge key={index} variant="secondary" className="text-xs px-3 py-1">
                                  {food}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      {/* Expandable Food Details */}
                      {isExpanded && (
                        <div className="mt-2 border-t border-border pt-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Date Information */}
                        <div className="flex flex-wrap gap-4 mb-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Created: {formatDate(diet.createdAt)}</span>
                          </div>
                          {areDatesDifferent((diet as any).updatedAt, diet.createdAt) && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Modified: {formatDate((diet as any).updatedAt)}</span>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <div>
                            <p className="text-muted-foreground text-xs">Calories</p>
                            <p className={`font-semibold ${getNutritionColor(diet.calories, 'calories')}`}>
                              {diet.calories} kcal
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Beef className="h-4 w-4 text-red-500" />
                          <div>
                            <p className="text-muted-foreground text-xs">Protein</p>
                            <p className={`font-semibold ${getNutritionColor(diet.protein, 'protein')}`}>
                              {diet.protein}g
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Wheat className="h-4 w-4 text-yellow-500" />
                          <div>
                            <p className="text-muted-foreground text-xs">Carbs</p>
                            <p className={`font-semibold ${getNutritionColor(diet.carbs, 'carbs')}`}>
                              {diet.carbs}g
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Droplet className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-muted-foreground text-xs">Fat</p>
                            <p className={`font-semibold ${getNutritionColor(diet.fat, 'fat')}`}>
                              {diet.fat}g
                            </p>
                          </div>
                        </div>
                      </div>
                        {/* Notes Section */}
                        {(diet as any).notes && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Dietary Notes</p>
                                <p className="text-sm text-foreground whitespace-pre-wrap">{(diet as any).notes}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Diet Sheet */}
      <CreateDietSheet 
        open={openCreateDiet}
        onOpenChange={(open) => {
          setOpenCreateDiet(open);
          if (!open) setEditingDiet(null);
        }}
        editingMeal={editingDiet}
        preselectedMemberId={memberId}
      />

      {/* Genie Diet Sheet */}
      <GenieDietSheet
        open={openGenieDiet}
        onOpenChange={setOpenGenieDiet}
        memberId={memberId}
      />
    </>
  );
}
