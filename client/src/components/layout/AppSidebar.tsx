import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarCheck,
  Dumbbell,
  CreditCard,
  Settings,
  FileText,
  UserCog,
  LogOut,
  Bell,
  Menu,
  X,
  Shield,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@shared/schema";

// Route to permission mapping
const routeToPermissionMap: Record<string, string> = {
  "/dashboard": "dashboard",
  "/leads": "leads",
  "/members": "members",
  "/workouts": "workouts",
  "/attendance": "attendance",
  "/payments": "payments",
  "/admin": "admin",
  "/reports": "reports",
  "/trainers": "trainers",
  "/notifications": "notifications",
};

const allSidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", permission: "dashboard" as const, roles: ["admin", "manager", "trainer", "staff"] as Role[] },
  { icon: UserPlus, label: "Leads", href: "/leads", permission: "leads" as const, roles: ["admin", "manager", "staff"] as Role[] },
  { icon: Users, label: "Members", href: "/members", permission: "members" as const, roles: ["admin", "manager", "trainer", "staff"] as Role[] },
  { icon: CalendarCheck, label: "Attendance", href: "/attendance", permission: "attendance" as const, roles: ["admin", "manager", "trainer", "staff"] as Role[] },
  { icon: Dumbbell, label: "Workouts & Diet", href: "/workouts", permission: "workouts" as const, roles: ["admin", "manager", "trainer"] as Role[] },
  { icon: CreditCard, label: "Payments", href: "/payments", permission: "payments" as const, roles: ["admin", "manager", "staff"] as Role[] },
  { icon: UserCog, label: "Personal Trainers", href: "/trainers", permission: "trainers" as const, roles: ["admin", "manager"] as Role[] },
  { icon: FileText, label: "Reports", href: "/reports", permission: "reports" as const, roles: ["admin", "manager"] as Role[] },
  { icon: Bell, label: "Notifications", href: "/notifications", permission: "notifications" as const, roles: ["admin", "manager", "trainer", "staff"] as Role[] },
  { icon: Settings, label: "Admin", href: "/admin/plans", permission: "admin" as const, roles: ["admin"] as Role[] },
  { icon: List, label: "Options", href: "/admin/options", permission: "admin" as const, roles: ["admin"] as Role[] },
];

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "admin": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "manager": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "trainer": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "staff": return "bg-green-500/20 text-green-400 border-green-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

export function AppSidebar() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, role, permissions, setPermissions } = useAuth();
  
  // Fetch fresh permissions from API only for non-admin roles
  useEffect(() => {
    const fetchFreshPermissions = async () => {
      if (user?.role && user.role !== "admin") {
        try {
          const response = await fetch(`/api/roles/${user.role}/permissions`);
          if (response.ok) {
            const data = await response.json();
            setPermissions(data.permissions || []);
          }
        } catch (error) {
          console.error("Failed to fetch permissions:", error);
        }
      }
    };

    fetchFreshPermissions();
  }, [user?.role, setPermissions]);

  // Memoize sidebar items based on role and permissions
  const sidebarItems = useMemo(() => {
    // Admin always has full access - bypass all permission checks
    if (role === "admin") {
      return allSidebarItems;
    }
    
    // For non-admin roles, filter by role and permissions
    return allSidebarItems.filter(item => {
      // First check if user's role is allowed for this item
      if (!item.roles.includes(role as Role)) {
        return false;
      }
      
      // Check if user has the specific permission
      if (permissions.length > 0) {
        return permissions.includes(item.permission);
      }
      
      // If no permissions loaded yet, allow based on role only
      return true;
    });
  }, [role, permissions]);

  const handleLogout = () => {
    logout();
  };

  // Show loading state if permissions not loaded for non-admin
  const isLoading = role !== "admin" && permissions.length === 0;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen fixed left-0 top-0 z-40 hidden md:flex">
        <div className="p-6">
          <h1
            onClick={() => (window.location.href = "/")}
            className="text-2xl font-bold text-primary font-heading tracking-wider flex items-center gap-2 cursor-pointer"
          >
            <Dumbbell className="h-8 w-8 text-accent" />
            Lime Fitness
          </h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">
            Gym Management System
          </p>
        </div>

        {user && (
          <div className="px-4 pb-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/30">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-primary font-black uppercase">
                {user.firstName?.charAt(0) || "?"}{user.lastName?.charAt(0) || ""}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{user.firstName} {user.lastName}</p>
                <Badge className={`${getRoleBadgeColor(user.role)} border text-[10px] font-bold uppercase tracking-wider mt-1`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {user.role}
                </Badge>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            sidebarItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer group",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent",
                    )}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5",
                        isActive
                          ? "text-sidebar-primary-foreground"
                          : "text-muted-foreground group-hover:text-accent",
                      )}
                    />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-colors cursor-pointer"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Mobile Menu */}
          <aside className="fixed left-0 top-16 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-40 md:hidden shadow-2xl">
            {user && (
              <div className="px-4 py-4 border-b border-sidebar-border">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent/30">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-primary font-black uppercase">
                    {user.firstName?.charAt(0) || "?"}{user.lastName?.charAt(0) || ""}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{user.firstName} {user.lastName}</p>
                    <Badge className={`${getRoleBadgeColor(user.role)} border text-[10px] font-bold uppercase tracking-wider mt-1`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {user.role}
                      </Badge>
                  </div>
                </div>
              </div>
            )}
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                sidebarItems.map((item) => {
                  const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}>
                      <div
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer group",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5",
                            isActive
                              ? "text-sidebar-primary-foreground"
                              : "text-muted-foreground group-hover:text-accent",
                          )}
                        />
                        <span className="font-medium">{item.label}</span>
                      </div>
                    </Link>
                  );
                })
              )}
            </nav>

            <div className="p-4 border-t border-sidebar-border">
              <button
                className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-colors cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Mobile Header */}
      <header className="md:hidden h-16 border-b border-border bg-background flex items-center px-4 justify-between sticky top-0 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-accent" />
          ) : (
            <Menu className="h-6 w-6 text-foreground" />
          )}
        </button>
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-accent" />
          <span className="font-bold text-lg font-heading text-primary">
            Lime Fitness
          </span>
        </div>
        <div className="w-10" />
      </header>
    </>
  );
}
