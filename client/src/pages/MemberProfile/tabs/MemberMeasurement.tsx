import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { MemberProfileProps } from "../types";

export function MemberMeasurement({ memberId }: MemberProfileProps) {
   const [openAddMeasurement, setOpenAddMeasurement] = useState(false);
   const queryClient = useQueryClient();

   // Fetch measurements
   const { data: measurements = [], isLoading, error } = useQuery({
     queryKey: ["/api/members", memberId, "measurements"],
     queryFn: async () => {
       const res = await fetch(`/api/members/${memberId}/measurements`);
       if (!res.ok) throw new Error("Failed to fetch measurements");
       return res.json();
     }
   });

   const createMeasurementMutation = useMutation({
     mutationFn: async (data: any) => {
       const res = await fetch(`/api/members/${memberId}/measurements`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(data)
       });
       if (!res.ok) throw new Error("Failed to add measurement");
       return res.json();
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "measurements"] });
       setOpenAddMeasurement(false);
     }
   });

   const deleteMeasurementMutation = useMutation({
     mutationFn: async (measurementId: string) => {
       const res = await fetch(`/api/members/${memberId}/measurements/${measurementId}`, {
         method: "DELETE"
       });
       if (!res.ok) throw new Error("Failed to delete measurement");
       return res.json();
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "measurements"] });
     }
   });

  const handleAddMeasurement = (data: any) => {
    createMeasurementMutation.mutate(data);
  };

  const handleDeleteMeasurement = (measurementId: string) => {
    if (confirm("Are you sure you want to delete this measurement?")) {
      deleteMeasurementMutation.mutate(measurementId);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-destructive">
            <p className="text-sm">Failed to load measurements</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold">Measurement</CardTitle>
        <Sheet open={openAddMeasurement} onOpenChange={setOpenAddMeasurement}>
          <SheetTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Measurement
            </Button>
          </SheetTrigger>
          <SheetContent className="max-w-md bg-card border-border shadow-2xl">
            <SheetHeader>
              <SheetTitle className="text-xl font-bold font-heading text-primary">Add Measurement</SheetTitle>
            </SheetHeader>
            <form
              className="space-y-4 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  chest: parseFloat(formData.get('chest') as string),
                  waist: parseFloat(formData.get('waist') as string),
                  arms: parseFloat(formData.get('arms') as string),
                  thighs: parseFloat(formData.get('thighs') as string)
                };
                handleAddMeasurement(data);
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Chest (in)</Label>
                  <Input type="number" step="0.1" name="chest" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Waist (in)</Label>
                  <Input type="number" step="0.1" name="waist" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Arms (in)</Label>
                  <Input type="number" step="0.1" name="arms" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Thighs (in)</Label>
                  <Input type="number" step="0.1" name="thighs" required />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <SheetClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground"
                  disabled={createMeasurementMutation.isPending}
                >
                  {createMeasurementMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </CardHeader>
      <CardContent>
        {measurements.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm">No measurements available.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Chest (in)</th>
                  <th className="px-4 py-3 text-left">Waist (in)</th>
                  <th className="px-4 py-3 text-left">Arms (in)</th>
                  <th className="px-4 py-3 text-left">Thighs (in)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {measurements.map((measurement: any) => (
                  <tr key={measurement.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">{new Date(measurement.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-semibold">{measurement.chest}</td>
                    <td className="px-4 py-3 font-semibold">{measurement.waist}</td>
                    <td className="px-4 py-3 font-semibold">{measurement.arms}</td>
                    <td className="px-4 py-3 font-semibold">{measurement.thighs}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteMeasurement(measurement.id)}
                        disabled={deleteMeasurementMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}