import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Star,
  Users,
  Settings,
  ChevronRight,
  Loader2,
  X,
  Plus,
  MessageSquare,
  Calendar,
  Clock,
  ChevronLeft,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  SafeUser,
  TrainerProfile,
  TrainerBooking,
  TrainerFeedback,
  Member,
  TrainerAvailability,
} from "@shared/schema";

const specializationOptions = [
  "Strength Training",
  "HIIT",
  "Cardio",
  "Yoga",
  "Pilates",
  "CrossFit",
  "Bodybuilding",
  "Weight Loss",
  "Rehabilitation",
  "Sports Performance",
];
const periods = ["morning", "noon", "evening"] as const;
const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

function getWeekDates(baseDate: Date): string[] {
  const sunday = new Date(baseDate);
  sunday.setDate(baseDate.getDate() - baseDate.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]}${d.getDate()}`;
}

type SlotData = Record<string, Record<string, number>>;

export default function Trainers() {
  const [selectedTrainer, setSelectedTrainer] = useState<SafeUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newSpec, setNewSpec] = useState("");
  const [editedSpecs, setEditedSpecs] = useState<string[]>([]);
  const [hasProfileChanges, setHasProfileChanges] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [slotData, setSlotData] = useState<SlotData>({});
  const [hasAvailabilityChanges, setHasAvailabilityChanges] = useState(false);
  const [selectedBookingsToDelete, setSelectedBookingsToDelete] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);

  const { data: staff = [], isLoading: loadingStaff } = useQuery<SafeUser[]>({
    queryKey: ["/api/staff"],
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const trainers = staff.filter((s) => s.role === "trainer");

  const { data: trainerSummaries = [] } = useQuery({
    queryKey: ["/api/trainers-summaries"],
    queryFn: async () => {
      if (trainers.length === 0) return [];
      const results = await Promise.all(
        trainers.map(async (trainer) => {
          try {
            const [profileRes, bookingsRes, feedbackRes] = await Promise.all([
              fetch(`/api/trainers/${trainer.id}/profile`),
              fetch(`/api/trainers/${trainer.id}/bookings`),
              fetch(`/api/trainers/${trainer.id}/feedback`),
            ]);
            const profile = await profileRes.json();
            const bookings = await bookingsRes.json();
            const feedback = await feedbackRes.json();
            return {
              trainerId: trainer.id,
              profile,
              bookingsCount: Array.isArray(bookings) ? bookings.length : 0,
              slotsCapacity: profile?.weeklySlotCapacity || 20,
              specializations: profile?.specializations || [],
              avgRating:
                Array.isArray(feedback) && feedback.length > 0
                  ? (
                      feedback.reduce(
                        (sum: number, f: any) => sum + f.rating,
                        0,
                      ) / feedback.length
                    ).toFixed(1)
                  : null,
            };
          } catch {
            return {
              trainerId: trainer.id,
              profile: null,
              bookingsCount: 0,
              slotsCapacity: 20,
              specializations: [],
              avgRating: null,
            };
          }
        }),
      );
      return results;
    },
    enabled: trainers.length > 0,
  });

  const getTrainerSummary = (trainerId: string) => {
    return (
      trainerSummaries.find((s: any) => s.trainerId === trainerId) || {
        bookingsCount: 0,
        slotsCapacity: 20,
        specializations: [],
        avgRating: null,
      }
    );
  };

  const { data: trainerProfile } = useQuery<TrainerProfile | null>({
    queryKey: ["/api/trainers", selectedTrainer?.id, "profile"],
    queryFn: async () => {
      if (!selectedTrainer) return null;
      const res = await fetch(`/api/trainers/${selectedTrainer.id}/profile`);
      return res.json();
    },
    enabled: !!selectedTrainer && drawerOpen,
  });

  const { data: availabilityData, isLoading: loadingAvailability } = useQuery<{
    availability: TrainerAvailability[];
    bookings: TrainerBooking[];
  }>({
    queryKey: [
      "/api/trainers",
      selectedTrainer?.id,
      "availability",
      weekDates.join(","),
    ],
    queryFn: async () => {
      if (!selectedTrainer) return { availability: [], bookings: [] };
      const res = await fetch(
        `/api/trainers/${selectedTrainer.id}/availability?weekDates=${weekDates.join(",")}`,
      );
      return res.json();
    },
    enabled: !!selectedTrainer && drawerOpen,
  });

  const { data: feedback = [], isLoading: loadingFeedback } = useQuery<
    TrainerFeedback[]
  >({
    queryKey: ["/api/trainers", selectedTrainer?.id, "feedback"],
    queryFn: async () => {
      if (!selectedTrainer) return [];
      const res = await fetch(`/api/trainers/${selectedTrainer.id}/feedback`);
      return res.json();
    },
    enabled: !!selectedTrainer && drawerOpen,
  });

  useEffect(() => {
    if (availabilityData?.availability) {
      const newSlotData: SlotData = {};
      weekDates.forEach((date) => {
        newSlotData[date] = { morning: 0, noon: 0, evening: 0 };
      });
      availabilityData.availability.forEach((a) => {
        if (newSlotData[a.slotDate]) {
          newSlotData[a.slotDate][a.period] = a.slotCapacity;
        }
      });
      setSlotData(newSlotData);
      setHasAvailabilityChanges(false);
    }
  }, [availabilityData, weekDates.join(",")]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: {
      specializations?: string[];
      weeklySlotCapacity?: number;
    }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/trainers/${selectedTrainer?.id}/profile`,
        data,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/trainers", selectedTrainer?.id, "profile"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trainers-summaries"] });
      toast({ title: "Profile updated" });
      setHasProfileChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveAvailabilityMutation = useMutation({
    mutationFn: async (
      slots: { slotDate: string; period: string; slotCapacity: number }[],
    ) => {
      const res = await apiRequest(
        "PUT",
        `/api/trainers/${selectedTrainer?.id}/availability/batch`,
        { slots },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/trainers", selectedTrainer?.id, "availability"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trainers-summaries"] });
      toast({ title: "Availability saved" });
      setHasAvailabilityChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBookingsMutation = useMutation({
    mutationFn: async (bookingIds: string[]) => {
      await Promise.all(bookingIds.map(id => 
        apiRequest("DELETE", `/api/trainers/${selectedTrainer?.id}/bookings/${id}`)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/trainers", selectedTrainer?.id, "availability", weekDates.join(",")],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trainers-summaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainers", selectedTrainer?.id, "bookings"] });
      toast({ title: "Bookings cleared successfully" });
      setSelectedBookingsToDelete(new Set());
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenDrawer = (trainer: SafeUser) => {
    setSelectedTrainer(trainer);
    const summary = getTrainerSummary(trainer.id);
    setEditedSpecs(summary.specializations || []);
    setHasProfileChanges(false);
    setHasAvailabilityChanges(false);
    setSelectedBookingsToDelete(new Set());
    setWeekOffset(0);
    setDrawerOpen(true);
  };

  const toggleBookingSelection = (bookingId: string) => {
    setSelectedBookingsToDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  };

  const handleClearSelectedBookings = () => {
    if (selectedBookingsToDelete.size === 0) return;
    deleteBookingsMutation.mutate(Array.from(selectedBookingsToDelete));
  };

  const handleAddSpecialization = (spec: string) => {
    if (!spec.trim()) return;
    if (editedSpecs.includes(spec)) return;
    setEditedSpecs([...editedSpecs, spec]);
    setHasProfileChanges(true);
    setNewSpec("");
  };

  const handleRemoveSpecialization = (spec: string) => {
    setEditedSpecs(editedSpecs.filter((s) => s !== spec));
    setHasProfileChanges(true);
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ specializations: editedSpecs });
  };

  const handleSlotChange = (date: string, period: string, value: number) => {
    setSlotData((prev) => ({
      ...prev,
      [date]: { ...prev[date], [period]: Math.max(0, Math.min(10, value)) },
    }));
    setHasAvailabilityChanges(true);
  };

  const handleSaveAvailability = () => {
    const slots: { slotDate: string; period: string; slotCapacity: number }[] =
      [];
    Object.entries(slotData).forEach(([date, periods]) => {
      Object.entries(periods).forEach(([period, capacity]) => {
        slots.push({ slotDate: date, period, slotCapacity: capacity });
      });
    });
    saveAvailabilityMutation.mutate(slots);
  };

  const getMemberName = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    return member
      ? `${member.firstName} ${member.lastName || ""}`.trim()
      : "Unknown";
  };

  const getBookingsForSlot = (
    date: string,
    period: string,
  ): TrainerBooking[] => {
    return (availabilityData?.bookings || []).filter(
      (b) => b.bookingDate === date && b.period === period,
    );
  };

  const getTotalWeekSlots = (): number => {
    return Object.values(slotData).reduce(
      (sum, periods) => sum + Object.values(periods).reduce((s, v) => s + v, 0),
      0,
    );
  };

  const getBookedWeekSlots = (): number => {
    return availabilityData?.bookings?.length || 0;
  };

  const getAvailableWeekSlots = (): number => {
    return Math.max(0, getTotalWeekSlots() - getBookedWeekSlots());
  };

  const getAvgRating = () => {
    if (feedback.length === 0) return "N/A";
    return (
      feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
    ).toFixed(1);
  };

  if (loadingStaff) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground">
            PERSONAL TRAINERS
          </h1>
          <p className="text-muted-foreground">
            Manage trainers, their specializations, slots, and client
            assignments.
          </p>
        </div>

        {trainers.length === 0 ? (
          <Card className="bg-card/50 backdrop-blur-sm p-8 text-center">
            <p className="text-muted-foreground">
              No trainers found. Add staff members with the "trainer" role to
              see them here.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trainers.map((trainer) => (
              <Card
                key={trainer.id}
                className="bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary transition-all duration-300"
                data-testid={`card-trainer-${trainer.id}`}
              >
                <div className="h-32 bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-background border-4 border-card flex items-center justify-center text-2xl font-bold text-primary shadow-xl">
                    {trainer.firstName?.charAt(0) || "T"}
                  </div>
                </div>
                <CardHeader className="text-center pt-2 pb-2">
                  <CardTitle className="text-xl">
                    {trainer.firstName} {trainer.lastName}
                  </CardTitle>
                  <CardDescription className="flex items-center justify-center gap-1 text-accent">
                    {getTrainerSummary(trainer.id).avgRating ? (
                      <>
                        <Star className="h-3 w-3 fill-accent" />{" "}
                        {getTrainerSummary(trainer.id).avgRating} Rating
                      </>
                    ) : (
                      <>
                        <Star className="h-3 w-3" /> Personal Trainer
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1 justify-center min-h-[24px]">
                    {getTrainerSummary(trainer.id).specializations?.map(
                      (spec: string, i: number) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs px-2 py-0"
                        >
                          {spec}
                        </Badge>
                      ),
                    )}
                    {(getTrainerSummary(trainer.id).specializations?.length ||
                      0) === 0 && (
                      <span className="text-xs text-muted-foreground">
                        No specializations
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center py-4 border-t border-b border-border">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {getTrainerSummary(trainer.id).bookingsCount}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase">
                        Clients
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-accent">
                        {getTrainerSummary(trainer.id).slotsCapacity -
                          getTrainerSummary(trainer.id).bookingsCount}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase">
                        Slots Open
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    onClick={() => handleOpenDrawer(trainer)}
                    data-testid={`button-manage-trainer-${trainer.id}`}
                  >
                    <Settings className="h-4 w-4" /> Manage{" "}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Sheet
          open={drawerOpen}
          onOpenChange={(open) => {
            setDrawerOpen(open);
            if (!open) setSelectedTrainer(null);
          }}
        >
          <SheetContent className="sm:max-w-3xl w-full bg-card border-l border-border overflow-y-auto">
            <SheetHeader className="border-b border-border pb-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                  {selectedTrainer?.firstName?.charAt(0)}
                </div>
                <div>
                  <SheetTitle className="text-2xl font-bold font-heading text-foreground uppercase tracking-tight">
                    {selectedTrainer?.firstName} {selectedTrainer?.lastName}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedTrainer?.email}
                  </p>
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="availability" className="w-full">
              <TabsList className="bg-muted p-1 rounded-lg mb-6 w-full">
                <TabsTrigger
                  value="availability"
                  className="flex-1 data-[state=active]:bg-background"
                >
                  Availability
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="flex-1 data-[state=active]:bg-background"
                >
                  Profile
                </TabsTrigger>
                <TabsTrigger
                  value="feedback"
                  className="flex-1 data-[state=active]:bg-background"
                >
                  Feedback
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="availability"
                className="space-y-6 animate-in fade-in"
              >
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold text-primary">
                      {getTotalWeekSlots()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Slots</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-green-500">
                      {getBookedWeekSlots()}
                    </p>
                    <p className="text-xs text-muted-foreground">Booked</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-amber-500">
                      {getAvailableWeekSlots()}
                    </p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWeekOffset((prev) => prev - 1)}
                    className="text-accent"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Prev Week
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWeekOffset((prev) => prev + 1)}
                    className="text-accent"
                  >
                    Next Week <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                {loadingAvailability ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 text-left text-xs font-medium text-muted-foreground"></th>
                          {weekDates.map((date, i) => (
                            <th key={date} className="p-2 text-center">
                              <div className="text-sm font-medium">
                                {dayNames[i]}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDateShort(date)}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {periods.map((period) => (
                          <tr key={period} className="border-t border-border">
                            <td className="p-2 text-sm font-medium capitalize">
                              {period}
                            </td>
                            {weekDates.map((date) => {
                              const capacity = slotData[date]?.[period] || 0;
                              const bookings = getBookingsForSlot(date, period);
                              const openSlots = Math.max(
                                0,
                                capacity - bookings.length,
                              );

                              return (
                                <td key={date} className="p-2 align-top">
                                  <div className="space-y-2">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={10}
                                      value={capacity}
                                      onChange={(e) =>
                                        handleSlotChange(
                                          date,
                                          period,
                                          parseInt(e.target.value) || 0,
                                        )
                                      }
                                      className="w-12 h-8 text-center text-sm p-1"
                                      data-testid={`input-slot-${date}-${period}`}
                                    />
                                    <TooltipProvider>
                                      <div
                                        className="flex flex-wrap gap-1 min-h-[24px]"
                                        style={{ maxWidth: "50px" }}
                                      >
                                        {bookings.map((booking, idx) => {
                                          const isSelectedForDelete = selectedBookingsToDelete.has(booking.id);
                                          return (
                                            <Tooltip key={booking.id}>
                                              <TooltipTrigger asChild>
                                                <button
                                                  onClick={() => toggleBookingSelection(booking.id)}
                                                  className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all ${
                                                    isSelectedForDelete 
                                                      ? 'bg-red-500 ring-2 ring-red-300' 
                                                      : 'bg-green-500'
                                                  }`}
                                                >
                                                  {isSelectedForDelete ? (
                                                    <X className="h-3 w-3 text-white" />
                                                  ) : (
                                                    <Check className="h-3 w-3 text-white" />
                                                  )}
                                                </button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>
                                                  {getMemberName(booking.memberId)}
                                                  {isSelectedForDelete ? ' (click to unmark)' : ' (click to mark for removal)'}
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          );
                                        })}
                                        {Array.from({ length: openSlots }).map(
                                          (_, idx) => (
                                            <div
                                              key={`open-${idx}`}
                                              className="w-5 h-5 rounded bg-amber-200 border border-amber-300"
                                            />
                                          ),
                                        )}
                                      </div>
                                    </TooltipProvider>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleSaveAvailability}
                    disabled={
                      !hasAvailabilityChanges ||
                      saveAvailabilityMutation.isPending
                    }
                    data-testid="button-save-availability"
                  >
                    {saveAvailabilityMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Save Availability
                  </Button>
                  {selectedBookingsToDelete.size > 0 && (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleClearSelectedBookings}
                      disabled={deleteBookingsMutation.isPending}
                      data-testid="button-clear-bookings"
                    >
                      {deleteBookingsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Clear {selectedBookingsToDelete.size} Booking{selectedBookingsToDelete.size > 1 ? 's' : ''}
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="profile"
                className="space-y-6 animate-in fade-in"
              >
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Specializations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {editedSpecs.map((spec, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {spec}
                        <button
                          onClick={() => handleRemoveSpecialization(spec)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {editedSpecs.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No specializations added yet
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newSpec}
                      onChange={(e) => setNewSpec(e.target.value)}
                      data-testid="select-specialization"
                    >
                      <option value="">Select specialization</option>
                      {specializationOptions
                        .filter((opt) => !editedSpecs.includes(opt))
                        .map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                    <Button
                      onClick={() => handleAddSpecialization(newSpec)}
                      disabled={!newSpec}
                      data-testid="button-add-specialization"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSaveProfile}
                  disabled={
                    !hasProfileChanges || updateProfileMutation.isPending
                  }
                  data-testid="button-save-profile"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save Changes
                </Button>
              </TabsContent>

              <TabsContent
                value="feedback"
                className="space-y-4 animate-in fade-in"
              >
                {loadingFeedback ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : feedback.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No feedback received yet</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border mb-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-accent">
                            {getAvgRating()}
                          </p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i <= Math.round(parseFloat(getAvgRating()) || 0) ? "fill-accent text-accent" : "text-muted"}`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Based on {feedback.length} review
                          {feedback.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                    {feedback.map((fb) => (
                      <Card
                        key={fb.id}
                        className="bg-background border border-border"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                {getMemberName(fb.memberId).charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {getMemberName(fb.memberId)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(
                                    fb.submittedAt,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${i <= fb.rating ? "fill-accent text-accent" : "text-muted"}`}
                                />
                              ))}
                            </div>
                          </div>
                          {fb.comments && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {fb.comments}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}
