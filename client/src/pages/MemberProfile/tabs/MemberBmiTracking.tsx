import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Save, X, Pencil, Check } from "lucide-react";
import { MemberProfileProps, BmiMetric } from "../types";
import { useToast } from "@/hooks/use-toast";

export function MemberBmiTracking({ memberId }: MemberProfileProps) {
  const [isAddingBmi, setIsAddingBmi] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editInputs, setEditInputs] = useState<Record<string, any>>({});
  const [bmiInputs, setBmiInputs] = useState({
    bodyWeight: "",
    bmi: "",
    bodyFatPercentage: "",
    muscleMass: "",
    bodyWaterPercentage: "",
    boneMass: "",
    visceralFat: "",
    subcutaneousFat: "",
    bmr: "",
    proteinPercentage: "",
    metabolicAge: "",
    leanBodyMass: "",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update BMI mutation
  const updateBmiMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/members/${memberId}/bmi-records/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to update BMI record");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "bmi-records"] });
      setEditingRecordId(null);
      setEditInputs({});
      toast({ title: "BMI record updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data: bmiRecords = [] } = useQuery({
    queryKey: ["/api/members", memberId, "bmi-records"],
    queryFn: async () => {
      const res = await fetch(`/api/members/${memberId}/bmi-records`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!memberId,
  });

  const createBmiMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/members/${memberId}/bmi-records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error("Failed to add BMI record");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members", memberId, "bmi-records"] });
      setIsAddingBmi(false);
      setBmiInputs({
        bodyWeight: "",
        bmi: "",
        bodyFatPercentage: "",
        muscleMass: "",
        bodyWaterPercentage: "",
        boneMass: "",
        visceralFat: "",
        subcutaneousFat: "",
        bmr: "",
        proteinPercentage: "",
        metabolicAge: "",
        leanBodyMass: "",
      });
    }
  });

  const handleSaveBmi = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const today = `${day}/${month}/${year}`;
    
    createBmiMutation.mutate({
      recordDate: today,
      bodyWeight: bmiInputs.bodyWeight ? parseFloat(bmiInputs.bodyWeight) : null,
      bmi: bmiInputs.bmi ? parseFloat(bmiInputs.bmi) : null,
      bodyFatPercentage: bmiInputs.bodyFatPercentage ? parseFloat(bmiInputs.bodyFatPercentage) : null,
      muscleMass: bmiInputs.muscleMass ? parseFloat(bmiInputs.muscleMass) : null,
      bodyWaterPercentage: bmiInputs.bodyWaterPercentage ? parseFloat(bmiInputs.bodyWaterPercentage) : null,
      boneMass: bmiInputs.boneMass ? parseFloat(bmiInputs.boneMass) : null,
      visceralFat: bmiInputs.visceralFat ? parseFloat(bmiInputs.visceralFat) : null,
      subcutaneousFat: bmiInputs.subcutaneousFat ? parseFloat(bmiInputs.subcutaneousFat) : null,
      bmr: bmiInputs.bmr ? parseFloat(bmiInputs.bmr) : null,
      proteinPercentage: bmiInputs.proteinPercentage ? parseFloat(bmiInputs.proteinPercentage) : null,
      metabolicAge: bmiInputs.metabolicAge ? parseInt(bmiInputs.metabolicAge) : null,
      leanBodyMass: bmiInputs.leanBodyMass ? parseFloat(bmiInputs.leanBodyMass) : null,
    });
  };

  const handleClearBmi = () => {
    setIsAddingBmi(false);
    setBmiInputs({
      bodyWeight: "",
      bmi: "",
      bodyFatPercentage: "",
      muscleMass: "",
      bodyWaterPercentage: "",
      boneMass: "",
      visceralFat: "",
      subcutaneousFat: "",
      bmr: "",
      proteinPercentage: "",
      metabolicAge: "",
      leanBodyMass: "",
    });
  };

  // Start editing a record
  const handleStartEdit = (record: any) => {
    setEditingRecordId(record.id);
    setEditInputs({
      bodyWeight: record.bodyWeight ?? "",
      bmi: record.bmi ?? "",
      bodyFatPercentage: record.bodyFatPercentage ?? "",
      muscleMass: record.muscleMass ?? "",
      bodyWaterPercentage: record.bodyWaterPercentage ?? "",
      boneMass: record.boneMass ?? "",
      visceralFat: record.visceralFat ?? "",
      subcutaneousFat: record.subcutaneousFat ?? "",
      bmr: record.bmr ?? "",
      proteinPercentage: record.proteinPercentage ?? "",
      metabolicAge: record.metabolicAge ?? "",
      leanBodyMass: record.leanBodyMass ?? "",
    });
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEditInputs({});
  };

  // Save edited record
  const handleSaveEdit = (recordId: string) => {
    const data: any = {};
    if (editInputs.bodyWeight !== "") data.bodyWeight = parseFloat(editInputs.bodyWeight);
    if (editInputs.bmi !== "") data.bmi = parseFloat(editInputs.bmi);
    if (editInputs.bodyFatPercentage !== "") data.bodyFatPercentage = parseFloat(editInputs.bodyFatPercentage);
    if (editInputs.muscleMass !== "") data.muscleMass = parseFloat(editInputs.muscleMass);
    if (editInputs.bodyWaterPercentage !== "") data.bodyWaterPercentage = parseFloat(editInputs.bodyWaterPercentage);
    if (editInputs.boneMass !== "") data.boneMass = parseFloat(editInputs.boneMass);
    if (editInputs.visceralFat !== "") data.visceralFat = parseFloat(editInputs.visceralFat);
    if (editInputs.subcutaneousFat !== "") data.subcutaneousFat = parseFloat(editInputs.subcutaneousFat);
    if (editInputs.bmr !== "") data.bmr = parseFloat(editInputs.bmr);
    if (editInputs.proteinPercentage !== "") data.proteinPercentage = parseFloat(editInputs.proteinPercentage);
    if (editInputs.metabolicAge !== "") data.metabolicAge = parseInt(editInputs.metabolicAge);
    if (editInputs.leanBodyMass !== "") data.leanBodyMass = parseFloat(editInputs.leanBodyMass);

    updateBmiMutation.mutate({ id: recordId, data });
  };

  const bmiMetrics: BmiMetric[] = [
    { key: "bodyWeight", label: "Body Weight" },
    { key: "bmi", label: "BMI" },
    { key: "bodyFatPercentage", label: "Body Fat %" },
    { key: "muscleMass", label: "Muscle Mass" },
    { key: "bodyWaterPercentage", label: "Body Water %" },
    { key: "boneMass", label: "Bone Mass" },
    { key: "visceralFat", label: "Visceral Fat" },
    { key: "subcutaneousFat", label: "Sub-cutaneous Fat" },
    { key: "bmr", label: "BMR" },
    { key: "proteinPercentage", label: "Protein %" },
    { key: "metabolicAge", label: "Metabolic Age" },
    { key: "leanBodyMass", label: "Lean Body Mass" },
  ];

  const sortedBmiRecords = [...bmiRecords].sort((a, b) => {
    const dateA = a.recordDate.split("/").reverse().join("");
    const dateB = b.recordDate.split("/").reverse().join("");
    return dateB.localeCompare(dateA);
  });

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold">BMI Tracking</CardTitle>
        <div className="flex gap-2">
          {isAddingBmi ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleClearBmi}
                data-testid="button-clear-bmi"
              >
                <X className="h-4 w-4" /> Clear
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-primary text-primary-foreground"
                onClick={handleSaveBmi}
                disabled={createBmiMutation.isPending}
                data-testid="button-save-bmi"
              >
                <Save className="h-4 w-4" /> Save
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => setIsAddingBmi(true)}
              data-testid="button-deduct-bmi"
            >
              <Plus className="h-4 w-4" /> Deduct BMI today
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-bold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3 text-left whitespace-nowrap min-w-[150px]">Metric</th>
                {isAddingBmi && (
                  <th className="px-4 py-3 text-center whitespace-nowrap min-w-[120px] bg-primary/10 border-l border-primary/20">
                    {(() => {
                      const now = new Date();
                      const d = String(now.getDate()).padStart(2, "0");
                      const m = String(now.getMonth() + 1).padStart(2, "0");
                      const y = now.getFullYear();
                      return `${d}/${m}/${y}`;
                    })()}
                  </th>
                )}
                {sortedBmiRecords.map((record) => (
                  <th key={record.id} className="px-2 py-3 text-center whitespace-nowrap min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{record.recordDate}</span>
                      {editingRecordId === record.id ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-green-600 hover:bg-green-100"
                            onClick={() => handleSaveEdit(record.id)}
                            disabled={updateBmiMutation.isPending}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:bg-primary/10"
                          onClick={() => handleStartEdit(record)}
                          title="Edit this record"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bmiMetrics.map((metric) => (
                <tr key={metric.key} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-muted-foreground">{metric.label}</td>
                  {isAddingBmi && (
                    <td className="px-4 py-2 bg-primary/5 border-l border-primary/20">
                      <Input
                        type="number"
                        step="0.1"
                        className="w-20 h-8 text-center text-sm"
                        value={bmiInputs[metric.key as keyof typeof bmiInputs]}
                        onChange={(e) =>
                          setBmiInputs((prev) => ({
                            ...prev,
                            [metric.key]: e.target.value,
                          }))
                        }
                        data-testid={`input-bmi-${metric.key}`}
                      />
                    </td>
                  )}
                  {sortedBmiRecords.map((record) => (
                    <td key={record.id} className="px-2 py-2 text-center">
                      {editingRecordId === record.id ? (
                        <Input
                          type="number"
                          step="0.1"
                          className="w-20 h-8 text-center text-sm"
                          value={editInputs[metric.key] ?? ""}
                          onChange={(e) =>
                            setEditInputs((prev) => ({
                              ...prev,
                              [metric.key]: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <span className="font-semibold">
                          {(record as any)[metric.key] !== null && (record as any)[metric.key] !== undefined
                            ? (record as any)[metric.key]
                            : "-"}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedBmiRecords.length === 0 && !isAddingBmi && (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-sm italic">No BMI records available. Click "Deduct BMI today" to add your first record.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}