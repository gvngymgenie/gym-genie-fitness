import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarCheck, Fingerprint, Smartphone, UserCheck, Clock, CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Member, Attendance } from "@shared/schema";

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [checkInTime, setCheckInTime] = useState(format(new Date(), "HH:mm"));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role: userRole } = useAuth();

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: attendanceRecords = [], isLoading: isLoadingAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", dateStr],
    queryFn: async () => {
      const res = await fetch(`/api/attendance?date=${dateStr}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
  });

  const { data: todayAttendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/attendance?date=${todayStr}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      return res.json();
    },
  });

  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === "Active");
  }, [members]);

  const todayCheckInsCount = todayAttendance.length;

  const peakHour = useMemo(() => {
    if (todayAttendance.length === 0) return "--";
    
    const hourCounts: Record<number, number> = {};
    todayAttendance.forEach(record => {
      const hour = parseInt(record.checkInTime.split(":")[0]);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    let maxHour = -1;
    let maxCount = 0;
    Object.entries(hourCounts).forEach(([hour, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxHour = parseInt(hour);
      }
    });

    if (maxCount <= 10 || maxHour === -1) return "--";

    const period = maxHour >= 12 ? "PM" : "AM";
    const displayHour = maxHour > 12 ? maxHour - 12 : (maxHour === 0 ? 12 : maxHour);
    return `${displayHour}:00 ${period}`;
  }, [todayAttendance]);

  const markPresentMutation = useMutation({
    mutationFn: async (data: { memberId: string; memberName: string; checkInTime: string }) => {
      const res = await apiRequest("POST", "/api/attendance", {
        ...data,
        date: dateStr,
        method: "Manual",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({ title: "Member marked present" });
      setSelectedMemberId("");
      setCheckInTime(format(new Date(), "HH:mm"));
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleMarkPresent = () => {
    if (!selectedMemberId) {
      toast({ title: "Please select a member", variant: "destructive" });
      return;
    }

    const member = activeMembers.find(m => m.id === selectedMemberId);
    if (!member) return;

    markPresentMutation.mutate({
      memberId: member.id,
      memberName: `${member.firstName} ${member.lastName || ""}`.trim(),
      checkInTime,
    });
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "Biometric":
        return <Fingerprint className="h-4 w-4 text-primary" />;
      case "App QR":
        return <Smartphone className="h-4 w-4 text-accent" />;
      default:
        return <UserCheck className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const sortedAttendance = useMemo(() => {
    return [...attendanceRecords].sort((a, b) => a.checkInTime.localeCompare(b.checkInTime));
  }, [attendanceRecords]);

  // Delete attendance mutation
  const deleteAttendanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/attendance/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete attendance");
      // Server returns 204 No Content, so no need to parse JSON
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({ title: "Attendance record deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDeleteAttendance = (id: string) => {
    if (confirm("Are you sure you want to delete this attendance record?")) {
      deleteAttendanceMutation.mutate(id);
    }
  };

  // Check if user can delete (admin or manager)
  const canDelete = userRole === "admin" || userRole === "manager";

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground" data-testid="heading-attendance">ATTENDANCE</h1>
          <p className="text-muted-foreground">Track member check-ins via Biometric, App, or Manual entry.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Today's Check-ins</p>
                  <h3 className="text-3xl font-bold" data-testid="text-todays-checkins">{todayCheckInsCount}</h3>
                </div>
                <UserCheck className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-accent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Peak Hour</p>
                  <h3 className="text-3xl font-bold" data-testid="text-peak-hour">{peakHour}</h3>
                </div>
                <Clock className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <Card className="md:col-span-2 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span>Daily Log</span>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[200px] justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                        data-testid="button-select-date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, "dd MMM yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(date);
                            setCalendarOpen(false);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline"><Fingerprint className="h-4 w-4 mr-2" /> Sync Biometric</Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAttendance ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sortedAttendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records for this date
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground uppercase text-xs font-medium">
                    <tr>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Status</th>
                      {canDelete && <th className="px-4 py-3 w-[80px]">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sortedAttendance.map((record) => (
                      <tr key={record.id} className="hover:bg-muted/30" data-testid={`row-attendance-${record.id}`}>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {record.checkInTime}
                        </td>
                        <td className="px-4 py-3 font-medium">{record.memberName}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getMethodIcon(record.method)}
                            <span className="text-xs">{record.method}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-green-500 font-medium text-xs">Present</td>
                        {canDelete && (
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteAttendance(record.id)}
                              disabled={deleteAttendanceMutation.isPending}
                              data-testid={`button-delete-attendance-${record.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm h-fit">
            <CardHeader>
              <CardTitle>Manual Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Member</label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger data-testid="select-member-attendance">
                    <SelectValue placeholder="Search member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeMembers.map(m => (
                      <SelectItem key={m.id} value={m.id} data-testid={`option-member-${m.id}`}>
                        {m.firstName} {m.lastName || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <Input 
                  type="time" 
                  value={checkInTime} 
                  onChange={(e) => setCheckInTime(e.target.value)}
                  data-testid="input-checkin-time"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1 gap-2" 
                  onClick={handleMarkPresent}
                  disabled={!selectedMemberId || markPresentMutation.isPending}
                  data-testid="button-mark-present"
                >
                  {markPresentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarCheck className="h-4 w-4" />
                  )}
                  Mark Present
                </Button>
                {selectedMemberId && (
                  <Button 
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setSelectedMemberId("");
                      setCheckInTime(format(new Date(), "HH:mm"));
                    }}
                    disabled={markPresentMutation.isPending}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                You can mark the same member multiple times per day
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
