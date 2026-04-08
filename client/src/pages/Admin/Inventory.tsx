import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, Loader2, Package } from "lucide-react";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InventoryItem } from "@shared/schema";

const categoryOptions = [
    "Electronic Equipment",
    "Manual Equipment",
    "Miscellaneous",
    "Accessories",
    "Supplements",
];

const InventoryList = () => {
    const [open, setOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        name: "",
        category: "Electronic Equipment",
        price: "",
        stock: "",
        purchaseDate: "",
        needsService: false,
        nextServiceDate: "",
    });

    const { data: inventory = [], isLoading } = useQuery<InventoryItem[]>({
        queryKey: ["/api/inventory"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await apiRequest("POST", "/api/inventory", {
                name: data.name,
                category: data.category,
                price: parseInt(data.price),
                stock: parseInt(data.stock) || 0,
                purchaseDate: data.purchaseDate || null,
                needsService: data.needsService,
                nextServiceDate: data.needsService ? data.nextServiceDate : null,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
            toast({ title: "Item added successfully" });
            resetForm();
            setOpen(false);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
            const res = await apiRequest("PATCH", `/api/inventory/${id}`, {
                name: data.name,
                category: data.category,
                price: parseInt(data.price),
                stock: parseInt(data.stock) || 0,
                purchaseDate: data.purchaseDate || null,
                needsService: data.needsService,
                nextServiceDate: data.needsService ? data.nextServiceDate : null,
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
            toast({ title: "Item updated successfully" });
            resetForm();
            setOpen(false);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/inventory/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
            toast({ title: "Item deleted successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const resetForm = () => {
        setFormData({
            name: "",
            category: "Electronic Equipment",
            price: "",
            stock: "",
            purchaseDate: "",
            needsService: false,
            nextServiceDate: "",
        });
        setEditingItem(null);
    };

    const handleOpenAdd = () => {
        resetForm();
        setOpen(true);
    };

    const handleOpenEdit = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            category: item.category,
            price: item.price.toString(),
            stock: item.stock.toString(),
            purchaseDate: item.purchaseDate || "",
            needsService: item.needsService,
            nextServiceDate: item.nextServiceDate || "",
        });
        setOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this item?")) {
            deleteMutation.mutate(id);
        }
    };

    const getStockStatus = (stock: number) => {
        if (stock > 10) return { label: "In Stock", class: "bg-green-100 text-green-800" };
        if (stock > 0) return { label: "Low Stock", class: "bg-yellow-100 text-yellow-800" };
        return { label: "Out of Stock", class: "bg-red-100 text-red-800" };
    };

    return (
        <>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold uppercase tracking-tight">Inventory Management</h2>
                <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider" onClick={handleOpenAdd} data-testid="button-add-inventory">
                    <Plus className="h-4 w-4" /> Add Item
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : inventory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No inventory items yet</p>
                    <p className="text-sm">Add your first item to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inventory.map((item) => {
                        const status = getStockStatus(item.stock);
                        return (
                            <Card key={item.id} className="overflow-hidden" data-testid={`card-inventory-${item.id}`}>
                                <CardHeader className="bg-muted/50 p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg">{item.name}</CardTitle>
                                            <CardDescription className="text-sm">{item.category}</CardDescription>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${status.class}`}>
                                            {status.label}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm text-muted-foreground">Price: ₹{item.price.toLocaleString()}</span>
                                        <span className="text-sm font-medium">Stock: {item.stock}</span>
                                    </div>
                                    {item.needsService && item.nextServiceDate && (
                                        <Badge variant="outline" className="mb-3">
                                            Next Service: {item.nextServiceDate}
                                        </Badge>
                                    )}
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="flex-1 gap-2" onClick={() => handleOpenEdit(item)} data-testid={`button-edit-inventory-${item.id}`}>
                                            <Edit2 className="h-4 w-4" /> Edit
                                        </Button>
                                        <Button variant="destructive" size="icon" className="w-10" onClick={() => handleDelete(item.id)} data-testid={`button-delete-inventory-${item.id}`}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
                <SheetContent className="sm:max-w-xl w-full bg-card border-l border-border overflow-y-auto">
                    <SheetHeader className="border-b border-border pb-6 mb-6">
                        <SheetTitle className="text-2xl font-bold font-heading text-primary uppercase tracking-tight">
                            {editingItem ? "Edit Item" : "Add New Item"}
                        </SheetTitle>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Item Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Treadmill"
                                className="bg-background border-border h-11"
                                required
                                data-testid="input-inventory-name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Category <span className="text-destructive">*</span>
                            </Label>
                            <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                                <SelectTrigger className="bg-background border-border h-11" data-testid="select-inventory-category">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryOptions.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Price (₹) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="20000"
                                    className="bg-background border-border h-11"
                                    required
                                    data-testid="input-inventory-price"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Stock Quantity
                                </Label>
                                <Input
                                    type="number"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                    placeholder="10"
                                    className="bg-background border-border h-11"
                                    data-testid="input-inventory-stock"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Purchase Date
                            </Label>
                            <Input
                                type="date"
                                value={formData.purchaseDate}
                                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                className="bg-background border-border h-11"
                                data-testid="input-inventory-purchase-date"
                            />
                        </div>

                        <div className="flex items-center justify-between py-4 border-t border-b border-border">
                            <div>
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Requires Service
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">Enable if this item needs regular maintenance</p>
                            </div>
                            <Switch
                                checked={formData.needsService}
                                onCheckedChange={(checked) => setFormData({ ...formData, needsService: checked })}
                                data-testid="switch-inventory-needs-service"
                            />
                        </div>

                        {formData.needsService && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Next Service Date
                                </Label>
                                <Input
                                    type="date"
                                    value={formData.nextServiceDate}
                                    onChange={(e) => setFormData({ ...formData, nextServiceDate: e.target.value })}
                                    className="bg-background border-border h-11"
                                    data-testid="input-inventory-next-service"
                                />
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-6 border-t border-border mt-8">
                            <Button
                                type="submit"
                                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-base shadow-lg shadow-primary/20"
                                disabled={createMutation.isPending || updateMutation.isPending}
                                data-testid="button-submit-inventory"
                            >
                                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingItem ? "Update Item" : "Add Item"}
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

export default InventoryList;
