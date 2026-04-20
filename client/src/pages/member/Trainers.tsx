import { MemberLayout } from "@/components/layout/MemberLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Calendar, MessageSquare, Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SafeUser, TrainerProfile, TrainerBooking, TrainerAvailability, TrainerFeedback } from "@shared/schema";

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
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]}${d.getDate()}`;
}

export default function MemberTrainers() {
  const { member } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTrainer, setSelectedTrainer] = useState<SafeUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlots, setSelectedSlots] = useState<{ date: string; period: string; slotNumber: number }[]>([]);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);

  const { data: staff = [], isLoading: loadingStaff } = useQuery<SafeUser[]>({
    queryKey: ["/api/staff"],
  });

  const trainers = staff.filter(s => s.role === "trainer");

  const { data: myBookings = [], isLoading: loadingBookings } = useQuery<TrainerBooking[]>({
    queryKey: ["/api/member", member?.id, "bookings"],
    queryFn: async () => {
      if (!member?.id) return [];
      const res = await fetch(`/api/member/${member.id}/bookings`);
      return res.json();
    },
    enabled: !!member?.id,
  });

  const myTrainerIds = Array.from(new Set(myBookings.map(b => b.trainerId)));
  const myTrainers = trainers.filter(t => myTrainerIds.includes(t.id));
  const availableTrainers = trainers.filter(t => !myTrainerIds.includes(t.id));

  const { data: trainerSummaries = [] } = useQuery({
    queryKey: ["/api/trainers-summaries-member"],
    queryFn: async () => {
      if (trainers.length === 0) return [];
      const results = await Promise.all(trainers.map(async (trainer) => {
        try {
          const [profileRes, feedbackRes] = await Promise.all([
            fetch(`/api/trainers/${trainer.id}/profile`),
            fetch(`/api/trainers/${trainer.id}/feedback`)
          ]);
          const profile = await profileRes.json();
          const feedback = await feedbackRes.json();
          return {
            trainerId: trainer.id,
            specializations: profile?.specializations || [],
            avgRating: Array.isArray(feedback) && feedback.length > 0
              ? (feedback.reduce((sum: number, f: any) => sum + f.rating, 0) / feedback.length).toFixed(1)
              : null
          };
        } catch {
          return { trainerId: trainer.id, specializations: [], avgRating: null };
        }
      }));
      return results;
    },
    enabled: trainers.length > 0,
  });

  const getTrainerSummary = (trainerId: string) => {
    return trainerSummaries.find((s: any) => s.trainerId === trainerId) || { specializations: [], avgRating: null };
  };

  const { data: availabilityData, isLoading: loadingAvailability } = useQuery<{ availability: TrainerAvailability[], bookings: TrainerBooking[] }>({
    queryKey: ["/api/trainers", selectedTrainer?.id, "availability", weekDates.join(",")],
    queryFn: async () => {
      if (!selectedTrainer) return { availability: [], bookings: [] };
      const res = await fetch(`/api/trainers/${selectedTrainer.id}/availability?weekDates=${weekDates.join(",")}`);
      return res.json();
    },
    enabled: !!selectedTrainer && drawerOpen,
  });

  const bookSlotMutation = useMutation({
    mutationFn: async (data: { trainerId: string; bookingDate: string; period: string; slotNumber: number }) => {
      const res = await apiRequest("POST", `/api/trainers/${data.trainerId}/bookings`, {
        memberId: member?.id,
        bookingDate: data.bookingDate,
        period: data.period,
        slotNumber: data.slotNumber,
        status: "scheduled",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/member", member?.id, "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainers", selectedTrainer?.id, "availability"] });
      toast({ title: "Session(s) booked successfully!" });
      setSelectedSlots([]);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenDrawer = (trainer: SafeUser) => {
    setSelectedTrainer(trainer);
    setWeekOffset(0);
    setSelectedSlots([]);
    setDrawerOpen(true);
  };

  const handleSelectSlot = (date: string, period: string, slotNumber: number) => {
    setSelectedSlots(prev => {
      const existingIndex = prev.findIndex(s => s.date === date && s.period === period && s.slotNumber === slotNumber);
      if (existingIndex >= 0) {
        return prev.filter((_, i) => i !== existingIndex);
      }
      const existingForDate = prev.find(s => s.date === date);
      if (existingForDate) {
        return prev.map(s => s.date === date ? { date, period, slotNumber } : s);
      }
      return [...prev, { date, period, slotNumber }];
    });
  };

  const handleConfirmBooking = () => {
    if (!selectedTrainer || selectedSlots.length === 0) return;
    selectedSlots.forEach(slot => {
      bookSlotMutation.mutate({
        trainerId: selectedTrainer.id,
        bookingDate: slot.date,
        period: slot.period,
        slotNumber: slot.slotNumber,
      });
    });
  };

  const isSlotDisabled = (date: string, period: string, slotNumber: number): boolean => {
    return false;
  };

  const getSlotCapacity = (date: string, period: string): number => {
    const avail = availabilityData?.availability?.find(a => a.slotDate === date && a.period === period);
    return avail?.slotCapacity || 0;
  };

  const getBookingsForSlot = (date: string, period: string): TrainerBooking[] => {
    return (availabilityData?.bookings || []).filter(b => b.bookingDate === date && b.period === period);
  };

  const getOpenSlots = (date: string, period: string): number => {
    const capacity = getSlotCapacity(date, period);
    const booked = getBookingsForSlot(date, period).length;
    return Math.max(0, capacity - booked);
  };

  const getSessionCount = (trainerId: string): number => {
    return myBookings.filter(b => b.trainerId === trainerId).length;
  };

  const getNextSession = (trainerId: string): string | null => {
    const upcoming = myBookings
      .filter(b => b.trainerId === trainerId && b.status === "scheduled")
      .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));
    return upcoming[0]?.bookingDate || null;
  };

  if (loadingStaff || loadingBookings) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground">MY TRAINERS</h1>
          <p className="text-muted-foreground">Your assigned personal trainers and book new sessions.</p>
        </div>

        {myTrainers.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {myTrainers.map(trainer => {
              const summary = getTrainerSummary(trainer.id);
              return (
                <Card key={trainer.id} className="bg-card/50 backdrop-blur-sm overflow-hidden hover:shadow-lg hover:shadow-primary/20 transition-all duration-300" data-testid={`card-my-trainer-${trainer.id}`}>
                  <div className="h-32 bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center relative">
                    <div className="absolute -bottom-6 left-6">
                      <div className="h-16 w-16 rounded-full bg-background border-4 border-card flex items-center justify-center text-xl font-bold text-primary shadow-lg">
                        {trainer.firstName?.charAt(0) || "T"}
                      </div>
                    </div>
                  </div>

                  <CardHeader className="text-center pt-10 pb-2">
                    <CardTitle className="text-xl">{trainer.firstName} {trainer.lastName}</CardTitle>
                    <div className="flex items-center justify-center gap-1 mt-2 text-accent">
                      {summary.avgRating ? (
                        <><Star className="h-4 w-4 fill-accent" /><span className="text-sm font-semibold">{summary.avgRating}</span></>
                      ) : (
                        <span className="text-sm text-muted-foreground">No ratings yet</span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1 justify-center min-h-[24px]">
                      {summary.specializations?.slice(0, 3).map((spec: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs px-2 py-0">
                          {spec}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-3 border-t border-b border-border">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{getSessionCount(trainer.id)}</p>
                        <p className="text-xs text-muted-foreground">Sessions</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Next Session</p>
                        <p className="text-sm font-semibold mt-1">{getNextSession(trainer.id) || "None"}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1 gap-2" size="sm" onClick={() => handleOpenDrawer(trainer)} data-testid={`button-book-my-trainer-${trainer.id}`}>
                        <Calendar className="h-4 w-4" /> Book Session
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2" size="sm">
                        <MessageSquare className="h-4 w-4" /> Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-12 text-center pb-12">
              <p className="text-muted-foreground mb-4">You don't have any personal trainers assigned yet.</p>
              <p className="text-sm text-muted-foreground">Book a session with a trainer below to get started!</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <h2 className="text-2xl font-bold font-heading">Available Trainers</h2>
          {availableTrainers.length === 0 ? (
            <p className="text-muted-foreground">No additional trainers available.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availableTrainers.map(trainer => {
                const summary = getTrainerSummary(trainer.id);
                return (
                  <Card key={trainer.id} className="bg-card/50 backdrop-blur-sm" data-testid={`card-available-trainer-${trainer.id}`}>
                    <CardHeader>
                      <div className="text-center">
                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2 text-primary font-bold">
                          {trainer.firstName?.charAt(0) || "T"}
                        </div>
                        <CardTitle className="text-lg">{trainer.firstName} {trainer.lastName}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                      <div className="flex flex-wrap gap-1 justify-center min-h-[24px]">
                        {summary.specializations?.slice(0, 2).map((spec: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs px-2 py-0">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-accent">
                        {summary.avgRating ? (
                          <><Star className="h-4 w-4 fill-accent" /><span className="text-sm">{summary.avgRating}</span></>
                        ) : (
                          <span className="text-sm text-muted-foreground">No ratings</span>
                        )}
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => handleOpenDrawer(trainer)} data-testid={`button-book-trainer-${trainer.id}`}>
                        Book Session
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Sheet open={drawerOpen} onOpenChange={(open) => { setDrawerOpen(open); if (!open) setSelectedTrainer(null); }}>
        <SheetContent className="sm:max-w-xl w-full bg-card border-l border-border overflow-y-auto">
          <SheetHeader className="border-b border-border pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                {selectedTrainer?.firstName?.charAt(0)}
              </div>
              <div>
                <SheetTitle className="text-2xl font-bold font-heading text-foreground uppercase tracking-tight">
                  Book with {selectedTrainer?.firstName}
                </SheetTitle>
                <p className="text-sm text-muted-foreground">Select an available slot to book your session</p>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(prev => prev - 1)} className="text-accent">
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev Week
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(prev => prev + 1)} className="text-accent">
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
                          <div className="text-sm font-medium">{dayNames[i]}</div>
                          <div className="text-xs text-muted-foreground">{formatDateShort(date)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map(period => (
                      <tr key={period} className="border-t border-border">
                        <td className="p-2 text-sm font-medium capitalize">{period}</td>
                        {weekDates.map(date => {
                          const capacity = getSlotCapacity(date, period);
                          const bookings = getBookingsForSlot(date, period);
                          const openSlots = getOpenSlots(date, period);
                          const nextSlotNumber = bookings.length + 1;

                          return (
                            <td key={date} className="p-2 align-top text-center">
                              <TooltipProvider>
                                <div className="flex flex-wrap gap-1 justify-center min-h-[28px]">
                                  {bookings.map((booking) => (
                                    <Tooltip key={booking.id}>
                                      <TooltipTrigger asChild>
                                        <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center">
                                          <Check className="h-3 w-3 text-white" />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Booked</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  ))}
                                  {Array.from({ length: openSlots }).map((_, idx) => {
                                    const slotNum = nextSlotNumber + idx;
                                    const isSelected = selectedSlots.some(s => s.date === date && s.period === period && s.slotNumber === slotNum);
                                    const disabled = isSlotDisabled(date, period, slotNum);
                                    return (
                                      <Tooltip key={`open-${idx}`}>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => handleSelectSlot(date, period, slotNum)}
                                            disabled={disabled}
                                            className={`w-6 h-6 rounded cursor-pointer transition-colors ${
                                              disabled ? 'opacity-30 cursor-not-allowed' :
                                              isSelected 
                                                ? 'bg-primary border-2 border-primary ring-2 ring-primary/50' 
                                                : 'bg-amber-200 border border-amber-300 hover:bg-amber-300 hover:border-amber-400'
                                            }`}
                                            data-testid={`slot-${date}-${period}-${idx}`}
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>{isSelected ? 'Click to unselect' : 'Click to select'}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}
                                  {capacity === 0 && (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </div>
                              </TooltipProvider>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-200 border border-amber-300" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary border-2 border-primary" />
                <span>Selected</span>
              </div>
            </div>

            {selectedSlots.length > 0 && (
              <div className="pt-4">
                <Button 
                  className="w-full" 
                  onClick={handleConfirmBooking}
                  disabled={bookSlotMutation.isPending}
                  data-testid="button-confirm-booking"
                >
                  {bookSlotMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Confirm Booking{selectedSlots.length > 1 ? "s" : ""} - {selectedSlots.map(s => formatDateShort(s.date)).join(", ")}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </MemberLayout>
  );
}
