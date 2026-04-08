import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, IndianRupee, Loader2, X } from "lucide-react";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { MembershipPlan } from "@shared/schema";

const durationOptions = [
    { value: "1", label: "1 Month" },
    { value: "3", label: "3 Months" },
    { value: "6", label: "6 Months" },
    { value: "12", label: "12 Months" },
];

const Plans = () => {
    const [open, setOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
    const [featureInput, setFeatureInput] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        name: "",
        durationMonths: "3",
        price: "",
        features: [] as string[],
        isActive: true,
    });

    const { data: plans = [], isLoading } = useQuery<MembershipPlan[]>({
        queryKey: ["/api/plans"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const duration = durationOptions.find(d => d.value === data.durationMonths)?.label || `${data.durationMonths} Months`;
            const res = await apiRequest("POST", "/api/plans", {
                name: data.name,
                duration,
                durationMonths: parseInt(data.durationMonths),
                price: parseInt(data.price),
                features: data.features,
                isActive: data.isActive,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
            toast({ title: "Plan created successfully" });
            resetForm();
            setOpen(false);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
            const duration = durationOptions.find(d => d.value === data.durationMonths)?.label || `${data.durationMonths} Months`;
            const res = await apiRequest("PATCH", `/api/plans/${id}`, {
                name: data.name,
                duration,
                durationMonths: parseInt(data.durationMonths),
                price: parseInt(data.price),
                features: data.features,
                isActive: data.isActive,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
            toast({ title: "Plan updated successfully" });
            resetForm();
            setOpen(false);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/plans/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
            toast({ title: "Plan deleted successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const resetForm = () => {
        setFormData({
            name: "",
            durationMonths: "3",
            price: "",
            features: [],
            isActive: true,
        });
        setFeatureInput("");
        setEditingPlan(null);
    };

    const handleOpenAdd = () => {
        resetForm();
        setOpen(true);
    };

    const handleOpenEdit = (plan: MembershipPlan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            durationMonths: plan.durationMonths.toString(),
            price: plan.price.toString(),
            features: plan.features,
            isActive: plan.isActive,
        });
        setOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPlan) {
            updateMutation.mutate({ id: editingPlan.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this plan?")) {
            deleteMutation.mutate(id);
        }
    };

    const addFeature = () => {
        if (featureInput.trim() && !formData.features.includes(featureInput.trim())) {
            setFormData({ ...formData, features: [...formData.features, featureInput.trim()] });
            setFeatureInput("");
        }
    };

    const removeFeature = (feature: string) => {
        setFormData({ ...formData, features: formData.features.filter(f => f !== feature) });
    };

    return (
        <>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold uppercase tracking-tight">Active Plans</h2>
                <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider" onClick={handleOpenAdd} data-testid="button-add-plan">
                    <Plus className="h-4 w-4" /> Add New Plan
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <IndianRupee className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No membership plans yet</p>
                    <p className="text-sm">Add your first plan to get started</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <Card
                            key={plan.id}
                            className="bg-card/50 backdrop-blur-sm border-t-4 border-t-primary"
                            data-testid={`card-plan-${plan.id}`}
                        >
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                                        <CardDescription className="text-accent font-medium mt-1">
                                            {plan.duration}
                                        </CardDescription>
                                    </div>
                                    <div className="text-2xl font-bold flex items-center">
                                        <IndianRupee className="h-5 w-5" /> {plan.price.toLocaleString()}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 mb-6">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary" /> {feature}
                                        </li>
                                    ))}
                                </ul>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1 gap-2" onClick={() => handleOpenEdit(plan)} data-testid={`button-edit-plan-${plan.id}`}>
                                        <Edit2 className="h-4 w-4" /> Edit
                                    </Button>
                                    <Button variant="destructive" size="icon" className="w-10" onClick={() => handleDelete(plan.id)} data-testid={`button-delete-plan-${plan.id}`}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
                <SheetContent className="sm:max-w-xl w-full bg-card border-l border-border overflow-y-auto">
                    <SheetHeader className="border-b border-border pb-6 mb-6">
                        <SheetTitle className="text-2xl font-bold font-heading text-primary uppercase tracking-tight">
                            {editingPlan ? "Edit Plan" : "Add New Plan"}
                        </SheetTitle>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Plan Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Yearly Elite"
                                className="bg-background border-border h-11"
                                required
                                data-testid="input-plan-name"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Duration <span className="text-destructive">*</span>
                                </Label>
                                <Select value={formData.durationMonths} onValueChange={(val) => setFormData({ ...formData, durationMonths: val })}>
                                    <SelectTrigger className="bg-background border-border h-11" data-testid="select-plan-duration">
                                        <SelectValue placeholder="Select duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {durationOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Price (₹) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="5000"
                                    className="bg-background border-border h-11"
                                    required
                                    data-testid="input-plan-price"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Features</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={featureInput}
                                    onChange={(e) => setFeatureInput(e.target.value)}
                                    placeholder="Add a feature..."
                                    className="bg-background border-border h-11"
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                                    data-testid="input-plan-feature"
                                />
                                <Button type="button" variant="outline" onClick={addFeature} data-testid="button-add-feature">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {formData.features.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {formData.features.map((feature, idx) => (
                                        <Badge key={idx} variant="secondary" className="px-3 py-1 gap-2">
                                            {feature}
                                            <button type="button" onClick={() => removeFeature(feature)} className="hover:text-destructive">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 pt-6 border-t border-border mt-8">
                            <Button
                                type="submit"
                                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-base shadow-lg shadow-primary/20"
                                disabled={createMutation.isPending || updateMutation.isPending}
                                data-testid="button-submit-plan"
                            >
                                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingPlan ? "Update Plan" : "Create Plan"}
                            </Button>
                            <SheetClose asChild>
                                <Button type="button" variant="outline" className="w-full h-12 border-border hover:bg-muted font-bold uppercase tracking-wider">
                                    Cancel
                                </Button>
                            </SheetClose>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </>
    );
};

export default Plans;
