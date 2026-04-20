import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, RotateCcw, Calendar, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TrainerBooking, SafeUser, Member } from "@shared/schema";
import { format } from "date-fns";

type StatusFilter = "all" | "scheduled" | "completed" | "cancelled";

export default function BookingsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [trainerFilter, setTrainerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  
  // Fetch all bookings
  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery<TrainerBooking[]>({
    queryKey: ["/api/bookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings");
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  // Fetch trainers for filter
  const { data: trainers = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
  });

  // Fetch members for name resolution
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: async () => {
      const res = await fetch("/api/members");
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

   // Complete booking mutation
   const completeMutation = useMutation({
     mutationFn: async ({ trainerId, bookingId }: { trainerId: string; bookingId: string }) => {
       const res = await apiRequest("POST", `/api/trainers/${trainerId}/bookings/${bookingId}/complete`);
       return res.json();
     },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        toast({ title: "Booking marked as completed" });
      },
     onError: (error: any) => {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     },
   });

   // Revert booking to scheduled mutation
   const revertMutation = useMutation({
     mutationFn: async ({ trainerId, bookingId }: { trainerId: string; bookingId: string }) => {
       const res = await apiRequest("POST", `/api/trainers/${trainerId}/bookings/${bookingId}/revert`);
       return res.json();
     },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
        toast({ title: "Booking reverted to scheduled" });
      },
     onError: (error: any) => {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     },
   });

   // Bulk auto-complete mutation (for all filtered bookings of selected trainer)
   const autoCompleteMutation = useMutation({
    mutationFn: async (trainerId: string) => {
      const res = await apiRequest("POST", `/api/trainers/${trainerId}/auto-complete`);
      return res.json();
    },
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
       toast({ 
         title: "Auto-complete complete", 
         description: `${data.completedCount} booking(s) marked as completed` 
       });
     },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    const filtered = bookings.filter(booking => {
      // Status filter
      if (statusFilter !== "all" && booking.status !== statusFilter) {
        return false;
      }
      // Trainer filter
      if (trainerFilter !== "all" && booking.trainerId !== trainerFilter) {
        return false;
      }
      // Date filter
      if (dateFilter && booking.bookingDate !== dateFilter) {
        return false;
      }
      return true;
    });

    // Sort by date (descending) and period (morning → noon → evening)
    const periodOrder = { morning: 0, noon: 1, evening: 2 };
    return filtered.sort((a, b) => {
      // Compare dates (newest first)
      const dateCompare = b.bookingDate.localeCompare(a.bookingDate);
      if (dateCompare !== 0) return dateCompare;
      // Same date: sort by period order
      return (periodOrder[a.period] || 99) - (periodOrder[b.period] || 99);
    });
  }, [bookings, statusFilter, trainerFilter, dateFilter]);

  // Get member name helper
  const getMemberName = (memberId: string): string => {
    const member = members.find(m => m.id === memberId);
    return member ? `${member.firstName} ${member.lastName || ""}`.trim() : `Member (${memberId.slice(0, 8)})`;
  };

  const getTrainerName = (trainerId: string): string => {
    const trainer = trainers.find(t => t.id === trainerId);
    return trainer ? `${trainer.firstName} ${trainer.lastName}` : "Unknown";
  };

  // Group by trainer for bulk actions
  const trainersWithBookings = useMemo(() => {
    const groups: Record<string, TrainerBooking[]> = {};
    filteredBookings.forEach(b => {
      if (!groups[b.trainerId]) groups[b.trainerId] = [];
      groups[b.trainerId].push(b);
    });
    return groups;
  }, [filteredBookings]);

   const handleMarkComplete = (trainerId: string, bookingId: string) => {
     completeMutation.mutate({ trainerId, bookingId });
   };

   const handleRevert = (trainerId: string, bookingId: string) => {
     revertMutation.mutate({ trainerId, bookingId });
   };

   const handleAutoCompleteForTrainer = (trainerId: string) => {
     autoCompleteMutation.mutate(trainerId);
   };

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    completed: "bg-green-500/20 text-green-500 border-green-500/30",
    cancelled: "bg-red-500/20 text-red-500 border-red-500/30",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            BOOKINGS MANAGEMENT
          </h1>
          <p className="text-muted-foreground">
            View and manage trainer session bookings. Mark sessions as completed to calculate salary bonuses.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (confirm("Auto-complete ALL past bookings for ALL trainers? This will mark every booking with a past date as completed.")) {
              fetch("/api/bookings/auto-complete-all", { method: "POST" })
                .then(r => r.json())
                .then(data => {
                  toast({ 
                    title: "Auto-complete finished", 
                    description: `${data.totalCompleted} bookings marked as completed` 
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
                })
                .catch(err => {
                  toast({ title: "Error", description: err.message, variant: "destructive" });
                });
            }
          }}
          className="gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Auto-Complete All Past
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Narrow down bookings by status, trainer, or date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trainer</Label>
              <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All trainers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trainers</SelectItem>
                  {trainers.filter(t => t.role === "trainer").map(trainer => (
                    <SelectItem key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStatusFilter("all");
                  setTrainerFilter("all");
                  setDateFilter("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk auto-complete for each trainer */}
      {Object.entries(trainersWithBookings).map(([trainerId, bList]) => {
        const incompleteCount = bList.filter(b => b.status !== "completed" && b.bookingDate <= new Date().toISOString().split("T")[0]).length;
        if (incompleteCount === 0) return null;
        return (
          <Card key={trainerId} className="bg-card/50 backdrop-blur-sm border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{getTrainerName(trainerId)} — {incompleteCount} past session(s) not marked complete</p>
                  <p className="text-sm text-muted-foreground">
                    Auto-complete all past bookings for this trainer
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoCompleteForTrainer(trainerId)}
                  disabled={autoCompleteMutation.isPending}
                  className="gap-2"
                >
                  {autoCompleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Mark All Past Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Bookings Table */}
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>
            {filteredBookings.length} booking(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBookings ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bookings found matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id} className={booking.status === "completed" ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        {format(new Date(booking.bookingDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {getTrainerName(booking.trainerId)}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const member = members.find(m => m.id === booking.memberId);
                          const fullName = member ? `${member.firstName} ${member.lastName || ""}`.trim() : "Unknown";
                          const initials = member ? `${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`.slice(0, 2) : "?";
                          const bgColor = member?.firstName ? [
                            "bg-red-500/20 text-red-500",
                            "bg-blue-500/20 text-blue-500",
                            "bg-green-500/20 text-green-500",
                            "bg-yellow-500/20 text-yellow-500",
                            "bg-purple-500/20 text-purple-500",
                            "bg-pink-500/20 text-pink-500",
                          ][member.firstName.charCodeAt(0) % 6] : "bg-muted text-muted-foreground";
                          return (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className={`text-[10px] ${bgColor}`}>
                                  {initials.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{fullName}</span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="capitalize">{booking.period}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[booking.status] || "bg-gray-500/20"}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {booking.status === "completed" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevert(booking.trainerId, booking.id)}
                            disabled={revertMutation.isPending}
                            className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Revert
                          </Button>
                        ) : booking.bookingDate <= new Date().toISOString().split("T")[0] ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkComplete(booking.trainerId, booking.id)}
                            disabled={completeMutation.isPending}
                            className="gap-1"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Mark Complete
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
