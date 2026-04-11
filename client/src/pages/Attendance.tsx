import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarCheck, Fingerprint, Smartphone, UserCheck, Clock, CalendarIcon, Loader2, Trash2, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Member, Attendance, SafeUser, StaffAttendance } from "@shared/schema";

type AttendanceTab = "members" | "staff";
type StaffTypeFilter = "all" | "trainer" | "staff";

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<AttendanceTab>("members");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { role: userRole } = useAuth();

  // Member attendance state
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [checkInTime, setCheckInTime] = useState(format(new Date(), "HH:mm"));

  // Staff attendance state
  const [selectedStaffType, setSelectedStaffType] = useState<StaffTypeFilter>("all");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [staffCheckInTime, setStaffCheckInTime] = useState(format(new Date(), "HH:mm"));
  const [staffCheckOutTime, setStaffCheckOutTime] = useState("");
  const [staffNotes, setStaffNotes] = useState("");

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Members query
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  // Staff users query
  const { data: staffUsers = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
  });

  // Member attendance queries
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

  // Staff attendance queries
  const { data: staffAttendanceRecords = [], isLoading: isLoadingStaffAttendance } = useQuery<StaffAttendance[]>({
    queryKey: ["/api/staff-attendance", dateStr],
    queryFn: async () => {
      const res = await fetch(`/api/staff-attendance?date=${dateStr}`);
      if (!res.ok) throw new Error("Failed to fetch staff attendance");
      return res.json();
    },
  });

  const { data: todayStaffAttendance = [] } = useQuery<StaffAttendance[]>({
    queryKey: ["/api/staff-attendance", todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/staff-attendance?date=${todayStr}`);
      if (!res.ok) throw new Error("Failed to fetch staff attendance");
      return res.json();
    },
  });

  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === "Active");
  }, [members]);

  const filteredStaffUsers = useMemo(() => {
    if (selectedStaffType === "all") return staffUsers;
    return staffUsers.filter(u => u.role === selectedStaffType);
  }, [staffUsers, selectedStaffType]);

  const filteredStaffAttendance = useMemo(() => {
    if (selectedStaffType === "all") return staffAttendanceRecords;
    return staffAttendanceRecords.filter(r => r.personType === selectedStaffType);
  }, [staffAttendanceRecords, selectedStaffType]);

  const todayCheckInsCount = todayAttendance.length;
  const todayStaffCheckInsCount = todayStaffAttendance.length;

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

  const staffPeakHour = useMemo(() => {
    if (todayStaffAttendance.length === 0) return "--";

    const hourCounts: Record<number, number> = {};
    todayStaffAttendance.forEach(record => {
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

    if (maxCount <= 5 || maxHour === -1) return "--";

    const period = maxHour >= 12 ? "PM" : "AM";
    const displayHour = maxHour > 12 ? maxHour - 12 : (maxHour === 0 ? 12 : maxHour);
    return `${displayHour}:00 ${period}`;
  }, [todayStaffAttendance]);

  // Member attendance mutations
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

  // Staff attendance mutations
  const markStaffPresentMutation = useMutation({
    mutationFn: async (data: { personType: string; personId: string; personName: string; checkInTime: string; checkOutTime?: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/staff-attendance", {
        ...data,
        date: dateStr,
        method: "Manual",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance"] });
      toast({ title: "Staff member marked present" });
      setSelectedStaffId("");
      setStaffCheckInTime(format(new Date(), "HH:mm"));
      setStaffCheckOutTime("");
      setStaffNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleMarkStaffPresent = () => {
    if (!selectedStaffId) {
      toast({ title: "Please select a staff member", variant: "destructive" });
      return;
    }

    const staff = filteredStaffUsers.find(u => u.id === selectedStaffId);
    if (!staff) return;

    markStaffPresentMutation.mutate({
      personType: staff.role,
      personId: staff.id,
      personName: `${staff.firstName} ${staff.lastName || ""}`.trim(),
      checkInTime: staffCheckInTime,
      checkOutTime: staffCheckOutTime || undefined,
      notes: staffNotes || undefined,
    });
  };

  // Self check-in mutation for staff
  const selfCheckInMutation = useMutation({
    mutationFn: async (data: { personType: string; personId: string; personName: string }) => {
      const res = await apiRequest("POST", "/api/staff-attendance", {
        ...data,
        date: dateStr,
        checkInTime: format(new Date(), "HH:mm"),
        method: "Self",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance"] });
      toast({ title: "Checked in successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSelfCheckIn = () => {
    if (!userRole || (userRole !== "trainer" && userRole !== "staff" && userRole !== "admin" && userRole !== "manager")) {
      toast({ title: "Not authorized", variant: "destructive" });
      return;
    }

    // Find the current user in staff list
    const res = staffUsers.find(u => u.role === userRole);
    if (!res) {
      toast({ title: "Could not find your profile", variant: "destructive" });
      return;
    }

    selfCheckInMutation.mutate({
      personType: res.role,
      personId: res.id,
      personName: `${res.firstName} ${res.lastName || ""}`.trim(),
    });
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "Biometric":
        return <Fingerprint className="h-4 w-4 text-primary" />;
      case "App QR":
        return <Smartphone className="h-4 w-4 text-accent" />;
      case "Self":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      default:
        return <UserCheck className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const sortedAttendance = useMemo(() => {
    return [...attendanceRecords].sort((a, b) => a.checkInTime.localeCompare(b.checkInTime));
  }, [attendanceRecords]);

  const sortedStaffAttendance = useMemo(() => {
    return [...filteredStaffAttendance].sort((a, b) => a.checkInTime.localeCompare(b.checkInTime));
  }, [filteredStaffAttendance]);

  // Delete attendance mutations
  const deleteAttendanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/attendance/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete attendance");
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

  const deleteStaffAttendanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/staff-attendance/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete staff attendance");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff-attendance"] });
      toast({ title: "Staff attendance record deleted" });
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

  const handleDeleteStaffAttendance = (id: string) => {
    if (confirm("Are you sure you want to delete this staff attendance record?")) {
      deleteStaffAttendanceMutation.mutate(id);
    }
  };

  const canDelete = userRole === "admin" || userRole === "manager";
  const canSelfCheckIn = userRole === "trainer" || userRole === "staff";

  const staffTypeLabel = (type: string) => {
    switch (type) {
      case "trainer": return "Trainer";
      case "staff": return "Staff";
      case "admin": return "Admin";
      case "manager": return "Manager";
      default: return type;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground" data-testid="heading-attendance">ATTENDANCE</h1>
          <p className="text-muted-foreground">Track member and staff check-ins via Biometric, App, or Manual entry.</p>
        </div>

        {canSelfCheckIn && (
          <Card className="bg-accent/10 backdrop-blur-sm border-accent">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Quick Self Check-in</p>
                  <p className="text-muted-foreground text-sm">Mark your own attendance for today</p>
                </div>
                <Button onClick={handleSelfCheckIn} disabled={selfCheckInMutation.isPending} className="gap-2">
                  {selfCheckInMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Check In Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AttendanceTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="members" data-testid="tab-members">Members</TabsTrigger>
            <TabsTrigger value="staff" data-testid="tab-staff">Trainers & Staff</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6 mt-6">
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
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-6 mt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Today's Check-ins</p>
                      <h3 className="text-3xl font-bold" data-testid="text-staff-todays-checkins">{todayStaffCheckInsCount}</h3>
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
                      <h3 className="text-3xl font-bold" data-testid="text-staff-peak-hour">{staffPeakHour}</h3>
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
                    <div className="flex items-center gap-3 flex-wrap">
                      <span>Daily Log</span>
                      <Select value={selectedStaffType} onValueChange={(v) => setSelectedStaffType(v as StaffTypeFilter)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="trainer">Trainers</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-[200px] justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                            data-testid="button-select-date-staff"
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
                  {isLoadingStaffAttendance ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : sortedStaffAttendance.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No staff attendance records for this date
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground uppercase text-xs font-medium">
                        <tr>
                          <th className="px-4 py-3">Time</th>
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3">Check-out</th>
                          <th className="px-4 py-3">Status</th>
                          {canDelete && <th className="px-4 py-3 w-[80px]">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sortedStaffAttendance.map((record) => (
                          <tr key={record.id} className="hover:bg-muted/30" data-testid={`row-staff-attendance-${record.id}`}>
                            <td className="px-4 py-3 font-mono text-muted-foreground">
                              {record.checkInTime}
                            </td>
                            <td className="px-4 py-3 font-medium">{record.personName}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {staffTypeLabel(record.personType)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {getMethodIcon(record.method)}
                                <span className="text-xs">{record.method}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-muted-foreground">
                              {record.checkOutTime || "--"}
                            </td>
                            <td className="px-4 py-3 text-green-500 font-medium text-xs">Present</td>
                            {canDelete && (
                              <td className="px-4 py-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteStaffAttendance(record.id)}
                                  disabled={deleteStaffAttendanceMutation.isPending}
                                  data-testid={`button-delete-staff-attendance-${record.id}`}
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
                    <label className="text-sm font-medium">Filter by Type</label>
                    <Select value={selectedStaffType} onValueChange={(v) => { setSelectedStaffType(v as StaffTypeFilter); setSelectedStaffId(""); }}>
                      <SelectTrigger data-testid="select-staff-type">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="trainer">Trainers</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Person</label>
                    <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                      <SelectTrigger data-testid="select-staff-attendance">
                        <SelectValue placeholder="Search..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredStaffUsers.map(s => (
                          <SelectItem key={s.id} value={s.id} data-testid={`option-staff-${s.id}`}>
                            {s.firstName} {s.lastName || ""} ({staffTypeLabel(s.role)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Check-in Time</label>
                    <Input
                      type="time"
                      value={staffCheckInTime}
                      onChange={(e) => setStaffCheckInTime(e.target.value)}
                      data-testid="input-staff-checkin-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Check-out Time (optional)</label>
                    <Input
                      type="time"
                      value={staffCheckOutTime}
                      onChange={(e) => setStaffCheckOutTime(e.target.value)}
                      data-testid="input-staff-checkout-time"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes (optional)</label>
                    <Input
                      type="text"
                      value={staffNotes}
                      onChange={(e) => setStaffNotes(e.target.value)}
                      placeholder="e.g., Half day, Leave early"
                      data-testid="input-staff-notes"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-2"
                      onClick={handleMarkStaffPresent}
                      disabled={!selectedStaffId || markStaffPresentMutation.isPending}
                      data-testid="button-mark-staff-present"
                    >
                      {markStaffPresentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CalendarCheck className="h-4 w-4" />
                      )}
                      Mark Present
                    </Button>
                    {selectedStaffId && (
                      <Button
                        variant="outline"
                        className="gap-2"
                        onClick={() => {
                          setSelectedStaffId("");
                          setStaffCheckInTime(format(new Date(), "HH:mm"));
                          setStaffCheckOutTime("");
                          setStaffNotes("");
                        }}
                        disabled={markStaffPresentMutation.isPending}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    You can mark the same person multiple times per day
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
