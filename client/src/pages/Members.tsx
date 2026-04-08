import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { imageService } from "@/lib/imageService";
import { Plus, Search, MoreHorizontal, FileEdit, Trash2, Eye, Heart, TrendingUp, Calendar as CalendarIcon, Download, UserPlus, RotateCcw, Loader2, Users, Upload, X, Brain } from "lucide-react";
import { useRef } from "react";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse, isValid, setMonth, setYear } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Member, MembershipPlan, Branch, WorkoutProgram, DietPlan, WorkoutProgramAssignment, DietPlanAssignment } from "@shared/schema";
import { Dumbbell, Utensils, Clock, Trophy } from "lucide-react";

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - 80 + i);

interface DatePickerWithNavProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  testId?: string;
}

function DatePickerWithNav({ date, onDateChange, placeholder = "dd-mm-yyyy", testId }: DatePickerWithNavProps) {
  const [inputValue, setInputValue] = useState(date ? format(date, "dd-MM-yyyy") : "");
  const [calendarMonth, setCalendarMonth] = useState<Date>(date || new Date());
  const [open, setOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    const parsed = parse(value, "dd-MM-yyyy", new Date());
    if (isValid(parsed) && value.length === 10) {
      onDateChange(parsed);
      setCalendarMonth(parsed);
    }
  };

  const handleCalendarSelect = (selectedDate: Date | undefined) => {
    onDateChange(selectedDate);
    if (selectedDate) {
      setInputValue(format(selectedDate, "dd-MM-yyyy"));
      setCalendarMonth(selectedDate);
    }
    setOpen(false);
  };

  const handleMonthChange = (monthIndex: string) => {
    const newDate = setMonth(calendarMonth, parseInt(monthIndex));
    setCalendarMonth(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = setYear(calendarMonth, parseInt(year));
    setCalendarMonth(newDate);
  };

  return (
    <div className="flex gap-2">
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="bg-background border-border h-11 flex-1"
        data-testid={testId}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex items-center justify-between gap-2 p-3 border-b">
            <Select value={calendarMonth.getMonth().toString()} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, idx) => (
                  <SelectItem key={month} value={idx.toString()}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={calendarMonth.getFullYear().toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[90px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

const sourceOptions = ["Walk-in", "Instagram", "Facebook", "Referral", "Website", "Other"];
const paymentMethods = ["Cash", "UPI / GPay", "Card", "Bank Transfer"];

interface InterestOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface HealthOption {
  id: string;
  name: string;
  isActive: boolean;
}

// Memoized profile picture loader to prevent infinite re-renders
const useProfilePictureLoader = (member: Member) => {
  return useCallback(async (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    
    try {
      // Use the image service to fetch the avatar
      const blobUrl = await imageService.getAvatarBlobUrl(member.avatarStaticUrl || member.avatar);
      
      if (blobUrl) {
        target.src = blobUrl;
        target.onerror = () => {
          // If blob URL fails, show initials
          target.style.display = 'none';
          const fallbackDiv = document.createElement('div');
          fallbackDiv.className = 'h-full w-full flex items-center justify-center text-2xl font-bold text-primary';
          fallbackDiv.textContent = member.firstName?.charAt(0) || "?";
          target.parentElement?.appendChild(fallbackDiv);
        };
      } else {
        // If no blob URL, show initials
        target.style.display = 'none';
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'h-full w-full flex items-center justify-center text-2xl font-bold text-primary';
        fallbackDiv.textContent = member.firstName?.charAt(0) || "?";
        target.parentElement?.appendChild(fallbackDiv);
      }
    } catch (error) {
      console.error('Failed to load avatar:', error);
      // If error, show initials
      target.style.display = 'none';
      const fallbackDiv = document.createElement('div');
      fallbackDiv.className = 'h-full w-full flex items-center justify-center text-2xl font-bold text-primary';
      fallbackDiv.textContent = member.firstName?.charAt(0) || "?";
      target.parentElement?.appendChild(fallbackDiv);
    }
  }, [member.avatarStaticUrl, member.avatar, member.firstName]);
};

// Fallback initials component to prevent infinite rendering
const ProfileInitialsFallback = ({ member }: { member: Member }) => {
  const initials = useMemo(() => {
    return member.firstName?.charAt(0) || "?";
  }, [member.firstName]);

  return (
    <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-primary">
      {initials}
    </div>
  );
};

// Optimized profile picture component
const ProfilePicture = ({ member, memberName }: { member: Member; memberName?: string }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setHasError(false);
    setImageSrc(null);
    setIsLoading(false);
    
    if (member.avatarStaticUrl || member.avatar) {
      const avatarUrl = member.avatarStaticUrl || member.avatar;
      
      // If the URL is already a full HTTP URL (local or Supabase), use it directly
      if (avatarUrl && avatarUrl.startsWith('http')) {
        setImageSrc(avatarUrl);
        return;
      }
      
      // Otherwise, try to convert to blob URL
      setIsLoading(true);
      imageService.getAvatarBlobUrl(avatarUrl || "", memberName)
        .then(blobUrl => {
          setImageSrc(blobUrl);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Failed to load avatar:', error);
          setHasError(true);
          setIsLoading(false);
        });
    }
  }, [member.avatarStaticUrl, member.avatar, memberName]);

  const handleImageError = () => {
    setHasError(true);
    setImageSrc(null);
  };

  // If no avatar exists, show initials immediately
  if (!member.avatarStaticUrl && !member.avatar) {
    return <ProfileInitialsFallback member={member} />;
  }

  // If there's an error loading the image, show initials
  if (hasError) {
    return <ProfileInitialsFallback member={member} />;
  }

  return (
    <img
      src={imageSrc || undefined}
      alt="Profile"
      className="h-full w-full object-cover"
      onError={handleImageError}
    />
  );
};

export default function Members() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterBranch, setFilterBranch] = useState("all");
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dob, setDob] = useState<Date>();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    gender: "male",
    source: "",
    interestAreas: [] as string[],
    healthBackground: "",
    height: "",
    plan: "",
    discount: "0",
    originalAmount: "0",
    amountPaid: "",
    paymentMethod: "",
    assignedStaff: "",
    branch: "",
  });

  const { data: members = [], isLoading } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const { data: plans = [] } = useQuery<MembershipPlan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: interestOptionsFromApi = [] } = useQuery<InterestOption[]>({
    queryKey: ["/api/options/interests"],
  });

  const { data: healthOptionsFromApi = [] } = useQuery<HealthOption[]>({
    queryKey: ["/api/options/health"],
  });

  const interestOptions = useMemo(() => 
    interestOptionsFromApi.filter((opt: InterestOption) => opt.isActive).map((opt: InterestOption) => opt.name),
    [interestOptionsFromApi]
  );

  const healthOptions = useMemo(() => 
    healthOptionsFromApi.filter((opt: HealthOption) => opt.isActive).map((opt: HealthOption) => opt.name),
    [healthOptionsFromApi]
  );

  // Fetch member credits for all members
  const { data: allMemberCredits = [], isLoading: creditsLoading, error: creditsError } = useQuery({
    queryKey: ["members/credits"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/members/credits");
        if (!res.ok) {
          console.error("Failed to fetch credits, status:", res.status);
          return [];
        }
        const data = await res.json();
        console.log("Fetched member credits:", data);
        return data;
      } catch (error) {
        console.error("Error fetching member credits:", error);
        return [];
      }
    },
    retry: 2,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Create a Map for O(1) credit lookups instead of O(n) find()
  const creditMap = useMemo(() => {
    const map = new Map();
    console.log("Creating credit map, allMemberCredits:", allMemberCredits);
    allMemberCredits.forEach((c: any) => {
      console.log("Credit record:", c, "memberId:", c.memberId, "balance:", c.balance);
      map.set(c.memberId, c.balance ?? 5);
    });
    return map;
  }, [allMemberCredits]);

  // Helper to get credit balance for a member
  const getMemberCredits = (memberId: string) => {
    const credits = creditMap.get(memberId);
    console.log("getMemberCredits called for:", memberId, "result:", credits);
    return credits ?? 5;
  };

  const { data: workoutPrograms = [] } = useQuery<WorkoutProgram[]>({
    queryKey: ["/api/workout-programs"],
  });

  const { data: dietPlans = [] } = useQuery<DietPlan[]>({
    queryKey: ["/api/diet-plans"],
  });

  const { data: memberWorkoutAssignments = [] } = useQuery<WorkoutProgramAssignment[]>({
    queryKey: ["/api/members", selectedMember?.id, "workout-assignments"],
    queryFn: async () => {
      if (!selectedMember?.id) return [];
      const res = await apiRequest("GET", `/api/members/${selectedMember.id}/workout-assignments`);
      return res.json();
    },
    enabled: !!selectedMember?.id && detailsOpen,
  });

  const { data: memberDietAssignments = [] } = useQuery<DietPlanAssignment[]>({
    queryKey: ["/api/members", selectedMember?.id, "diet-assignments"],
    queryFn: async () => {
      if (!selectedMember?.id) return [];
      const res = await apiRequest("GET", `/api/members/${selectedMember.id}/diet-assignments`);
      return res.json();
    },
    enabled: !!selectedMember?.id && detailsOpen,
  });

  const memberWorkouts = workoutPrograms.filter(wp => 
    memberWorkoutAssignments.some(a => a.programId === wp.id)
  );

  const memberDiets = dietPlans.filter(dp => 
    memberDietAssignments.some(a => a.dietPlanId === dp.id)
  );

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/members", {
        ...data,
        height: data.height ? parseInt(data.height) : null,
        discount: parseInt(data.discount) || 0,
        totalDue: parseInt(data.originalAmount) || 0,
        originalAmount: parseInt(data.originalAmount) || 0,
        amountPaid: parseInt(data.amountPaid) || 0,
        dob: dob ? format(dob, "yyyy-MM-dd") : null,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${data.firstName}`,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Member added successfully" });
      resetForm();
      setOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });



  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Member deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`/api/members/${id}/avatar`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload avatar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Avatar uploaded successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
        return;
      }
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({ title: "Error", description: "Only JPEG, PNG, GIF, and WebP images are allowed", variant: "destructive" });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setAvatarPreview(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      gender: "male",
      source: "",
      interestAreas: [],
      healthBackground: "",
      height: "",
      plan: "",
      discount: "0",
      originalAmount: "0",
      amountPaid: "",
      paymentMethod: "",
      assignedStaff: "",
      branch: "",
    });
    setDob(undefined);
    setStartDate(new Date());
    setEndDate(new Date());
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenAdd = () => {
    resetForm();
    setOpen(true);
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this member?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenDetails = (member: Member) => {
    setSelectedMember(member);
    setDetailsOpen(true);
  };

  const filteredMembers = members.filter(member => {
    const fullName = `${member.firstName} ${member.lastName || ""}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                          (member.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPlan = filterPlan === "all" || member.plan === filterPlan;
    const matchesBranch = filterBranch === "all" || member.branch === filterBranch;
    return matchesSearch && matchesPlan && matchesBranch;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Active": return "bg-green-500/20 text-green-500 border-green-500/30";
      case "Expiring Soon": return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      case "Expired": return "bg-red-500/20 text-red-600 border-red-500/30";
      case "Pending Payment": return "bg-orange-500/20 text-orange-500 border-orange-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const uniquePlans = Array.from(new Set(members.map(m => m.plan)));
  const branchCount = filterBranch === "all"
    ? members.length
    : members.filter(m => m.branch === filterBranch).length;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-3">
              <h1 className="text-4xl font-bold font-heading text-foreground uppercase tracking-tight">MEMBERS</h1>
              <div className="text-lg font-semibold text-primary">{filterBranch === "all" ? "All Branches" : filterBranch} ({branchCount})</div>
            </div>
            <p className="text-muted-foreground">Manage all gym members and their subscriptions.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-border hover:bg-muted font-bold uppercase tracking-wider">
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button 
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 font-bold uppercase tracking-wider" 
              onClick={handleOpenAdd}
              data-testid="button-add-member"
            >
              <UserPlus className="h-4 w-4" /> Add New Member
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-card/50 p-4 rounded-lg border border-border backdrop-blur-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search members by name or email..." 
              className="pl-10 bg-background" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-members"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <select 
              className="px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:border-primary transition-colors font-bold uppercase tracking-tighter text-xs"
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
            >
              <option value="all">All Plans</option>
              {uniquePlans.map(plan => (
                <option key={plan} value={plan}>{plan}</option>
              ))}
            </select>

            <select
              className="px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:border-primary transition-colors font-bold uppercase tracking-tighter text-xs"
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
            >
              <option value="all">All Branches</option>
              {branches.map((b: any) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No members found</p>
            <p className="text-sm">{searchQuery ? "Try a different search" : "Add your first member to get started"}</p>
          </div>
        ) : (
          <Tabs defaultValue="grid" className="w-full">
            <TabsList className="bg-muted p-1 rounded-lg mb-6">
              <TabsTrigger value="grid" className="px-6 data-[state=active]:bg-background">Grid View</TabsTrigger>
              <TabsTrigger value="list" className="px-6 data-[state=active]:bg-background">List View</TabsTrigger>
            </TabsList>

            <TabsContent value="grid" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredMembers.map((member) => (
                  <Card key={member.id} className="bg-card/50 backdrop-blur-sm border-t-4 border-t-primary hover:border-t-accent group transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-primary/20" data-testid={`card-member-${member.id}`}>
                    <div className="h-24 bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center relative">
                        <div className="absolute -bottom-6 left-6">
                          <div className="h-16 w-16 rounded-full border-4 border-card overflow-hidden bg-background shadow-lg flex items-center justify-center text-2xl font-bold text-primary">
                            <ProfilePicture member={member} memberName={`${member.firstName} ${member.lastName}`} />
                          </div>
                        </div>
                      <div className="absolute top-3 right-3">
                        <Badge className={`${getStatusColor(member.status)} border font-bold uppercase text-[10px] tracking-wider`}>
                          {member.status}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="pt-10 pb-4">
                      <div className="space-y-3 mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-foreground tracking-tight uppercase">{member.firstName} {member.lastName}</h3>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1 uppercase font-bold text-[10px] tracking-widest">
                              <CalendarIcon className="h-3 w-3" /> Plan:
                            </span>
                            <span className="font-bold text-accent uppercase text-xs">{member.plan}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest">Expires:</span>
                            <span className="font-mono text-xs font-bold">{member.endDate}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground uppercase font-bold text-[10px] tracking-widest">Branch:</span>
                            <span className="text-sm font-semibold">{member.branch || "Not set"}</span>
                          </div>
                          {/* <div className="flex items-center justify-between">
                            <span className="text-muted-foreground flex items-center gap-1 uppercase font-bold text-[10px] tracking-widest">
                              <Brain className="h-3 w-3" /> Credits:
                            </span>
                            <span className="font-bold text-green-500 text-xs">{getMemberCredits(member.id)}</span>
                          </div> */}
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Link href={`/members/${member.id}`} className="flex-1">
                          <Button size="sm" variant="default" className="w-full gap-2" data-testid={`button-view-member-${member.id}`}>
                            <Eye className="h-4 w-4" /> View Profile
                          </Button>
                        </Link>
                        <Button size="sm" variant="destructive" className="w-10" onClick={() => handleDelete(member.id)} data-testid={`button-delete-member-${member.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="list" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-card rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Member</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Plan</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Branch</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                      {/* <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Credits</th> */}
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Expires</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-muted/30">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full border-4 border-card overflow-hidden bg-background shadow-lg flex items-center justify-center text-2xl font-bold text-primary">
                            <ProfilePicture member={member} />
                          </div>
                            <div>
                              <div className="font-bold">{member.firstName} {member.lastName}</div>
                              <div className="text-xs text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium">{member.plan}</td>
                        <td className="px-4 py-4 text-sm">{member.branch || "Not set"}</td>
                        <td className="px-4 py-4">
                          <Badge className={`${getStatusColor(member.status)} border`}>{member.status}</Badge>
                        </td>
                        {/* <td className="px-4 py-4">
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            <Brain className="h-3 w-3 mr-1" />
                            {getMemberCredits(member.id)}
                          </Badge>
                        </td> */}
                        <td className="px-4 py-4 text-sm font-mono">{member.endDate}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <Link href={`/members/${member.id}`}>
                              <Button size="sm" variant="outline" className="gap-2">
                                <Eye className="h-4 w-4" />
                                View
                              </Button>
                            </Link>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(member.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetForm(); }}>
          <SheetContent className="sm:max-w-xl w-full bg-card border-l border-border overflow-y-auto">
            <SheetHeader className="border-b border-border pb-6 mb-6">
              <SheetTitle className="text-2xl font-bold font-heading text-primary uppercase tracking-tight">
                Add Member
              </SheetTitle>
            </SheetHeader>
            
            {/* Avatar Upload Section */}
            <div className="flex flex-col items-center mb-6">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
              />
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-primary shadow-lg">
                  <AvatarImage src={avatarPreview || undefined} />
                  <AvatarFallback className="text-3xl font-bold bg-primary/20 text-primary">
                    {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                {avatarPreview ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md"
                    onClick={handleRemoveAvatar}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="mt-3 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreview ? "Change Photo" : "Upload Photo"}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1">JPEG, PNG, GIF, WebP (max 5MB)</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="First Name" 
                    className="bg-background border-border h-11" 
                    required 
                    data-testid="input-first-name" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Name</Label>
                  <Input 
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Last Name" 
                    className="bg-background border-border h-11" 
                    data-testid="input-last-name" 
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Address</Label>
                  <Input 
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Address" 
                    className="bg-background border-border h-11" 
                    data-testid="input-address" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="xyz@gmail.com" 
                    className="bg-background border-border h-11" 
                    data-testid="input-email" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9999999999" 
                    className="bg-background border-border h-11" 
                    required 
                    data-testid="input-phone" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Source <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.source} onValueChange={(val) => setFormData({ ...formData, source: val })} required>
                    <SelectTrigger className="bg-background border-border h-11">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Interest Areas</Label>
                  <MultiSelectDropdown
                    value={formData.interestAreas}
                    onValueChange={(vals) => setFormData({ ...formData, interestAreas: vals })}
                    options={interestOptions}
                    placeholder="Select Interest Areas"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Health Background</Label>
                  <Select value={formData.healthBackground} onValueChange={(val) => setFormData({ ...formData, healthBackground: val })}>
                    <SelectTrigger className="bg-background border-border h-11">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {healthOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Gender <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup value={formData.gender} onValueChange={(val) => setFormData({ ...formData, gender: val })} className="flex gap-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male-m" className="border-primary" />
                      <Label htmlFor="male-m" className="text-sm">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female-m" className="border-primary" />
                      <Label htmlFor="female-m" className="text-sm">Female</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other-m" className="border-primary" />
                      <Label htmlFor="other-m" className="text-sm">Other</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date of Birth</Label>
                  <DatePickerWithNav date={dob} onDateChange={setDob} testId="input-member-dob" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Height (cm)</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      placeholder="182" 
                      className="bg-background border-border h-11" 
                      data-testid="input-height" 
                    />
                    <div className="bg-muted px-3 flex items-center rounded border border-border text-xs font-bold">cm</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Plan <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.plan} onValueChange={(val) => {
                    const selectedPlan = plans.find(p => p.name === val);
                    setFormData({ 
                      ...formData, 
                      plan: val,
                      originalAmount: selectedPlan ? selectedPlan.price.toString() : "0"
                    });
                  }} required>
                    <SelectTrigger className="bg-background border-border h-11">
                      <SelectValue placeholder="Select Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map(plan => (
                        <SelectItem key={plan.id} value={plan.name}>{plan.name} - ₹{plan.price}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                  <DatePickerWithNav date={startDate} onDateChange={(d) => d && setStartDate(d)} testId="input-start-date" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date</Label>
                  <DatePickerWithNav date={endDate} onDateChange={(d) => d && setEndDate(d)} testId="input-end-date" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Discount (%)</Label>
                  <Input 
                    type="number" 
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    className="bg-background border-border h-11" 
                    data-testid="input-discount" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Payment Method <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.paymentMethod} onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })} required>
                    <SelectTrigger className="bg-background border-border h-11">
                      <SelectValue placeholder="Select Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Original Amount (₹)
                  </Label>
                  <Input 
                    type="number"
                    value={formData.originalAmount}
                    onChange={(e) => setFormData({ ...formData, originalAmount: e.target.value })}
                    placeholder="Original Amount" 
                    className="bg-background border-border h-11" 
                    data-testid="input-original-amount" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Discount %
                  </Label>
                  <Input 
                    type="number"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                    placeholder="0" 
                    className="bg-background border-border h-11" 
                    data-testid="input-discount-percentage" 
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Final Amount (₹)
                  </Label>
                  <div className="bg-muted/30 border border-border rounded-md h-11 px-4 flex items-center font-semibold text-green-600">
                    ₹{(() => {
                      const original = parseInt(formData.originalAmount, 10) || 0;
                      const discount = parseInt(formData.discount, 10) || 0;
                      return Math.round(original * (1 - discount / 100)).toLocaleString("en-IN");
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Amount Paid (₹) <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    type="number"
                    value={formData.amountPaid}
                    onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                    placeholder="Amount Paid" 
                    className="bg-background border-border h-11" 
                    required 
                    data-testid="input-amount-paid" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Branch</Label>
                  <Select value={formData.branch} onValueChange={(val) => setFormData({ ...formData, branch: val })}>
                    <SelectTrigger className="bg-background border-border h-11" data-testid="select-member-branch">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-6 border-t border-border mt-8">
                <Button
                  type="submit"
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-base"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-member"
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Member
                </Button>
                <SheetClose asChild>
                  <Button type="button" variant="outline" className="w-full h-12 border-border hover:bg-muted font-bold uppercase tracking-wider">Cancel</Button>
                </SheetClose>
              </div>
            </form>
          </SheetContent>
        </Sheet>

        <Sheet open={detailsOpen} onOpenChange={(val) => { setDetailsOpen(val); if (!val) setSelectedMember(null); }}>
          <SheetContent className="sm:max-w-2xl w-full bg-card border-l border-border overflow-y-auto">
            <SheetHeader className="border-b border-border pb-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                  {selectedMember?.firstName?.charAt(0)}
                </div>
                <div>
                  <SheetTitle className="text-2xl font-bold font-heading text-foreground uppercase tracking-tight">
                    {selectedMember?.firstName} {selectedMember?.lastName}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">{selectedMember?.email}</p>
                </div>
              </div>
            </SheetHeader>
            
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="bg-muted p-1 rounded-lg mb-6 w-full">
                <TabsTrigger value="profile" className="flex-1 data-[state=active]:bg-background">Profile</TabsTrigger>
                <TabsTrigger value="workouts" className="flex-1 data-[state=active]:bg-background">Workouts</TabsTrigger>
                <TabsTrigger value="diets" className="flex-1 data-[state=active]:bg-background">Diets</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6 animate-in fade-in">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal Details</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-background border border-border">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Phone</p>
                      <p className="font-medium">{selectedMember?.phone || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Gender</p>
                      <p className="font-medium capitalize">{selectedMember?.gender || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Date of Birth</p>
                      <p className="font-medium">{selectedMember?.dob || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Height</p>
                      <p className="font-medium">{selectedMember?.height ? `${selectedMember.height} cm` : "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground uppercase font-bold">Address</p>
                      <p className="font-medium">{selectedMember?.address || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Health Background</p>
                      <p className="font-medium">{selectedMember?.healthBackground || "None"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Interest Areas</p>
                      <p className="font-medium">{selectedMember?.interestAreas?.join(", ") || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Package Details</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-background border border-border">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Plan</p>
                      <p className="font-medium text-primary">{selectedMember?.plan}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Status</p>
                      <Badge className={`${getStatusColor(selectedMember?.status || "")} border`}>{selectedMember?.status}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Start Date</p>
                      <p className="font-mono text-sm">{selectedMember?.startDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">End Date</p>
                      <p className="font-mono text-sm">{selectedMember?.endDate}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Branch</p>
                      <p className="font-medium">{selectedMember?.branch || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Assigned Staff</p>
                      <p className="font-medium">{selectedMember?.assignedStaff || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Details</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-background border border-border">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Total Due</p>
                      <p className="font-bold text-lg">₹{selectedMember?.totalDue || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Amount Paid</p>
                      <p className="font-bold text-lg text-green-500">₹{selectedMember?.amountPaid || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Discount</p>
                      <p className="font-medium">{selectedMember?.discount || 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold">Payment Method</p>
                      <p className="font-medium">{selectedMember?.paymentMethod || "-"}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="workouts" className="space-y-4 animate-in fade-in">
                {memberWorkouts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No workout programs assigned</p>
                  </div>
                ) : (
                  memberWorkouts.map((program) => {
                    const exercises = program.exercises as { name: string; sets: number; reps: string; weight: string; rest: string }[];
                    return (
                      <Card key={program.id} className="bg-background border border-border">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Dumbbell className="h-5 w-5 text-primary" />
                              <CardTitle className="text-lg uppercase tracking-tight">{program.name}</CardTitle>
                            </div>
                            <Badge variant="outline">{program.difficulty}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{program.day}</p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{program.duration} mins</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Trophy className="h-4 w-4 text-muted-foreground" />
                              <span>{program.goal}</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {exercises?.slice(0, 3).map((ex, i) => (
                              <div key={i} className="text-sm p-2 rounded bg-muted/50">
                                <span className="font-medium">{ex.name}</span>
                                <span className="text-muted-foreground ml-2">{ex.sets}x{ex.reps}</span>
                              </div>
                            ))}
                            {exercises?.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{exercises.length - 3} more exercises</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="diets" className="space-y-4 animate-in fade-in">
                {memberDiets.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No diet plans assigned</p>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const totalCalories = memberDiets.reduce((sum, p) => sum + p.calories, 0);
                      const totalProtein = memberDiets.reduce((sum, p) => sum + p.protein, 0);
                      const totalCarbs = memberDiets.reduce((sum, p) => sum + p.carbs, 0);
                      const totalFat = memberDiets.reduce((sum, p) => sum + p.fat, 0);
                      const maxMacro = Math.max(totalProtein, totalCarbs, totalFat, 1);
                      return (
                        <Card className="bg-background border border-border mb-4">
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rotate-45 border-2 border-primary flex items-center justify-center">
                                <div className="h-2 w-2 bg-primary rotate-45"></div>
                              </div>
                              <CardTitle className="text-sm uppercase tracking-wider">Nutrition Summary</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-6">
                              <div className="p-4 rounded-lg border border-border">
                                <p className="text-xs text-muted-foreground uppercase font-bold mb-2">Total Daily Intake</p>
                                <p className="text-4xl font-bold">{totalCalories}</p>
                                <p className="text-sm text-muted-foreground">Calories</p>
                              </div>
                              <div className="p-4 rounded-lg border border-border">
                                <p className="text-xs text-muted-foreground uppercase font-bold mb-3">Macros (Daily)</p>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs w-12 text-muted-foreground">PROTEIN</span>
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-500 rounded-full" style={{width: `${(totalProtein / maxMacro) * 100}%`}}></div>
                                    </div>
                                    <span className="text-xs font-bold text-blue-500">{totalProtein}g</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs w-12 text-muted-foreground">CARBS</span>
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-green-500 rounded-full" style={{width: `${(totalCarbs / maxMacro) * 100}%`}}></div>
                                    </div>
                                    <span className="text-xs font-bold text-green-500">{totalCarbs}g</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs w-12 text-muted-foreground">FAT</span>
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-orange-500 rounded-full" style={{width: `${(totalFat / maxMacro) * 100}%`}}></div>
                                    </div>
                                    <span className="text-xs font-bold text-orange-500">{totalFat}g</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  {memberDiets.map((plan) => {
                    const foods = plan.foods as string[];
                    return (
                      <Card key={plan.id} className="bg-background border border-border">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Utensils className="h-5 w-5 text-accent" />
                              <CardTitle className="text-lg uppercase tracking-tight">{plan.meal}</CardTitle>
                            </div>
                            <span className="text-sm font-mono text-accent bg-accent/10 px-2 py-1 rounded">
                              {plan.calories} kcal
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {foods?.map((food, i) => (
                              <Badge key={i} variant="outline" className="bg-background">{food}</Badge>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border">
                            <div>
                              <p className="text-lg font-bold text-blue-500">{plan.protein}g</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">Protein</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-green-500">{plan.carbs}g</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">Carbs</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-orange-500">{plan.fat}g</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">Fat</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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
