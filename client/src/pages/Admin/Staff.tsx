import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
    Table,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, UserPlus, Loader2, KeyRound } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SafeUser } from "@shared/schema";

// Permission labels for display
const getPermissionLabel = (permission: string): string => {
    const labels: Record<string, string> = {
        dashboard: "Dashboard",
        leads: "Leads",
        members: "Members",
        workouts: "Workouts & Diet",
        attendance: "Attendance",
        payments: "Payments",
        admin: "Admin Settings",
        reports: "Reports",
        trainers: "Personal Trainers",
        notifications: "Notifications",
    };
    return labels[permission] || permission;
};

const Staff: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<SafeUser | null>(null);
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [rolePermissions, setRolePermissions] = useState<string[]>([]);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        username: "",
        password: "",
        role: "staff",
    });

    const { data: staffMembers = [], isLoading } = useQuery<SafeUser[]>({
        queryKey: ["/api/staff"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await apiRequest("POST", "/api/users", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
            toast({ title: "Staff member added successfully" });
            resetForm();
            setOpen(false);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
            const res = await apiRequest("PATCH", `/api/users/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
            toast({ title: "Staff member updated successfully" });
            resetForm();
            setOpen(false);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
            toast({ title: "Staff member deleted successfully" });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const resetForm = () => {
        setFormData({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            username: "",
            password: "",
            role: "staff",
        });
        setEditingStaff(null);
        setShowPasswordReset(false);
        setNewPassword("");
        setRolePermissions([]);
    };

    const handleOpenAdd = () => {
        resetForm();
        setOpen(true);
        // Fetch default permissions for "staff" role when adding
        fetchRolePermissions("staff");
    };

    const handleOpenEdit = (staff: SafeUser) => {
        setEditingStaff(staff);
        setFormData({
            firstName: staff.firstName,
            lastName: staff.lastName || "",
            email: staff.email,
            phone: staff.phone || "",
            username: staff.username,
            password: "",
            role: staff.role,
        });
        setOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingStaff) {
            const { password, ...updateData } = formData;
            const finalUpdateData: Partial<typeof formData> = { ...updateData };

            // Include new password if resetting
            if (showPasswordReset && newPassword.trim()) {
                finalUpdateData.password = newPassword.trim();
            }

            updateMutation.mutate({ id: editingStaff.id, data: finalUpdateData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this staff member?")) {
            deleteMutation.mutate(id);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "admin": return "bg-red-500/20 text-red-500 border-red-500/30";
            case "manager": return "bg-purple-500/20 text-purple-500 border-purple-500/30";
            case "trainer": return "bg-blue-500/20 text-blue-500 border-blue-500/30";
            case "staff": return "bg-green-500/20 text-green-500 border-green-500/30";
            default: return "bg-muted text-muted-foreground";
        }
    };

    // Fetch role permissions from API
    const fetchRolePermissions = async (role: string) => {
        try {
            const response = await fetch(`/api/roles/${role}/permissions`);
            if (response.ok) {
                const data = await response.json();
                setRolePermissions(data.permissions || []);
            } else {
                // Fallback to empty if API fails
                setRolePermissions([]);
            }
        } catch (error) {
            console.error("Failed to fetch role permissions:", error);
            setRolePermissions([]);
        }
    };

    // Fetch permissions when editing a staff member
    useEffect(() => {
        if (editingStaff) {
            fetchRolePermissions(editingStaff.role);
        }
    }, [editingStaff]);

    return (
        <>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold uppercase tracking-tight">Staff Directory</h2>
                <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider shadow-lg shadow-primary/20" onClick={handleOpenAdd} data-testid="button-add-staff">
                    <UserPlus className="h-4 w-4" /> Add Staff Member
                </Button>
            </div>

            <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : staffMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <UserPlus className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">No staff members yet</p>
                        <p className="text-sm">Add your first staff member to get started</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[250px] uppercase text-[10px] font-black tracking-widest">Name</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest">Email</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest">Role</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest">Phone</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest">Status</TableHead>
                                <TableHead className="text-right w-[150px] uppercase text-[10px] font-black tracking-widest">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staffMembers.map((s) => (
                                <TableRow key={s.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-staff-${s.id}`}>
                                    <TableCell className="font-bold flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-primary font-black uppercase shadow-sm">
                                            {s.firstName?.charAt(0) || "?"}{s.lastName?.charAt(0) || ""}
                                        </div>
                                        <div>
                                            <p className="font-bold tracking-tight">{s.firstName} {s.lastName}</p>
                                            <p className="text-xs text-muted-foreground">@{s.username}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">{s.email}</TableCell>
                                    <TableCell>
                                        <Badge className={`${getRoleBadgeColor(s.role)} border font-bold uppercase text-[10px] tracking-wider`}>
                                            {s.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm font-mono">{s.phone || "-"}</TableCell>
                                    <TableCell>
                                        <Badge className={s.isActive ? "bg-green-500/20 text-green-500 border-green-500/30 border" : "bg-red-500/20 text-red-500 border-red-500/30 border"}>
                                            {s.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-1 justify-end">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(s)} data-testid={`button-edit-staff-${s.id}`}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(s.id)} data-testid={`button-delete-staff-${s.id}`}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Add/Edit Staff Side Drawer */}
            <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
                <SheetContent className="sm:max-w-xl w-full bg-card border-l border-border overflow-y-auto">
                    <SheetHeader className="border-b border-border pb-6 mb-6">
                        <SheetTitle className="text-2xl font-bold font-heading text-primary uppercase tracking-tight">
                            {editingStaff ? "Edit" + " " + editingStaff.role : "Add Staff Member"}
                        </SheetTitle>
                    </SheetHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    First Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    placeholder="John"
                                    className="bg-background border-border h-11"
                                    required
                                    data-testid="input-staff-firstName"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Name</Label>
                                <Input
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    placeholder="Doe"
                                    className="bg-background border-border h-11"
                                    data-testid="input-staff-lastName"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    Email <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@gym.com"
                                    className="bg-background border-border h-11"
                                    required
                                    data-testid="input-staff-email"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="9999999999"
                                    className="bg-background border-border h-11"
                                    data-testid="input-staff-phone"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    Username <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="johndoe"
                                    className="bg-background border-border h-11"
                                    required
                                    disabled={!!editingStaff}
                                    data-testid="input-staff-username"
                                />
                            </div>

                            {!editingStaff && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                        Password <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="••••••••"
                                        className="bg-background border-border h-11"
                                        required={!editingStaff}
                                        data-testid="input-staff-password"
                                    />
                                </div>
                            )}

                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                    Role <span className="text-destructive">*</span>
                                </Label>
                                <Select value={formData.role} onValueChange={(val) => {
                                    setFormData({ ...formData, role: val });
                                    fetchRolePermissions(val);
                                }} required>
                                    <SelectTrigger className="bg-background border-border h-11">
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="trainer">Trainer</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Dynamic Role Permissions from Database */}
                        <div className="p-4 rounded-lg bg-muted/50 border border-border">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Role Permissions</h4>
                            {rolePermissions.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {rolePermissions.map((permission) => (
                                        <Badge 
                                            key={permission} 
                                            className={`${getRoleBadgeColor(formData.role)} border font-bold uppercase text-[10px] tracking-wider`}
                                        >
                                            {getPermissionLabel(permission)}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm space-y-1">
                                    {formData.role === "admin" && <p className="text-primary">Full access to all pages and settings</p>}
                                    {formData.role === "manager" && <p className="text-purple-500">Access to Dashboard, Leads, Members, Workouts, Attendance, Payments, Reports, Trainers, Notifications</p>}
                                    {formData.role === "trainer" && <p className="text-blue-500">Access to Dashboard, Members, Workouts, Attendance</p>}
                                    {formData.role === "staff" && <p className="text-green-500">Access to Dashboard, Leads, Members, Attendance</p>}
                                </div>
                            )}
                        </div>

                        {editingStaff && (
                            <div className="space-y-4">
                                {!showPasswordReset ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-11 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 font-bold uppercase tracking-wider text-sm"
                                        onClick={() => setShowPasswordReset(true)}
                                        data-testid="button-reset-password"
                                    >
                                        <KeyRound className="h-4 w-4 mr-2" />
                                        Reset Password
                                    </Button>
                                ) : (
                                    <div className="space-y-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold uppercase tracking-wider text-orange-800 dark:text-orange-200">
                                                Reset Password
                                            </h4>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800 hover:bg-orange-100"
                                                onClick={() => {
                                                    setShowPasswordReset(false);
                                                    setNewPassword("");
                                                }}
                                            >
                                                ✕
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                                New Password <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Enter new password"
                                                className="bg-background border-border h-11"
                                                required={showPasswordReset}
                                                minLength={6}
                                                data-testid="input-new-password"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Password must be at least 6 characters long
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-6 border-t border-border mt-8">
                            <Button
                                type="submit"
                                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-base shadow-lg shadow-primary/20"
                                disabled={createMutation.isPending || updateMutation.isPending}
                                data-testid="button-submit-staff"
                            >
                                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingStaff ? "Update Staff Member" : "Add Staff Member"}
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

export default Staff;
