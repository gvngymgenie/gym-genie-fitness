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
  Banknote,
  ChevronDown,
  ChevronRight,
  CreditCard as CreditCardIcon,
  UserCheck,
  Package,
  ShoppingBag,
  TrendingUp,
  Brain,
  UserCircle,
  Upload,
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
  "/salary": "salary",
};

const allSidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", permission: "dashboard" as const, roles: ["admin", "manager", "trainer", "staff"] as Role[] },
  { icon: UserPlus, label: "Leads", href: "/leads", permission: "leads" as const, roles: ["admin", "manager", "staff"] as Role[] },
  { icon: Users, label: "Members", href: "/members", permission: "members" as const, roles: ["admin", "manager", "trainer", "staff"] as Role[] },
  { icon: CalendarCheck, label: "Attendance", href: "/attendance", permission: "attendance" as const, roles: ["admin", "manager", "trainer", "staff"] as Role[] },
  { icon: Dumbbell, label: "Workouts & Diet", href: "/workouts", permission: "workouts" as const, roles: ["admin", "manager", "trainer"] as Role[] },
  { icon: CreditCard, label: "Payments", href: "/payments", permission: "payments" as const, roles: ["admin", "manager", "staff"] as Role[] },
  { icon: UserCog, label: "Personal Trainers", href: "/trainers", permission: "trainers" as const, roles: ["admin", "manager"] as Role[] },
  { icon: Banknote, label: "Trainer Salary", href: "/salary", permission: "salary" as const, roles: ["admin", "manager"] as Role[] },
  { icon: FileText, label: "Reports", href: "/reports", permission: "reports" as const, roles: ["admin", "manager"] as Role[] },
  { icon: Bell, label: "Notifications", href: "/notifications", permission: "notifications" as const, roles: ["admin", "manager", "trainer", "staff"] as Role[] },
  { icon: List, label: "Options", href: "/admin/options", permission: "options" as const, roles: ["admin"] as Role[] },
  // Admin sub-pages
   { icon: CreditCardIcon, label: "Membership Plans", href: "/admin/plans", permission: "admin-plans" as const, roles: ["admin"] as Role[], parent: "admin" as const },
   { icon: UserCheck, label: "Staff Management", href: "/admin/staff", permission: "admin-staff" as const, roles: ["admin"] as Role[], parent: "admin" as const },
   { icon: CalendarCheck, label: "Bookings", href: "/admin/bookings", permission: "admin-bookings" as const, roles: ["admin"] as Role[], parent: "admin" as const },
   { icon: Shield, label: "Roles & Permissions", href: "/admin/roles", permission: "admin-roles" as const, roles: ["admin"] as Role[], parent: "admin" as const },
   { icon: Package, label: "Inventory", href: "/admin/inventory", permission: "admin-inventory" as const, roles: ["admin"] as Role[], parent: "admin" as const },
   { icon: ShoppingBag, label: "Merchandise", href: "/admin/merchandise", permission: "admin-merchandise" as const, roles: ["admin"] as Role[], parent: "admin" as const },
   { icon: TrendingUp, label: "Revenue", href: "/admin/revenue", permission: "admin-revenue" as const, roles: ["admin"] as Role[], parent: "admin" as const },
   { icon: Brain, label: "AI Usage", href: "/admin/ai-usage", permission: "admin-ai-usage" as const, roles: ["admin"] as Role[], parent: "admin" as const },
   { icon: UserCircle, label: "Account Settings", href: "/admin/account", permission: "admin-account" as const, roles: ["admin"] as Role[], parent: "admin" as const },
   { icon: Upload, label: "Uploads", href: "/admin/uploads", permission: "admin-uploads" as const, roles: ["admin"] as Role[], parent: "admin" as const },
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
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const { user, logout, role, permissions, setPermissions, isModuleEnabled, companyName, companyLogo } = useAuth();

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

  // Auto-open admin menu when on admin pages
  useEffect(() => {
    if (location.startsWith("/admin")) {
      setAdminMenuOpen(true);
    }
  }, [location]);

  // Memoize sidebar items based on role, permissions, and enabled modules
  const sidebarItems = useMemo(() => {
    // Separate admin sub-pages from main items
    const mainItems = allSidebarItems.filter(item => !item.parent);
    const adminSubItems = allSidebarItems.filter(item => item.parent === "admin");

    // Filter main items by module control
    const filteredMainItems = mainItems.filter(item => {
      if (!isModuleEnabled(item.permission)) {
        return false;
      }
      return true;
    });

    // Filter admin sub-items by module control
    const filteredAdminSubItems = adminSubItems.filter(item => {
      return isModuleEnabled(item.permission);
    });

    if (role === "admin") {
      return { mainItems: filteredMainItems, adminSubItems: filteredAdminSubItems };
    }

    // For non-admin roles, filter by role and permissions
    const roleFilteredMainItems = filteredMainItems.filter(item => {
      if (!item.roles.includes(role as Role)) {
        return false;
      }
      if (permissions.length > 0) {
        return permissions.includes(item.permission);
      }
      return true;
    });

    const roleFilteredAdminSubItems = filteredAdminSubItems.filter(item => {
      if (!item.roles.includes(role as Role)) {
        return false;
      }
      if (permissions.length > 0) {
        return permissions.includes(item.permission);
      }
      return true;
    });

    return { mainItems: roleFilteredMainItems, adminSubItems: roleFilteredAdminSubItems };
  }, [role, permissions, isModuleEnabled]);

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
          <div
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2 cursor-pointer"
          >
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName || "Company Logo"}
                className="h-10 w-auto object-contain max-w-[180px]"
              />
            ) : <Dumbbell className="h-8 w-8 text-accent" />}
              <>
                
                <h1 className="text-2xl font-bold text-primary font-heading tracking-wider">
                  {companyName || "Lime Fitness"}
                </h1>
              </>
            
          </div>
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
            <>
              {/* Main sidebar items */}
              {sidebarItems.mainItems.map((item) => {
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
              })}

              {/* Admin collapsible menu */}
              {sidebarItems.adminSubItems.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all duration-200 cursor-pointer group text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent"
                  >
                    <Settings className="h-5 w-5 text-muted-foreground group-hover:text-accent" />
                    <span className="font-medium flex-1 text-left">Admin</span>
                    {adminMenuOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {adminMenuOpen && (
                    <div className="ml-6 mt-1 space-y-1 border-l-2 border-sidebar-border/50 pl-3">
                      {sidebarItems.adminSubItems.map((item) => {
                        const isActive = location === item.href || location.startsWith(item.href);
                        return (
                          <Link key={item.href} href={item.href}>
                            <div
                              className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer group text-sm",
                                isActive
                                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent",
                              )}
                            >
                              <item.icon
                                className={cn(
                                  "h-4 w-4",
                                  isActive
                                    ? "text-sidebar-primary-foreground"
                                    : "text-muted-foreground group-hover:text-accent",
                                )}
                              />
                              <span className="font-medium">{item.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
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
                <>
                  {/* Main sidebar items */}
                  {sidebarItems.mainItems.map((item) => {
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
                  })}

                  {/* Admin collapsible menu */}
                  {sidebarItems.adminSubItems.length > 0 && (
                    <div className="pt-2">
                      <button
                        onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all duration-200 cursor-pointer group text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent"
                      >
                        <Settings className="h-5 w-5 text-muted-foreground group-hover:text-accent" />
                        <span className="font-medium flex-1 text-left">Admin</span>
                        {adminMenuOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      {adminMenuOpen && (
                        <div className="ml-6 mt-1 space-y-1 border-l-2 border-sidebar-border/50 pl-3">
                          {sidebarItems.adminSubItems.map((item) => {
                            const isActive = location === item.href || location.startsWith(item.href);
                            return (
                              <Link key={item.href} href={item.href}>
                                <div
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={cn(
                                    "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer group text-sm",
                                    isActive
                                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent",
                                  )}
                                >
                                  <item.icon
                                    className={cn(
                                      "h-4 w-4",
                                      isActive
                                        ? "text-sidebar-primary-foreground"
                                        : "text-muted-foreground group-hover:text-accent",
                                    )}
                                  />
                                  <span className="font-medium">{item.label}</span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
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
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName || "Company Logo"}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <>
              <Dumbbell className="h-6 w-6 text-accent" />
              <span className="font-bold text-lg font-heading text-primary">
                {companyName || "Lime Fitness"}
              </span>
            </>
          )}
        </div>
        <div className="w-10" />
      </header>
    </>
  );
}
