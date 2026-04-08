import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { MemberProfileProps } from "../types";

export function MemberBodyComposition({ memberId }: MemberProfileProps) {
  const [openAddBodyComp, setOpenAddBodyComp] = useState(false);
  const queryClient = useQueryClient();

  // Fetch body composition data from API
  const { data: bodyCompositions, isLoading, error } = useQuery({
    queryKey: ["/api/members", memberId, "body-composition"],
    queryFn: async () => {
      const res = await fetch(`/api/members/${memberId}/body-composition`);
      if (!res.ok) throw new Error("Failed to fetch body composition data");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createBodyCompMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/members/${memberId}/body-composition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to add body composition");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "body-composition"] });
      setOpenAddBodyComp(false);
    }
  });

  const deleteBodyCompMutation = useMutation({
    mutationFn: async (bodyCompId: string) => {
      const res = await fetch(`/api/members/${memberId}/body-composition/${bodyCompId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete body composition");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "body-composition"] });
    }
  });

  const handleAddBodyComposition = (data: any) => {
    createBodyCompMutation.mutate(data);
  };

  const handleDeleteBodyComposition = (bodyCompId: string) => {
    deleteBodyCompMutation.mutate(bodyCompId);
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold">Body composition</CardTitle>
        <Sheet open={openAddBodyComp} onOpenChange={setOpenAddBodyComp}>
          <SheetTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Body Composition
            </Button>
          </SheetTrigger>
          <SheetContent className="max-w-xl bg-card border-border shadow-2xl">
            <SheetHeader>
              <SheetTitle className="text-xl font-bold font-heading text-primary">Add Body Composition</SheetTitle>
            </SheetHeader>
            <form
              className="space-y-4 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  recordDate: new Date().toISOString().split('T')[0],
                  bodyWeight: formData.get('weight') ? parseFloat(formData.get('weight') as string) : null,
                  bmi: formData.get('bmi') ? parseFloat(formData.get('bmi') as string) : null,
                  bodyFatPercentage: formData.get('fatPercentage') ? parseFloat(formData.get('fatPercentage') as string) : null,
                  leanBodyMass: formData.get('lbm') ? parseFloat(formData.get('lbm') as string) : null
                };
                handleAddBodyComposition(data);
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Weight (kg)</Label>
                  <Input type="number" step="0.1" name="weight" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">BMI</Label>
                  <Input type="number" step="0.1" name="bmi" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Fat %</Label>
                  <Input type="number" step="0.1" name="fatPercentage" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">LBM (kg)</Label>
                  <Input type="number" step="0.1" name="lbm" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <SheetClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <Button 
                  type="submit" 
                  className="bg-primary text-primary-foreground"
                  disabled={createBodyCompMutation.isPending}
                >
                  {createBodyCompMutation.isPending ? "Saving..." : "Save Entry"}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-destructive">
            Error loading body composition data: {error.message}
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Weight (kg)</th>
                <th className="px-4 py-3 text-left">BMI</th>
                <th className="px-4 py-3 text-left">Fat (%)</th>
                <th className="px-4 py-3 text-left">LBM (kg)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bodyCompositions?.map((bodyComp: any) => (
                <tr key={bodyComp.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">{bodyComp.recordDate || bodyComp.date}</td>
                  <td className="px-4 py-3 font-bold text-primary">{bodyComp.bodyWeight || bodyComp.weight}</td>
                  <td className="px-4 py-3 font-semibold">{bodyComp.bmi}</td>
                  <td className="px-4 py-3 font-semibold">{bodyComp.bodyFatPercentage || bodyComp.fatPercentage}</td>
                  <td className="px-4 py-3 font-semibold">{bodyComp.leanBodyMass || bodyComp.lbm}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteBodyComposition(bodyComp.id)}
                      disabled={deleteBodyCompMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(!bodyCompositions || bodyCompositions.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No body composition data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
