import { Layout } from "./Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useRoute } from "wouter";
import { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
}

// Admin tabs configuration - easy to add/remove tabs here
const adminTabs = [
  { value: "plans", label: "Membership Plans", href: "/admin/plans", testId: undefined },
  { value: "staff", label: "Staff Management", href: "/admin/staff", testId: undefined },
  { value: "roles", label: "Roles & Permissions", href: "/admin/roles", testId: "tab-roles" },
  { value: "inventory", label: "Inventory", href: "/admin/inventory", testId: undefined },
  { value: "merchandise", label: "Merchandise", href: "/admin/merchandise", testId: undefined },
  { value: "revenue", label: "Revenue", href: "/admin/revenue", testId: undefined },
  { value: "ai-usage", label: "AI Usage", href: "/admin/ai-usage", testId: undefined },
  { value: "uploads", label: "Uploads", href: "/admin/uploads", testId: undefined },
  { value: "account", label: "Account", href: "/admin/account", testId: "tab-account" },
] as const;

export function AdminLayout({ children }: AdminLayoutProps) {
  // Determine active tab based on current route
  const activeTab = adminTabs.find((tab) => {
    const [matches] = useRoute(tab.href);
    return matches;
  })?.value || "plans";

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

        <Tabs value={activeTab} className="w-full">
          <TabsList className="bg-muted p-1 rounded-lg mb-8 flex-nowrap overflow-x-auto scrollbar-hide max-w-[1192px]">
            {adminTabs.map((tab) => (
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
      </div>
    </Layout>
  );
}
