import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Users, UserCog, Dumbbell, ClipboardList, LayoutDashboard, UserPlus, CalendarCheck, FileText, Bell, Settings, Save, Loader2, List, Banknote, CreditCard } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Role } from "@shared/schema";

const allPages = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Main overview and statistics" },
    { id: "leads", label: "Leads", icon: UserPlus, description: "Lead management and follow-ups" },
    { id: "members", label: "Members", icon: Users, description: "Member profiles and management" },
    { id: "attendance", label: "Attendance", icon: CalendarCheck, description: "Check-in/out tracking" },
    { id: "workouts", label: "Workouts & Diet", icon: Dumbbell, description: "Workout plans and diet management" },
    { id: "payments", label: "Payments", icon: CreditCard, description: "Member payment management" },
    { id: "trainers", label: "Personal Trainers", icon: UserCog, description: "Trainer assignments and schedules" },
    { id: "salary", label: "Trainer Salary", icon: Banknote, description: "Trainer salary and payslip management" },
    { id: "reports", label: "Reports", icon: FileText, description: "Analytics and reporting" },
    { id: "notifications", label: "Notifications", icon: Bell, description: "System notifications" },
    { id: "admin", label: "Admin Settings", icon: Settings, description: "Full administrative access" },
    { id: "options", label: "Options", icon: List, description: "System options and configurations" },
];

const roleDetails: Record<Role, { color: string; description: string; icon: React.ElementType }> = {
    admin: { color: "bg-red-500/20 text-red-500 border-red-500/30", description: "Full system access with all permissions", icon: Shield },
    manager: { color: "bg-purple-500/20 text-purple-500 border-purple-500/30", description: "Manages daily operations and staff", icon: UserCog },
    trainer: { color: "bg-blue-500/20 text-blue-500 border-blue-500/30", description: "Handles member workouts and training", icon: Dumbbell },
    staff: { color: "bg-green-500/20 text-green-500 border-green-500/30", description: "Front desk and member assistance", icon: ClipboardList },
    member: { color: "bg-orange-500/20 text-orange-500 border-orange-500/30", description: "Gym member with limited access", icon: Users },
};

const defaultPermissions: Record<Role, string[]> = {
    admin: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "admin", "reports", "trainers", "salary", "notifications", "options"],
    manager: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "reports", "trainers", "salary", "notifications"],
    trainer: ["dashboard", "members", "workouts", "attendance"],
    staff: ["dashboard", "leads", "members", "attendance", "payments"],
    member: ["dashboard"],
};

const Roles: React.FC = () => {
    const [permissions, setPermissions] = useState<Record<Role, string[]>>(defaultPermissions);
    const [selectedRole, setSelectedRole] = useState<Role>("admin");
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    // Fetch permissions from API
    const fetchPermissions = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/roles");
            if (response.ok) {
                const data = await response.json();
                if (data.roles && Array.isArray(data.roles)) {
                    const newPermissions: Record<Role, string[]> = { ...defaultPermissions };
                    data.roles.forEach((roleData: { role: Role; permissions: string[] }) => {
                        newPermissions[roleData.role] = roleData.permissions || [];
                    });
                    setPermissions(newPermissions);
                }
            }
        } catch (error) {
            console.error("Failed to fetch permissions:", error);
            toast({
                title: "Error",
                description: "Failed to load permissions. Using defaults.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    const togglePermission = (pageId: string) => {
        setPermissions(prev => {
            const currentPermissions = prev[selectedRole];
            const newPermissions = currentPermissions.includes(pageId)
                ? currentPermissions.filter(p => p !== pageId)
                : [...currentPermissions, pageId];
            return { ...prev, [selectedRole]: newPermissions };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(`/api/roles/${selectedRole}/permissions`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    permissions: permissions[selectedRole],
                }),
            });

            if (response.ok) {
                toast({
                    title: "Permissions Updated",
                    description: `${selectedRole} role permissions have been saved successfully.`,
                });
            } else {
                throw new Error("Failed to save permissions");
            }
        } catch (error) {
            console.error("Failed to save permissions:", error);
            toast({
                title: "Error",
                description: "Failed to save permissions. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const resetToDefault = () => {
        setPermissions(prev => ({ ...prev, [selectedRole]: defaultPermissions[selectedRole] }));
        toast({
            title: "Reset Complete",
            description: `${selectedRole} permissions reset to default. Click Save to apply.`,
        });
    };

    const roleInfo = roleDetails[selectedRole];
    const RoleIcon = roleInfo.icon;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold uppercase tracking-tight">Role Management</h2>
                    <p className="text-muted-foreground text-sm mt-1">Configure page access permissions for each role</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Select Role</h3>
                    {(Object.keys(roleDetails) as Role[]).map((role) => {
                        const info = roleDetails[role];
                        const Icon = info.icon;
                        const isSelected = selectedRole === role;
                        return (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                className={`w-full p-4 rounded-lg border transition-all text-left ${
                                    isSelected
                                        ? "bg-primary/10 border-primary shadow-lg shadow-primary/10"
                                        : "bg-card/50 border-border hover:bg-muted/50"
                                }`}
                                data-testid={`button-role-${role}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${info.color} border`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className={`font-bold uppercase tracking-wider text-sm ${isSelected ? "text-primary" : ""}`}>
                                            {role}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {permissions[role].length} pages
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="lg:col-span-3">
                    <Card className="bg-card/50 border-border">
                        <CardHeader className="border-b border-border">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg ${roleInfo.color} border`}>
                                        <RoleIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl uppercase tracking-wider">{selectedRole} Role</CardTitle>
                                        <CardDescription>{roleInfo.description}</CardDescription>
                                    </div>
                                </div>
                                <Badge className={`${roleInfo.color} border font-bold uppercase text-xs tracking-wider`}>
                                    {permissions[selectedRole].length} / {allPages.length} pages
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {allPages.map((page) => {
                                    const hasAccess = permissions[selectedRole].includes(page.id);
                                    const PageIcon = page.icon;
                                    const isAdmin = selectedRole === "admin" && page.id === "admin";
                                    
                                    return (
                                        <div
                                            key={page.id}
                                            className={`flex items-center justify-between p-4 rounded-lg border transition-all ${
                                                hasAccess
                                                    ? "bg-primary/5 border-primary/30"
                                                    : "bg-muted/30 border-border"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${hasAccess ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                                                    <PageIcon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <Label className={`font-semibold ${hasAccess ? "text-foreground" : "text-muted-foreground"}`}>
                                                        {page.label}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground">{page.description}</p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={hasAccess}
                                                onCheckedChange={() => togglePermission(page.id)}
                                                disabled={isAdmin}
                                                data-testid={`switch-${selectedRole}-${page.id}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex gap-3 mt-6 pt-6 border-t border-border">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider"
                                    data-testid="button-save-permissions"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Changes
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={resetToDefault}
                                    className="border-border hover:bg-muted font-bold uppercase tracking-wider"
                                    data-testid="button-reset-permissions"
                                >
                                    Reset to Default
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Roles;
