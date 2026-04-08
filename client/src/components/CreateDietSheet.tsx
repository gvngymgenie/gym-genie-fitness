import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DietPlan, Member } from "@shared/schema";

type DietForm = {
  meal: string;
  foods: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  customDiet: boolean;
  memberId: string | null;
  notes: string;
};

interface CreateDietSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMeal?: DietPlan | null;
  preselectedMemberId?: string | null;
}

export function CreateDietSheet({ open, onOpenChange, editingMeal = null, preselectedMemberId = null }: CreateDietSheetProps) {
  const [dietForm, setDietForm] = useState<DietForm>({
    meal: editingMeal?.meal || "",
    foods: editingMeal ? (editingMeal.foods as string[]).join(", ") : "",
    calories: editingMeal?.calories.toString() || "",
    protein: editingMeal?.protein.toString() || "",
    carbs: editingMeal?.carbs.toString() || "",
    fat: editingMeal?.fat.toString() || "",
    customDiet: (editingMeal as any)?.customDiet || false,
    memberId: preselectedMemberId,
    notes: editingMeal?.notes || "",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch members for the dropdown
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const createDietMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/diet-plans", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diet-plans"] });
      toast({ title: "Diet plan created" });
      onOpenChange(false);
      resetDietForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateDietMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/diet-plans/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/diet-plans"] });
      toast({ title: "Diet plan updated" });
      onOpenChange(false);
      resetDietForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetDietForm = () => {
    setDietForm({ 
      meal: "", 
      foods: "", 
      calories: "", 
      protein: "", 
      carbs: "", 
      fat: "",
      customDiet: false,
      memberId: preselectedMemberId,
      notes: "",
    });
  };

  const handleDietSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const foodsArray = dietForm.foods.split(",").map(f => f.trim()).filter(Boolean);
    const data = {
      meal: dietForm.meal,
      foods: foodsArray,
      calories: parseInt(dietForm.calories) || 0,
      protein: parseInt(dietForm.protein) || 0,
      carbs: parseInt(dietForm.carbs) || 0,
      fat: parseInt(dietForm.fat) || 0,
      customDiet: dietForm.customDiet,
      memberId: dietForm.customDiet ? dietForm.memberId : null,
      notes: dietForm.notes.trim() || null,
    };

    if (editingMeal) {
      updateDietMutation.mutate({ id: editingMeal.id, data });
    } else {
      createDietMutation.mutate(data);
    }
  };

  // Update form when editingMeal prop changes
  useEffect(() => {
    if (editingMeal) {
      setDietForm({
        meal: editingMeal.meal || "",
        foods: editingMeal.foods ? (editingMeal.foods as string[]).join(", ") : "",
        calories: editingMeal.calories?.toString() || "",
        protein: editingMeal.protein?.toString() || "",
        carbs: editingMeal.carbs?.toString() || "",
        fat: editingMeal.fat?.toString() || "",
        customDiet: (editingMeal as any)?.customDiet || false,
        memberId: (editingMeal as any)?.memberId || preselectedMemberId,
        notes: editingMeal.notes || "",
      });
    } else {
      resetDietForm();
    }
  }, [editingMeal, preselectedMemberId]);

  const isEditing = !!editingMeal;

  return (
    <Sheet open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetDietForm(); }}>
      <SheetContent className="sm:max-w-md w-full bg-card border-l border-border overflow-y-auto">
        <SheetHeader className="border-b border-border pb-6 mb-6">
          <SheetTitle className="text-2xl font-bold font-heading text-accent uppercase tracking-tight">
            {isEditing ? "Edit Meal" : "Create Diet Plan"}
          </SheetTitle>
        </SheetHeader>
        <form className="space-y-6" onSubmit={handleDietSubmit}>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meal Name</Label>
            <Input 
              value={dietForm.meal} 
              onChange={(e) => setDietForm({ ...dietForm, meal: e.target.value })} 
              placeholder="e.g. Breakfast, Lunch" 
              className="bg-background border-border h-11" 
              required 
              data-testid="input-diet-meal" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Foods (comma separated)</Label>
            <Input 
              value={dietForm.foods} 
              onChange={(e) => setDietForm({ ...dietForm, foods: e.target.value })} 
              placeholder="e.g. Oats, Eggs, Banana" 
              className="bg-background border-border h-11" 
              required 
              data-testid="input-diet-foods" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Calories</Label>
            <Input 
              type="number" 
              value={dietForm.calories} 
              onChange={(e) => setDietForm({ ...dietForm, calories: e.target.value })} 
              placeholder="e.g. 450" 
              className="bg-background border-border h-11" 
              required 
              data-testid="input-diet-calories" 
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Protein (g)</Label>
              <Input 
                type="number" 
                value={dietForm.protein} 
                onChange={(e) => setDietForm({ ...dietForm, protein: e.target.value })} 
                className="bg-background border-border h-11" 
                required 
                data-testid="input-diet-protein" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Carbs (g)</Label>
              <Input 
                type="number" 
                value={dietForm.carbs} 
                onChange={(e) => setDietForm({ ...dietForm, carbs: e.target.value })} 
                className="bg-background border-border h-11" 
                required 
                data-testid="input-diet-carbs" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fat (g)</Label>
              <Input 
                type="number" 
                value={dietForm.fat} 
                onChange={(e) => setDietForm({ ...dietForm, fat: e.target.value })} 
                className="bg-background border-border h-11" 
                required 
                data-testid="input-diet-fat" 
              />
            </div>
          </div>
          
          {/* Custom Diet - Yes/No Select */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Custom Diet</Label>
            <Select 
              value={dietForm.customDiet ? "true" : "false"} 
              onValueChange={(val) => setDietForm({ 
                ...dietForm, 
                customDiet: val === "true", 
                memberId: val === "false" ? "" : dietForm.memberId 
              })}
            >
              <SelectTrigger className="bg-background border-border h-11" data-testid="select-custom-diet">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No - General Diet</SelectItem>
                <SelectItem value="true">Yes - Custom for Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Select Member - Only visible when Custom Diet is true */}
          {dietForm.customDiet && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Member</Label>
              <Select 
                value={dietForm.memberId || ""} 
                onValueChange={(val) => setDietForm({ ...dietForm, memberId: val })}
              >
                <SelectTrigger className="bg-background border-border h-11" data-testid="select-member">
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName} {m.lastName || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Notes Field */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes (Optional)</Label>
            <Textarea 
              value={dietForm.notes} 
              onChange={(e) => setDietForm({ ...dietForm, notes: e.target.value })} 
              placeholder="e.g. Special dietary instructions, preferences, allergies..." 
              className="bg-background border-border min-h-[80px] resize-none" 
              rows={3}
              data-testid="input-diet-notes" 
            />
          </div>
          
          <div className="flex flex-col gap-3 pt-6 border-t border-border mt-8">
            <Button 
              type="submit" 
              className="w-full h-12 bg-accent text-accent-foreground hover:bg-accent/90 font-bold uppercase tracking-wider text-base" 
              disabled={createDietMutation.isPending || updateDietMutation.isPending} 
              data-testid="button-submit-diet"
            >
              {(createDietMutation.isPending || updateDietMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update Meal" : "Create Diet Plan"}
            </Button>
            <SheetClose asChild>
              <Button type="button" variant="outline" className="w-full h-12 border-border hover:bg-muted font-bold uppercase tracking-wider">Cancel</Button>
            </SheetClose>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
