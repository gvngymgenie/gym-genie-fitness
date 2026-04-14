import { Layout } from "./Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useRoute } from "wouter";
import { ReactNode, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

interface AdminLayoutProps {
  children: ReactNode;
}

// Admin tabs configuration - easy to add/remove tabs here
const adminTabs = [
  { value: "plans", label: "Membership Plans", href: "/admin/plans", modulePermission: "admin-plans", testId: undefined },
  { value: "staff", label: "Staff Management", href: "/admin/staff", modulePermission: "admin-staff", testId: undefined },
  { value: "roles", label: "Roles & Permissions", href: "/admin/roles", modulePermission: "admin-roles", testId: "tab-roles" },
  { value: "inventory", label: "Inventory", href: "/admin/inventory", modulePermission: "admin-inventory", testId: undefined },
  { value: "merchandise", label: "Merchandise", href: "/admin/merchandise", modulePermission: "admin-merchandise", testId: undefined },
  { value: "revenue", label: "Revenue", href: "/admin/revenue", modulePermission: "admin-revenue", testId: undefined },
  { value: "ai-usage", label: "AI Usage", href: "/admin/ai-usage", modulePermission: "admin-ai-usage", testId: undefined },
  { value: "uploads", label: "Uploads", href: "/admin/uploads", modulePermission: "admin-uploads", testId: undefined },
  { value: "account", label: "Account", href: "/admin/account", modulePermission: "admin-account", testId: "tab-account" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  // Fetch enabled modules from API
  const { data: moduleData } = useQuery<{ modules: Array<{ moduleName: string; enabled: boolean }> }>({
    queryKey: ["/api/module-control"],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Build set of enabled module permissions
  const enabledModules = useMemo(() => {
    if (!moduleData?.modules) return new Set<string>();
    return new Set(
      moduleData.modules.filter(m => m.enabled).map(m => m.moduleName)
    );
  }, [moduleData?.modules]);

  // Filter admin tabs based on enabled modules
  const visibleTabs = useMemo(() => {
    // If no modules loaded yet, show all tabs (fallback)
    if (enabledModules.size === 0) return adminTabs;
    return adminTabs.filter(tab => enabledModules.has(tab.modulePermission));
  }, [enabledModules]);

  // Determine active tab based on current route
  const activeTab = visibleTabs.find((tab) => {
    const [matches] = useRoute(tab.href);
    return matches;
  })?.value || visibleTabs[0]?.value || "plans";

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground">
            ADMINISTRATION
          </h1>
          <p className="text-muted-foreground">
            Manage subscription plans and gym staff.
          </p>
        </div>

        {visibleTabs.length > 0 ? (
          <Tabs value={activeTab} className="w-full">
            <TabsList className="bg-muted p-1 rounded-lg mb-8 flex-nowrap overflow-x-auto scrollbar-hide max-w-[1192px]">
              {visibleTabs.map((tab) => (
                <Link key={tab.value} href={tab.href}>
                  <TabsTrigger
                    value={tab.value}
                    className="px-4 lg:px-4 data-[state=active]:bg-background cursor-pointer whitespace-nowrap"
                    data-testid={tab.testId}
                  >
                    {tab.label}
                  </TabsTrigger>
                </Link>
              ))}
            </TabsList>

            <TabsContent
              value={activeTab}
              className="space-y-6 animate-in fade-in slide-in-from-bottom-2"
            >
              {children}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No admin modules are currently enabled.</p>
            <p className="text-sm mt-2">Use the Superadmin Terminal (Ctrl+Shift+M) to enable admin modules.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
