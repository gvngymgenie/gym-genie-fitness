import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import type { Member } from "@shared/schema";
import { RecentPayments } from "./tabs/RecentPayments";
import { SubscriptionStatus } from "./tabs/SubscriptionStatus";

export default function Payments() {
  const [activeTab, setActiveTab] = useState("recent");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground uppercase tracking-tight">PAYMENTS</h1>
          <p className="text-muted-foreground">Record and review member payments.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="recent" className="gap-2">
              Recent Payments
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2">
              Subscription Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent">
            <RecentPayments members={members} />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionStatus 
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
