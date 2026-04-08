import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Phone,
  MessageCircle,
  UserCheck,
  Loader2,
  Users,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePickerWithNav } from "@/components/ui/date-picker-with-nav";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Lead, MembershipPlan, Branch, User } from "@shared/schema";


const sourceOptions = ["Walk-in", "Instagram", "Facebook", "Referral", "Website", "Other"];
const priorityOptions = ["high", "medium", "low"];
const paymentMethods = ["Cash", "UPI / GPay", "Card", "Bank Transfer"];

export default function Leads() {
  const [openAdd, setOpenAdd] = useState(false);
  const [openConvert, setOpenConvert] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "follow_up" | "converted" | "rejected">("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [followUpDate, setFollowUpDate] = useState<Date>();
  const [dob, setDob] = useState<Date>();

    const [formData, setFormData] = useState({
      firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    gender: "male",
    interestAreas: [] as string[],
    healthBackground: "",
    source: "",
    priority: "medium",
    assignedStaff: "",
    height: "",
    notes: "",
    followUpCompleted: false,
    branch: "",
    status: "new", // Add status field with default "new" (Pending)
  });

  const [convertDob, setConvertDob] = useState<Date>();
  const [convertStartDate, setConvertStartDate] = useState<Date>(new Date());
  const [convertEndDate, setConvertEndDate] = useState<Date>(new Date());
  const [convertForm, setConvertForm] = useState({
    height: "",
    plan: "",
    discount: "0",
    totalDue: "0",
    amountPaid: "",
    paymentMethod: "",
    branch: "",
  });

  // Track if end date has been manually edited
  const [isEndDateManuallyEdited, setIsEndDateManuallyEdited] = useState(false);

  // Validation state
  const [convertErrors, setConvertErrors] = useState({
    plan: "",
    startDate: "",
    endDate: "",
    paymentMethod: "",
    amountPaid: "",
    height: "",
    totalDue: "",
  });

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: plans = [] } = useQuery<MembershipPlan[]>({
    queryKey: ["/api/plans"],
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: staffUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(user => 
      user.role === "staff" || user.role === "manager" || user.role === "admin"
    ),
  });

  // Fetch interest options from API
  const { data: apiInterestOptions = [] } = useQuery<Array<{id: string; name: string; isActive: boolean}>>({
    queryKey: ["/api/options/interests"],
  });

  // Fetch health options from API
  const { data: apiHealthOptions = [] } = useQuery<Array<{id: string; name: string; isActive: boolean}>>({
    queryKey: ["/api/options/health"],
  });

  // Filter active options for dropdowns
  const interestOptions = apiInterestOptions.filter(o => o.isActive !== false).map(o => o.name);
  const healthOptions = apiHealthOptions.filter(o => o.isActive !== false).map(o => o.name);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/leads", {
        ...data,
        height: data.height ? parseInt(data.height) : null,
        followUpDate: followUpDate ? format(followUpDate, "yyyy-MM-dd") : null,
        dob: dob ? format(dob, "yyyy-MM-dd") : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead added successfully" });
      resetForm();
      setOpenAdd(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, {
        ...data,
        height: data.height ? parseInt(data.height) : null,
        followUpDate: followUpDate ? format(followUpDate, "yyyy-MM-dd") : null,
        dob: dob ? format(dob, "yyyy-MM-dd") : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead updated successfully" });
      resetForm();
      setOpenAdd(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/members", data);
      return res.json();
    },
    onSuccess: async () => {
      if (convertingLead) {
        await apiRequest("PATCH", `/api/leads/${convertingLead.id}`, { status: "converted" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead converted to member successfully" });
      resetConvertForm();
      setOpenConvert(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      gender: "male",
      interestAreas: [],
      healthBackground: "",
      source: "",
      priority: "medium",
      assignedStaff: "",
      height: "",
      notes: "",
      followUpCompleted: false,
      branch: "",
      status: "new",
    });
    setFollowUpDate(undefined);
    setDob(undefined);
    setEditingLead(null);
  };

  const resetConvertForm = () => {
    setConvertForm({
      height: "",
      plan: "",
      discount: "0",
      totalDue: "0",
      amountPaid: "",
      paymentMethod: "",
      branch: "",
    });
    setConvertDob(undefined);
    setConvertStartDate(new Date());
    setConvertEndDate(new Date());
    setConvertingLead(null);
    // Clear all validation errors
    setConvertErrors({
      plan: "",
      startDate: "",
      endDate: "",
      paymentMethod: "",
      amountPaid: "",
      height: "",
      totalDue: "",
    });
  };

  // Validation function for convert form - memoized to prevent re-renders
  const validateConvertForm = useCallback(() => {
    const errors: typeof convertErrors = {
      plan: "",
      startDate: "",
      endDate: "",
      paymentMethod: "",
      amountPaid: "",
      height: "",
      totalDue: "",
    };
    let isValid = true;

    // Plan validation
    if (!convertForm.plan) {
      errors.plan = "Please select a membership plan";
      isValid = false;
    }

    // Start Date validation
    if (!convertStartDate) {
      errors.startDate = "Please select a start date";
      isValid = false;
    }

    // End Date validation
    if (!convertEndDate) {
      errors.endDate = "Please select an end date";
      isValid = false;
    } else if (convertStartDate && convertEndDate && convertEndDate <= convertStartDate) {
      errors.endDate = "End date must be after start date";
      isValid = false;
    }

    // Payment Method validation
    if (!convertForm.paymentMethod) {
      errors.paymentMethod = "Please select a payment method";
      isValid = false;
    }

    // Amount Paid validation
    if (!convertForm.amountPaid) {
      errors.amountPaid = "Please enter amount paid";
      isValid = false;
    } else {
      const amountPaid = parseInt(convertForm.amountPaid);
      const totalDue = parseInt(convertForm.totalDue || "0");
      if (isNaN(amountPaid) || amountPaid < 0) {
        errors.amountPaid = "Please enter a valid amount";
        isValid = false;
      } else if (amountPaid > totalDue) {
        errors.amountPaid = "Amount paid cannot exceed total due";
        isValid = false;
      }
    }

    // Height validation (make it required)
    if (!convertForm.height) {
      errors.height = "Please enter height";
      isValid = false;
    } else {
      const height = parseInt(convertForm.height);
      if (isNaN(height) || height <= 0 || height > 300) {
        errors.height = "Please enter a valid height (1-300 cm)";
        isValid = false;
      }
    }

    // Total Due validation (make it required)
    if (!convertForm.totalDue) {
      errors.totalDue = "Please enter total due amount";
      isValid = false;
    } else {
      const totalDue = parseInt(convertForm.totalDue);
      if (isNaN(totalDue) || totalDue < 0) {
        errors.totalDue = "Please enter a valid total due amount";
        isValid = false;
      }
    }

    setConvertErrors(errors);
    return isValid;
  }, [convertForm.plan, convertForm.paymentMethod, convertForm.amountPaid, convertForm.totalDue, convertForm.height, convertStartDate, convertEndDate]);

  // Helper function to find plan by name
  const findPlanByName = (planName: string) => {
    return plans.find(plan => plan.name === planName);
  };

  // Helper function to calculate end date based on plan duration
  const calculateEndDate = (startDate: Date, durationMonths: number) => {
    return addMonths(startDate, durationMonths);
  };

  // Form change handlers with validation
  const handleConvertFormChange = (field: keyof typeof convertForm, value: string) => {
    const previousPlan = convertForm.plan;
    setConvertForm(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (convertErrors[field as keyof typeof convertErrors]) {
      setConvertErrors(prev => ({ ...prev, [field]: "" }));
    }

    // Handle plan change - auto-calculate dates and total due
    if (field === 'plan' && value) {
      const selectedPlan = findPlanByName(value);
      console.log("Plan selected:", { 
        planName: value, 
        selectedPlan,
        durationMonths: selectedPlan?.durationMonths 
      });
      
      if (selectedPlan) {
        // Auto-populate total due with plan price
        setConvertForm(prev => ({ ...prev, totalDue: selectedPlan.price.toString() }));
        
        // Only auto-calculate if end date hasn't been manually edited
        if (!isEndDateManuallyEdited) {
          const newEndDate = calculateEndDate(convertStartDate, selectedPlan.durationMonths);
          console.log("Auto-calculating end date:", {
            startDate: convertStartDate,
            durationMonths: selectedPlan.durationMonths,
            calculatedEndDate: newEndDate,
            dateString: newEndDate.toISOString(),
            formatted: format(newEndDate, "dd-MM-yyyy")
          });
          setConvertEndDate(newEndDate);
          console.log("convertEndDate state updated to:", newEndDate);
        } else {
          console.log("End date was manually edited, preserving user's choice");
        }
        
        // Clear validation errors
        setConvertErrors(prev => ({ 
          ...prev, 
          plan: "", 
          totalDue: "",
          endDate: "" 
        }));
      }
    }
  };

  const handleConvertDateChange = (field: 'startDate' | 'endDate', date: Date | undefined) => {
    if (field === 'startDate') {
      const newStartDate = date || new Date();
      setConvertStartDate(newStartDate);
      
      // Clear start date error
      if (convertErrors.startDate) {
        setConvertErrors(prev => ({ ...prev, startDate: "" }));
      }

      // Recalculate end date if a plan is selected
      if (convertForm.plan) {
        const selectedPlan = findPlanByName(convertForm.plan);
        if (selectedPlan) {
          const newEndDate = calculateEndDate(newStartDate, selectedPlan.durationMonths);
          console.log("Recalculating end date due to start date change:", {
            newStartDate,
            durationMonths: selectedPlan.durationMonths,
            calculatedEndDate: newEndDate,
            isEndDateManuallyEdited
          });
          
          // Only update if end date hasn't been manually edited
          if (!isEndDateManuallyEdited) {
            setConvertEndDate(newEndDate);
          }
          
          // Clear end date error
          if (convertErrors.endDate) {
            setConvertErrors(prev => ({ ...prev, endDate: "" }));
          }
        }
      }
    } else {
      setConvertEndDate(date || new Date());
      // Mark as manually edited when user changes end date
      setIsEndDateManuallyEdited(true);
      console.log("End date manually edited:", date);
      
      // Clear end date error and revalidate
      if (convertErrors.endDate) {
        setConvertErrors(prev => ({ ...prev, endDate: "" }));
      }
    }
  };

  const handleOpenAdd = () => {
    resetForm();
    setOpenAdd(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      firstName: lead.firstName,
      lastName: lead.lastName || "",
      email: lead.email || "",
      phone: lead.phone,
      address: lead.address || "",
      gender: lead.gender,
      interestAreas: lead.interestAreas || [],
      healthBackground: lead.healthBackground || "",
      source: lead.source,
      priority: lead.priority,
      assignedStaff: lead.assignedStaff || "",
      height: lead.height?.toString() || "",
      notes: lead.notes || "",
      followUpCompleted: lead.followUpCompleted,
      branch: lead.branch || "",
      status: lead.status || "new", // Add status field
    });
    setFollowUpDate(lead.followUpDate ? new Date(lead.followUpDate) : undefined);
    setDob(lead.dob ? new Date(lead.dob) : undefined);
    setOpenAdd(true);
  };

  const handleOpenConvert = (lead: Lead) => {
    setConvertingLead(lead);
    setConvertForm({
      height: lead.height?.toString() || "",
      plan: "",
      discount: "0",
      totalDue: "0",
      amountPaid: "",
      paymentMethod: "",
      branch: lead.branch || "",
    });
    setConvertDob(lead.dob ? new Date(lead.dob) : undefined);
    
    const today = new Date();
    setConvertStartDate(today);
    
    // Calculate initial end date based on default plan (Monthly Plan - 1 month)
    const defaultEndDate = addMonths(today, 1);
    setConvertEndDate(defaultEndDate);
    
    setIsEndDateManuallyEdited(false);
    setOpenConvert(true);
    
    console.log("Convert form opened:", {
      startDate: today,
      defaultEndDate,
      calculatedWith: "1 month (default)"
    });
  };

  const handleWhatsAppChat = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const whatsappNumber = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
    window.open(`https://wa.me/${whatsappNumber}`, "_blank");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLead) {
      updateMutation.mutate({ id: editingLead.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;

    // Validate form before submission
    if (!validateConvertForm()) {
      return;
    }

    const memberData = {
      firstName: convertingLead.firstName,
      lastName: convertingLead.lastName || "",
      email: convertingLead.email || "",
      phone: convertingLead.phone,
      address: convertingLead.address || "",
      gender: convertingLead.gender,
      source: convertingLead.source,
      interestAreas: convertingLead.interestAreas || [],
      healthBackground: convertingLead.healthBackground || "",
      height: convertForm.height ? parseInt(convertForm.height) : null,
      dob: convertDob ? format(convertDob, "yyyy-MM-dd") : null,
      plan: convertForm.plan,
      startDate: format(convertStartDate, "yyyy-MM-dd"),
      endDate: format(convertEndDate, "yyyy-MM-dd"),
      discount: parseInt(convertForm.discount) || 0,
      totalDue: parseInt(convertForm.totalDue) || 0,
      amountPaid: parseInt(convertForm.amountPaid) || 0,
      paymentMethod: convertForm.paymentMethod,
      branch: convertForm.branch || null,
      status: "Active",
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${convertingLead.firstName}`,
    };

    convertMutation.mutate(memberData);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      deleteMutation.mutate(id);
    }
  };

  // Memoized validation result to prevent re-renders
  const isFormValid = useMemo(() => {
    // Only validate if we have a converting lead
    if (!convertingLead) return false;
    
    const errors: typeof convertErrors = {
      plan: "",
      startDate: "",
      endDate: "",
      paymentMethod: "",
      amountPaid: "",
      height: "",
      totalDue: "",
    };
    let isValid = true;

    // Plan validation
    if (!convertForm.plan) {
      errors.plan = "Please select a membership plan";
      isValid = false;
    }

    // Start Date validation
    if (!convertStartDate) {
      errors.startDate = "Please select a start date";
      isValid = false;
    }

    // End Date validation
    if (!convertEndDate) {
      errors.endDate = "Please select an end date";
      isValid = false;
    } else if (convertStartDate && convertEndDate && convertEndDate <= convertStartDate) {
      errors.endDate = "End date must be after start date";
      isValid = false;
    }

    // Payment Method validation
    if (!convertForm.paymentMethod) {
      errors.paymentMethod = "Please select a payment method";
      isValid = false;
    }

    // Amount Paid validation
    if (!convertForm.amountPaid) {
      errors.amountPaid = "Please enter amount paid";
      isValid = false;
    } else {
      const amountPaid = parseInt(convertForm.amountPaid);
      const totalDue = parseInt(convertForm.totalDue || "0");
      if (isNaN(amountPaid) || amountPaid < 0) {
        errors.amountPaid = "Please enter a valid amount";
        isValid = false;
      } else if (amountPaid > totalDue) {
        errors.amountPaid = "Amount paid cannot exceed total due";
        isValid = false;
      }
    }

    // Height validation (make it required)
    if (!convertForm.height) {
      errors.height = "Please enter height";
      isValid = false;
    } else {
      const height = parseInt(convertForm.height);
      if (isNaN(height) || height <= 0 || height > 300) {
        errors.height = "Please enter a valid height (1-300 cm)";
        isValid = false;
      }
    }

    // Total Due validation (make it required)
    if (!convertForm.totalDue) {
      errors.totalDue = "Please enter total due amount";
      isValid = false;
    } else {
      const totalDue = parseInt(convertForm.totalDue);
      if (isNaN(totalDue) || totalDue < 0) {
        errors.totalDue = "Please enter a valid total due amount";
        isValid = false;
      }
    }

    return isValid;
  }, [convertingLead, convertForm.plan, convertForm.paymentMethod, convertForm.amountPaid, convertForm.totalDue, convertForm.height, convertStartDate, convertEndDate]);

  const filteredLeads = leads.filter(lead => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      lead.firstName.toLowerCase().includes(searchLower) ||
      (lead.lastName?.toLowerCase().includes(searchLower)) ||
      lead.phone.includes(searchQuery)
    );
    
    if (!matchesSearch) return false;
    
    // Apply status filter
    switch (statusFilter) {
      case "all":
        return true;
      case "pending":
        return lead.status === "new";
      case "follow_up":
        return lead.status === "follow_up";
      case "converted":
        return lead.status === "converted";
      case "rejected":
        return lead.status === "rejected";
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "follow_up": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "converted": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "rejected": return "bg-red-500/20 text-red-400 border-red-500/30";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "new": return "Pending";
      case "follow_up": return "Follow Up";
      case "converted": return "Converted";
      case "rejected": return "Rejected";
      default: return status;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold font-heading text-foreground uppercase tracking-tight">
              LEADS
            </h1>
            <p className="text-muted-foreground">
              Manage enquiries and convert them to members.
            </p>
          </div>

          <Button
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            onClick={handleOpenAdd}
            data-testid="button-add-lead"
          >
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
        </div>

        <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads by name or phone..."
              className="pl-10 bg-background border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-leads"
            />
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("follow_up")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "follow_up"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Follow Up
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "pending"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Pending
          </button>
           <button
            onClick={() => setStatusFilter("converted")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "converted"
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Converted
          </button>
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              statusFilter === "rejected"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Rejected
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No leads found</p>
            <p className="text-sm">{searchQuery ? "Try a different search" : "Add your first lead to get started"}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredLeads.map((lead) => (
              <Card
                key={lead.id}
                className="bg-card/80 backdrop-blur-sm border border-border hover:shadow-lg hover:shadow-primary/10 transition-all group overflow-hidden"
                data-testid={`card-lead-${lead.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl border-2 border-primary/30">
                      {lead.firstName?.charAt(0) || "?"}
                    </div>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-semibold border",
                      getStatusColor(lead.status)
                    )}>
                      {getStatusLabel(lead.status)}
                    </span>
                  </div>
                  <CardTitle className="mt-3 text-xl font-heading tracking-tight text-foreground">
                    {lead.firstName} {lead.lastName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary/70" /> +91 {lead.phone}
                    </div>
                    {lead.interestAreas && lead.interestAreas.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground/80">Interest:</span> {lead.interestAreas.join(", ")}
                      </div>
                    )}
                    {lead.followUpDate && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground/80">Follow-up date:</span> {format(new Date(lead.followUpDate), "dd/MM/yyyy")}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-4 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2 border-border hover:bg-muted"
                      onClick={() => handleWhatsAppChat(lead.phone)}
                      data-testid={`button-chat-lead-${lead.id}`}
                    >
                      <MessageCircle className="h-4 w-4" /> Chat
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleOpenConvert(lead)}
                      disabled={lead.status === "converted"}
                      data-testid={`button-convert-lead-${lead.id}`}
                    >
                      <UserCheck className="h-4 w-4" /> Convert
                    </Button>
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 gap-2 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(lead)}
                      data-testid={`button-edit-lead-${lead.id}`}
                    >
                      <Edit2 className="h-4 w-4" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(lead.id)}
                      data-testid={`button-delete-lead-${lead.id}`}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Sheet open={openAdd} onOpenChange={(val) => { setOpenAdd(val); if (!val) resetForm(); }}>
          <SheetContent className="sm:max-w-xl w-full bg-card border-l border-border overflow-y-auto">
            <SheetHeader className="border-b border-border pb-6 mb-6">
              <SheetTitle className="text-2xl font-bold font-heading text-primary uppercase tracking-tight">
                {editingLead ? "Edit Lead" : "Add New Lead"}
              </SheetTitle>
            </SheetHeader>

            <form onSubmit={handleSubmit} className="space-y-8">
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

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Gender <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup value={formData.gender} onValueChange={(val) => setFormData({ ...formData, gender: val })} className="flex gap-6 pt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" className="border-primary text-primary" />
                      <Label htmlFor="male" className="text-sm font-medium">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" className="border-primary text-primary" />
                      <Label htmlFor="female" className="text-sm font-medium">Female</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="other" id="other" className="border-primary text-primary" />
                      <Label htmlFor="other" className="text-sm font-medium">Other</Label>
                    </div>
                  </RadioGroup>
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
                    Source <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.source} onValueChange={(val) => setFormData({ ...formData, source: val })} required>
                    <SelectTrigger className="bg-background border-border h-11">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Priority <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })} required>
                    <SelectTrigger className="bg-background border-border h-11">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map(opt => (
                        <SelectItem key={opt} value={opt} className="capitalize">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date of Birth</Label>
                  <DatePickerWithNav date={dob} onDateChange={setDob} testId="input-lead-dob" />
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
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Follow-up Date</Label>
                  <DatePickerWithNav date={followUpDate} onDateChange={setFollowUpDate} testId="input-follow-up-date" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Staff</Label>
                  <Select value={formData.assignedStaff} onValueChange={(val) => setFormData({ ...formData, assignedStaff: val })}>
                    <SelectTrigger className="bg-background border-border h-11">
                      <SelectValue placeholder="Select Staff Member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffUsers.map(staff => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.firstName} {staff.lastName ? staff.lastName : ''} ({staff.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Branch</Label>
                  <Select value={formData.branch} onValueChange={(val) => setFormData({ ...formData, branch: val })}>
                    <SelectTrigger className="bg-background border-border h-11">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.name}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                    <SelectTrigger className="bg-background border-border h-11">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Pending</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    className="bg-background border-border min-h-[100px]"
                    data-testid="input-notes"
                  />
                </div>

                <div className="flex items-center space-x-2 md:col-span-2">
                  <Checkbox
                    id="followUpCompleted"
                    checked={formData.followUpCompleted}
                    onCheckedChange={(checked) => setFormData({ ...formData, followUpCompleted: checked as boolean })}
                  />
                  <Label htmlFor="followUpCompleted" className="text-sm font-medium">Follow-up Completed</Label>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-6 border-t border-border">
                <Button
                  type="submit"
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-base"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-lead"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingLead ? "Update Lead" : "Add Lead"}
                </Button>
                <SheetClose asChild>
                  <Button type="button" variant="outline" className="w-full h-12 border-border hover:bg-muted font-bold uppercase tracking-wider">Cancel</Button>
                </SheetClose>
              </div>
            </form>
          </SheetContent>
        </Sheet>

        <Sheet open={openConvert} onOpenChange={(val) => { setOpenConvert(val); if (!val) resetConvertForm(); }}>
          <SheetContent className="sm:max-w-xl w-full bg-card border-l border-border overflow-y-auto">
            <SheetHeader className="border-b border-border pb-6 mb-6">
              <SheetTitle className="text-2xl font-bold font-heading text-primary uppercase tracking-tight">
                Convert Lead to Member
              </SheetTitle>
            </SheetHeader>

            <form onSubmit={handleConvertSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</Label>
                  <Input
                    value={convertingLead ? `${convertingLead.firstName} ${convertingLead.lastName || ""}`.trim() : ""}
                    disabled
                    className="bg-muted border-border h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date of Birth</Label>
                  <DatePickerWithNav date={convertDob} onDateChange={setConvertDob} testId="input-convert-dob" />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input
                    value={convertingLead?.email || ""}
                    disabled
                    className="bg-muted border-border h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Height (cm) <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={convertForm.height}
                      onChange={(e) => handleConvertFormChange('height', e.target.value)}
                      placeholder="182"
                      className={`bg-background border-border h-11 ${convertErrors.height ? 'border-destructive' : 'border-border'}`}
                      data-testid="input-convert-height"
                    />
                    <div className="bg-muted px-3 flex items-center rounded border border-border text-xs font-bold">cm</div>
                  </div>
                  {convertErrors.height && <p className="text-xs text-destructive mt-1">{convertErrors.height}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Plan <span className="text-destructive">*</span>
                  </Label>
                  <Select value={convertForm.plan} onValueChange={(val) => handleConvertFormChange('plan', val)} required>
                    <SelectTrigger className={`bg-background border-border h-11 ${convertErrors.plan ? 'border-destructive' : 'border-border'}`}>
                      <SelectValue placeholder="Select Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map(plan => (
                        <SelectItem key={plan.id} value={plan.name}>{plan.name} - ₹{plan.price}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {convertErrors.plan && <p className="text-xs text-destructive mt-1">{convertErrors.plan}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Start Date <span className="text-destructive">*</span>
                  </Label>
                  <DatePickerWithNav date={convertStartDate} onDateChange={(d) => handleConvertDateChange('startDate', d)} testId="input-convert-start-date" />
                  {convertErrors.startDate && <p className="text-xs text-destructive mt-1">{convertErrors.startDate}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      End Date <span className="text-destructive">*</span>
                    </Label>
                    {!isEndDateManuallyEdited && convertForm.plan && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Auto-calculated
                      </span>
                    )}
                  </div>
                  <DatePickerWithNav date={convertEndDate} onDateChange={(d) => handleConvertDateChange('endDate', d)} testId="input-convert-end-date" />
                  {convertErrors.endDate && <p className="text-xs text-destructive mt-1">{convertErrors.endDate}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Discount (%)</Label>
                  <Input
                    type="number"
                    value={convertForm.discount}
                    onChange={(e) => setConvertForm({ ...convertForm, discount: e.target.value })}
                    placeholder="0"
                    className="bg-background border-border h-11"
                    data-testid="input-convert-discount"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Total Due (₹) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={convertForm.totalDue}
                    onChange={(e) => handleConvertFormChange('totalDue', e.target.value)}
                    placeholder="Total Due"
                    className={`bg-background border-border h-11 ${convertErrors.totalDue ? 'border-destructive' : 'border-border'}`}
                    data-testid="input-convert-total-due"
                  />
                  {convertErrors.totalDue && <p className="text-xs text-destructive mt-1">{convertErrors.totalDue}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Payment Method <span className="text-destructive">*</span>
                  </Label>
                  <Select value={convertForm.paymentMethod} onValueChange={(val) => handleConvertFormChange('paymentMethod', val)} required>
                    <SelectTrigger className={`bg-background border-border h-11 ${convertErrors.paymentMethod ? 'border-destructive' : 'border-border'}`}>
                      <SelectValue placeholder="Select Payment Method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {convertErrors.paymentMethod && <p className="text-xs text-destructive mt-1">{convertErrors.paymentMethod}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Amount Paid (₹) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={convertForm.amountPaid}
                    onChange={(e) => handleConvertFormChange('amountPaid', e.target.value)}
                    placeholder="Amount Paid"
                    className={`bg-background border-border h-11 ${convertErrors.amountPaid ? 'border-destructive' : 'border-border'}`}
                    required
                    data-testid="input-convert-amount-paid"
                  />
                  {convertErrors.amountPaid && <p className="text-xs text-destructive mt-1">{convertErrors.amountPaid}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Branch</Label>
                  <Select value={convertForm.branch} onValueChange={(val) => setConvertForm({ ...convertForm, branch: val })}>
                    <SelectTrigger className="bg-background border-border h-11">
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
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold uppercase tracking-wider text-base"
                  disabled={convertMutation.isPending || !isFormValid}
                  data-testid="button-confirm-convert"
                >
                  {convertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Convert Lead to Member
                </Button>
                <SheetClose asChild>
                  <Button type="button" variant="outline" className="w-full h-12 border-border hover:bg-muted font-bold uppercase tracking-wider">Cancel</Button>
                </SheetClose>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}
