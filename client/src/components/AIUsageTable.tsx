import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Filter,
  Download,
  Brain,
  Dumbbell,
  Utensils,
  TrendingUp,
  Calendar,
  Eye,
  Users,
  CreditCard,
  Loader2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AdminLayout } from "./layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
 
// Types for AI Usage data
interface MemberAIUsage {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  memberAvatar?: string;
  totalWorkoutGenerations: number;
  totalDietGenerations: number;
  totalCreditsUsed: number;
  creditBalance: number;
  lastUsageAt: string;
}

interface AIRequest {
  id: string;
  date: string;
  type: "workout" | "diet";
  description: string;
  credits: number;
  status: "success" | "failed";
}

interface AdminAIUsage {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  featureType: string;
  actionDescription: string;
  creditsUsed: number;
  success: boolean;
  createdAt: string;
}

interface AIUsageTableProps {
  type?: "members" | "admins" | "both";
}

export function AIUsageTable({ type = "both" }: AIUsageTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(type === "admins" ? "admins" : "members");
  const [selectedMember, setSelectedMember] = useState<MemberAIUsage | null>(null);

  // Fetch members with AI usage from API
  const { data: memberDataResponse = {}, isLoading: membersLoading } = useQuery({
    queryKey: ["/api/ai-usage/members"],
    queryFn: async () => {
      const res = await fetch("/api/ai-usage/members");
      if (!res.ok) throw new Error("Failed to fetch member AI usage");
      return res.json();
    },
  });

  // Extract the array of members from the response
  const memberData = memberDataResponse.data || [];

  // Fetch admin/staff AI usage from API
  const { data: adminData = [], isLoading: adminsLoading } = useQuery<AdminAIUsage[]>({
    queryKey: ["/api/ai-usage/admins"],
    queryFn: async () => {
      const res = await fetch("/api/ai-usage/admins");
      if (!res.ok) throw new Error("Failed to fetch admin AI usage");
      return res.json();
    },
  });

  // Fetch member history when modal is opened
  const { data: memberHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/ai-usage/members", selectedMember?.memberId, "history"],
    queryFn: async () => {
      if (!selectedMember?.memberId) return null;
      const res = await fetch(`/api/ai-usage/members/${selectedMember.memberId}/history`);
      if (!res.ok) throw new Error("Failed to fetch member history");
      return res.json();
    },
    enabled: !!selectedMember?.memberId,
  });

  // Filter based on search
  const filteredMemberUsage = memberData.filter(member =>
    member.memberName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.memberEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAdminUsage = adminData.filter(admin =>
    admin.adminName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.adminEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get request history from API response
  const getMemberRequestHistory = (): AIRequest[] => {
    return (memberHistory?.requests || []) as AIRequest[];
  };

  const getFeatureBadge = (featureType: string) => {
    switch (featureType) {
      case "workout_generation":
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><Dumbbell className="h-3 w-3 mr-1" />Workout</Badge>;
      case "diet_generation":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><Utensils className="h-3 w-3 mr-1" />Diet</Badge>;
      case "analysis":
        return <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30"><TrendingUp className="h-3 w-3 mr-1" />Analysis</Badge>;
      case "reports":
        return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30"><Brain className="h-3 w-3 mr-1" />Reports</Badge>;
      default:
        return <Badge variant="outline">{featureType}</Badge>;
    }
  };

  const getStatusBadge = (success: boolean) => {
    return success ? (
      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Success</Badge>
    ) : (
      <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Failed</Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 pb-2">
              <Brain className="h-5 w-5" />
              AI Usage Tracking
            </CardTitle>
            <CardDescription>
              Track AI credit usage for members and admins
            </CardDescription>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Loading State */}
        {(membersLoading || adminsLoading) && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading AI usage data...</span>
          </div>
        )}

        {/* Search and Filters */}
        {!membersLoading && !adminsLoading && (
          <>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" /> Filter
                </Button>
              </div>
              </div>
            </>
            )}

        {/* Tabs */}
        {type === "both" && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-muted p-1 rounded-lg mb-6">
              <TabsTrigger value="members" className="px-6 data-[state=active]:bg-background">
                <Users className="h-4 w-4 mr-2" />
                Members
              </TabsTrigger>
              <TabsTrigger value="admins" className="px-6 data-[state=active]:bg-background">
                <Brain className="h-4 w-4 mr-2" />
                Admins
              </TabsTrigger>
            </TabsList>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Member</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workouts</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Diet Plans</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Credits</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Balance</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Used</TableHead>
                      <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMemberUsage.map((member) => (
                      <TableRow key={member.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.memberAvatar} alt={member.memberName} />
                              <AvatarFallback>
                                {member.memberName.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.memberName}</div>
                              <div className="text-xs text-muted-foreground">{member.memberEmail}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dumbbell className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{member.totalWorkoutGenerations}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Utensils className="h-4 w-4 text-green-500" />
                            <span className="font-medium">{member.totalDietGenerations}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-primary">{member.totalCreditsUsed}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            <CreditCard className="h-3 w-3 mr-1" />
                            {member.creditBalance} credits
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {member.lastUsageAt}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => setSelectedMember(member)}>
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Admins Tab */}
            <TabsContent value="admins" className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Feature</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Action</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Credits</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdminUsage.map((admin) => (
                      <TableRow key={admin.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 bg-primary/20">
                              <AvatarFallback className="text-primary font-bold">
                                {admin.adminName.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{admin.adminName}</div>
                              <div className="text-xs text-muted-foreground">{admin.adminEmail}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getFeatureBadge(admin.featureType)}</TableCell>
                        <TableCell>
                          <span className="text-sm">{admin.actionDescription}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-primary">{admin.creditsUsed}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(admin.success)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{admin.createdAt}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Single type rendering */}
        {type === "members" && (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Member</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Workouts</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Diet Plans</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Credits</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Balance</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Used</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMemberUsage.map((member) => (
                  <TableRow key={member.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.memberAvatar} alt={member.memberName} />
                          <AvatarFallback>
                            {member.memberName.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.memberName}</div>
                          <div className="text-xs text-muted-foreground">{member.memberEmail}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{member.totalWorkoutGenerations}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-green-500" />
                        <span className="font-medium">{member.totalDietGenerations}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-primary">{member.totalCreditsUsed}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                        <CreditCard className="h-3 w-3 mr-1" />
                        {member.creditBalance} credits
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {member.lastUsageAt}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => setSelectedMember(member)}>
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {type === "admins" && (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Feature</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Action</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Credits</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdminUsage.map((admin) => (
                  <TableRow key={admin.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 bg-primary/20">
                          <AvatarFallback className="text-primary font-bold">
                            {admin.adminName.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{admin.adminName}</div>
                          <div className="text-xs text-muted-foreground">{admin.adminEmail}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getFeatureBadge(admin.featureType)}</TableCell>
                    <TableCell>
                      <span className="text-sm">{admin.actionDescription}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-primary">{admin.creditsUsed}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(admin.success)}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{admin.createdAt}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Member Detail Modal */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {selectedMember?.memberName}'s AI Usage History
            </DialogTitle>
            <DialogDescription>
              Showing individual AI request history for this member
            </DialogDescription>
          </DialogHeader>
          
          {selectedMember && (
            <div className="space-y-4">
              {/* Credit Balance Summary */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Current Balance</span>
                </div>
                <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 text-lg px-3 py-1">
                  {selectedMember.creditBalance} credits
                </Badge>
              </div>

              {/* Request History Table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date/Time</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Credits</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getMemberRequestHistory().map((request) => (
                      <TableRow key={request.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm">{request.date}</TableCell>
                        <TableCell>
                          {request.type === "workout" ? (
                            <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                              <Dumbbell className="h-3 w-3 mr-1" />Workout
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                              <Utensils className="h-3 w-3 mr-1" />Diet
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{request.description}</TableCell>
                        <TableCell>
                          <span className="font-medium">{request.credits}</span>
                        </TableCell>
                        <TableCell>
                          {request.status === "success" ? (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Success</Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Failed</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {getMemberRequestHistory().length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No AI requests found for this member
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}


const AdminAIUsageTable = () => {
  return (
    <AdminLayout>
      <AIUsageTable type="both" />
     </AdminLayout>
  );
};

export default AdminAIUsageTable;
