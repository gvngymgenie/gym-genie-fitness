import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useLocation } from "wouter";
import type { SafeUser, Role, Member } from "@shared/schema";

interface AuthContextType {
  user: SafeUser | null;
  member: Member | null;
  role: Role | null;
  permissions: string[];
  enabledModules: string[];
  isAuthenticated: boolean;
  isMemberAuthenticated: boolean;
  isLoading: boolean;
  login: (user: SafeUser) => void;
  loginMember: (member: Member) => void;
  logout: () => void;
  logoutMember: () => void;
  hasPermission: (route: string) => boolean;
  canAccessRoute: (route: string) => boolean;
  refreshPermissions: () => Promise<void>;
  setPermissions: (permissions: string[]) => void;
  isModuleEnabled: (moduleName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Route to permission mapping - maps routes to page identifiers
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
  "/member": "dashboard", // Members get dashboard permission
};

const routePermissions: Record<string, Role[]> = {
  "/dashboard": ["admin", "manager", "trainer", "staff"],
  "/leads": ["admin", "manager", "staff"],
  "/members": ["admin", "manager", "trainer", "staff"],
  "/workouts": ["admin", "manager", "trainer"],
  "/attendance": ["admin", "manager", "trainer", "staff"],
  "/payments": ["admin", "manager", "staff"],
  "/admin": ["admin"],
  "/reports": ["admin", "manager"],
  "/trainers": ["admin", "manager"],
  "/notifications": ["admin", "manager", "trainer", "staff"],
  "/member": ["member"],
  "/member/payments": ["member"],
  "/member/workouts": ["member"],
  "/member/health": ["member"],
  "/member/trainers": ["member"],
  "/member/notifications": ["member"],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();

  // Fetch permissions from API
  const fetchPermissions = useCallback(async (userRole: string) => {
    try {
      const response = await fetch(`/api/roles/${userRole}/permissions`);
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      } else {
        // Fallback to static permissions
        setPermissions(getStaticPermissions(userRole));
      }
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
      // Fallback to static permissions
      setPermissions(getStaticPermissions(userRole));
    }
  }, []);

  // Fetch enabled modules
  const fetchEnabledModules = useCallback(async () => {
    try {
      const response = await fetch("/api/module-control/enabled");
      if (response.ok) {
        const data = await response.json();
        setEnabledModules(data.enabledModules || []);
      }
    } catch (error) {
      console.error("Failed to fetch enabled modules:", error);
      // Default to all enabled if API fails
      setEnabledModules([
        "dashboard", "leads", "members", "workouts", "attendance", 
        "payments", "trainers", "salary", "reports", "notifications", "admin", "options"
      ]);
    }
  }, []);

  // Static permission fallback
  const getStaticPermissions = (role: string): string[] => {
    const staticDefaults: Record<string, string[]> = {
      admin: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "admin", "reports", "trainers", "notifications"],
      manager: ["dashboard", "leads", "members", "workouts", "attendance", "payments", "reports", "trainers", "notifications"],
      trainer: ["dashboard", "members", "workouts", "attendance"],
      staff: ["dashboard", "leads", "members", "attendance"],
      member: ["dashboard"],
    };
    return staticDefaults[role] || [];
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchPermissions(parsedUser.role);
      } catch (e) {
        localStorage.removeItem("authUser");
      }
    }
    const storedMember = localStorage.getItem("memberAuth");
    if (storedMember) {
      try {
        setMember(JSON.parse(storedMember));
      } catch (e) {
        localStorage.removeItem("memberAuth");
      }
    }
    // Always fetch enabled modules
    fetchEnabledModules();
    setIsLoading(false);
  }, [fetchPermissions, fetchEnabledModules]);

  const refreshPermissions = async () => {
    if (user) {
      await fetchPermissions(user.role);
    }
  };

  const login = (userData: SafeUser) => {
    setUser(userData);
    localStorage.setItem("authUser", JSON.stringify(userData));
    fetchPermissions(userData.role);
  };

  const loginMember = (memberData: Member) => {
    setMember(memberData);
    localStorage.setItem("memberAuth", JSON.stringify(memberData));
    // Members have static permissions
    setPermissions(getStaticPermissions("member"));
  };

  const logout = () => {
    setUser(null);
    setPermissions([]);
    localStorage.removeItem("authUser");
    navigate("/login");
  };

  const logoutMember = () => {
    setMember(null);
    setPermissions([]);
    localStorage.removeItem("memberAuth");
    navigate("/member/login");
  };

  const hasPermission = useCallback((route: string): boolean => {
    // Public routes are always accessible
    if (route === "/login" || route === "/" || route === "/member/login") return true;

    // Member routes check member authentication
    if (route.startsWith("/member")) {
      if (!member) return false;
      // Members have "dashboard" permission by default
      const permission = routeToPermissionMap[route] || "dashboard";
      return permissions.includes(permission) || permissions.includes("dashboard");
    }

    // Staff routes check user authentication and permissions
    if (!user) return false;

    // First check if the role is allowed for this route (basic role check)
    const allowedRoles = routePermissions[route];
    if (!allowedRoles) return true; // Unknown routes are accessible
    if (!allowedRoles.includes(user.role as Role)) return false;

    // Then check specific permissions
    const permission = routeToPermissionMap[route];
    if (!permission) return true; // If no specific permission, allow based on role

    return permissions.includes(permission);
  }, [user, member, permissions]);

  const canAccessRoute = useCallback((route: string): boolean => {
    if (route === "/login" || route === "/" || route === "/member/login") return true;
    if (route.startsWith("/member")) {
      return !!member;
    }
    return hasPermission(route);
  }, [member, hasPermission]);

  const isModuleEnabled = useCallback((moduleName: string): boolean => {
    return enabledModules.includes(moduleName);
  }, [enabledModules]);

  const value: AuthContextType = {
    user,
    member,
    role: (user?.role || member ? (user?.role as Role) || "member" : null) as Role | null,
    permissions,
    enabledModules,
    isAuthenticated: !!user,
    isMemberAuthenticated: !!member,
    isLoading,
    login,
    loginMember,
    logout,
    logoutMember,
    hasPermission,
    canAccessRoute,
    refreshPermissions,
    setPermissions,
    isModuleEnabled,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Role[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  redirectTo = "/login" 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, hasPermission } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectTo);
    } else if (!isLoading && isAuthenticated && allowedRoles) {
      if (!allowedRoles.includes(user?.role as Role)) {
        // Check if user has any allowed permission
        const hasAnyPermission = allowedRoles.some(role => {
          // Find routes that would be accessible by this role
          const routesForRole = Object.entries(routePermissions)
            .filter(([, roles]) => roles.includes(role))
            .map(([route]) => route);
          
          return routesForRole.some(route => hasPermission(route));
        });

        if (!hasAnyPermission) {
          navigate("/dashboard");
        }
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, navigate, redirectTo, hasPermission]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role as Role)) {
    return null;
  }

  return <>{children}</>;
}

export function getNavItemsForRole(role: Role | null, userPermissions: string[]): string[] {
  if (!role) return [];
  
  const allRoutes = [
    "/dashboard",
    "/leads", 
    "/members",
    "/workouts",
    "/attendance",
    "/payments",
    "/admin",
    "/reports",
    "/trainers",
    "/notifications",
  ];
  
  // Filter routes based on static role permissions
  const routesForRole = allRoutes.filter(route => {
    const allowedRoles = routePermissions[route];
    return allowedRoles?.includes(role);
  });

  // Further filter based on dynamic permissions if user permissions are loaded
  if (userPermissions.length > 0 && role !== "admin") {
    return routesForRole.filter(route => {
      const permission = routeToPermissionMap[route];
      if (!permission) return true;
      return userPermissions.includes(permission);
    });
  }

  return routesForRole;
}
