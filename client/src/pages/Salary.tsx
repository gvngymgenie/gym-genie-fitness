import { useState, useMemo, useEffect, useCallback } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, TrendingUp, Users, Star, CalendarDays, Eye, CheckCircle, Clock, Receipt, IndianRupee, FileDown, MessageCircle, X, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { PayslipPDF } from "@/components/PayslipPDF";
import type { SafeUser, TrainerSalaryConfig, TrainerPayout } from "@shared/schema";

// ============================================================================
// MOCK DATA — Set to true to visualize the UI without real backend data.
// Set to false when real data is available. Mock entries are clearly marked
// and can be safely deleted individually without breaking the page.
// ============================================================================
const USE_MOCK_DATA = false;

const MOCK_TRAINERS: SafeUser[] = USE_MOCK_DATA ? [
  { id: "mock-trainer-1", username: "rahul.sharma", role: "trainer", firstName: "Rahul", lastName: "Sharma", phone: "+91 9962017899", email: "rahul@gym.com", isActive: true, createdAt: new Date("2024-01-15") },
  { id: "mock-trainer-2", username: "priya.nair", role: "trainer", firstName: "Priya", lastName: "Nair", phone: "+91 87654 32109", email: "priya@gym.com", isActive: true, createdAt: new Date("2024-03-01") },
  { id: "mock-trainer-3", username: "amit.patel", role: "trainer", firstName: "Amit", lastName: "Patel", phone: "+91 76543 21098", email: "amit@gym.com", isActive: true, createdAt: new Date("2024-06-10") },
] as unknown as SafeUser[] : [];

const MOCK_SALARY_CONFIGS: Record<string, TrainerSalaryConfig> = USE_MOCK_DATA ? {
  "mock-trainer-1": {
    id: "mock-config-1", trainerId: "mock-trainer-1",
    baseSalary: 2500000, perSessionRate: 50000, attendanceBonusPerDay: 20000,
    attendanceBonusThreshold: 20, reviewBonusMinRating: 4, reviewBonusAmount: 300000,
    updatedAt: new Date("2025-01-01"),
  },
  "mock-trainer-2": {
    id: "mock-config-2", trainerId: "mock-trainer-2",
    baseSalary: 3000000, perSessionRate: 60000, attendanceBonusPerDay: 25000,
    attendanceBonusThreshold: 22, reviewBonusMinRating: 4, reviewBonusAmount: 400000,
    updatedAt: new Date("2025-01-01"),
  },
  "mock-trainer-3": {
    id: "mock-config-3", trainerId: "mock-trainer-3",
    baseSalary: 2000000, perSessionRate: 40000, attendanceBonusPerDay: 15000,
    attendanceBonusThreshold: 18, reviewBonusMinRating: 4, reviewBonusAmount: 250000,
    updatedAt: new Date("2025-01-01"),
  },
} : {};

const MOCK_PAYOUT_PREVIEW: Record<string, any> = USE_MOCK_DATA ? {
  "mock-trainer-1": {
    breakdown: { baseSalary: 2500000, attendanceDays: 23, attendanceBonus: 460000, sessionCount: 32, sessionBonus: 1600000, reviewAvgRating: 460, reviewBonus: 300000, grossPay: 4860000, deductions: 0, netPay: 4860000 },
    formatted: { baseSalary: "₹25,000.00", attendanceBonus: "₹4,600.00", sessionBonus: "₹16,000.00", reviewBonus: "₹3,000.00", grossPay: "₹48,600.00", netPay: "₹48,600.00" },
  },
  "mock-trainer-2": {
    breakdown: { baseSalary: 3000000, attendanceDays: 25, attendanceBonus: 625000, sessionCount: 40, sessionBonus: 2400000, reviewAvgRating: 480, reviewBonus: 400000, grossPay: 6425000, deductions: 0, netPay: 6425000 },
    formatted: { baseSalary: "₹30,000.00", attendanceBonus: "₹6,250.00", sessionBonus: "₹24,000.00", reviewBonus: "₹4,000.00", grossPay: "₹64,250.00", netPay: "₹64,250.00" },
  },
  "mock-trainer-3": {
    breakdown: { baseSalary: 2000000, attendanceDays: 19, attendanceBonus: 285000, sessionCount: 24, sessionBonus: 960000, reviewAvgRating: 420, reviewBonus: 250000, grossPay: 3495000, deductions: 0, netPay: 3495000 },
    formatted: { baseSalary: "₹20,000.00", attendanceBonus: "₹2,850.00", sessionBonus: "₹9,600.00", reviewBonus: "₹2,500.00", grossPay: "₹34,950.00", netPay: "₹34,950.00" },
  },
} : {};

const MOCK_PAYOUTS: TrainerPayout[] = USE_MOCK_DATA ? [
  { id: "mock-payout-1", trainerId: "mock-trainer-1", month: 3, year: 2025, baseSalary: 2500000, attendanceDays: 22, attendanceBonus: 440000, sessionCount: 30, sessionBonus: 1500000, reviewAvgRating: 450, reviewBonus: 300000, grossPay: 4740000, deductions: 0, netPay: 4740000, status: "paid", payDate: "2025-04-05", notes: null, payslipUrl: null, createdAt: new Date("2025-04-01"), updatedAt: new Date("2025-04-05") },
  { id: "mock-payout-2", trainerId: "mock-trainer-1", month: 2, year: 2025, baseSalary: 2500000, attendanceDays: 20, attendanceBonus: 400000, sessionCount: 28, sessionBonus: 1400000, reviewAvgRating: 440, reviewBonus: 300000, grossPay: 4600000, deductions: 0, netPay: 4600000, status: "paid", payDate: "2025-03-05", notes: null, payslipUrl: null, createdAt: new Date("2025-03-01"), updatedAt: new Date("2025-03-05") },
  { id: "mock-payout-3", trainerId: "mock-trainer-1", month: 1, year: 2025, baseSalary: 2500000, attendanceDays: 21, attendanceBonus: 420000, sessionCount: 26, sessionBonus: 1300000, reviewAvgRating: 430, reviewBonus: 300000, grossPay: 4520000, deductions: 0, netPay: 4520000, status: "approved", payDate: null, notes: "Pending bank transfer", payslipUrl: null, createdAt: new Date("2025-02-01"), updatedAt: new Date("2025-02-15") },
  { id: "mock-payout-4", trainerId: "mock-trainer-2", month: 3, year: 2025, baseSalary: 3000000, attendanceDays: 24, attendanceBonus: 600000, sessionCount: 38, sessionBonus: 2280000, reviewAvgRating: 470, reviewBonus: 400000, grossPay: 6280000, deductions: 0, netPay: 6280000, status: "paid", payDate: "2025-04-05", notes: null, payslipUrl: null, createdAt: new Date("2025-04-01"), updatedAt: new Date("2025-04-05") },
  { id: "mock-payout-5", trainerId: "mock-trainer-2", month: 2, year: 2025, baseSalary: 3000000, attendanceDays: 23, attendanceBonus: 575000, sessionCount: 35, sessionBonus: 2100000, reviewAvgRating: 460, reviewBonus: 400000, grossPay: 6075000, deductions: 0, netPay: 6075000, status: "draft", payDate: null, notes: null, payslipUrl: null, createdAt: new Date("2025-03-01"), updatedAt: new Date("2025-03-01") },
  { id: "mock-payout-6", trainerId: "mock-trainer-3", month: 3, year: 2025, baseSalary: 2000000, attendanceDays: 18, attendanceBonus: 270000, sessionCount: 22, sessionBonus: 880000, reviewAvgRating: 410, reviewBonus: 250000, grossPay: 3400000, deductions: 0, netPay: 3400000, status: "paid", payDate: "2025-04-05", notes: null, payslipUrl: null, createdAt: new Date("2025-04-01"), updatedAt: new Date("2025-04-05") },
  { id: "mock-payout-7", trainerId: "mock-trainer-3", month: 4, year: 2025, baseSalary: 2000000, attendanceDays: 20, attendanceBonus: 300000, sessionCount: 25, sessionBonus: 1000000, reviewAvgRating: 440, reviewBonus: 250000, grossPay: 3550000, deductions: 50000, netPay: 3500000, status: "draft", payDate: null, notes: "Deduction: 1 unexcused absence", payslipUrl: null, createdAt: new Date("2025-05-01"), updatedAt: new Date("2025-05-01") },
] : [];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatCurrency(cents: number): string {
  return `₹${(cents / 100).toFixed(2)}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>;
    case "approved":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border"><Clock className="h-3 w-3 mr-1" /> Approved</Badge>;
    default:
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Draft</Badge>;
  }
}

export default function SalaryPage() {
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [activeTab, setActiveTab] = useState("calculate");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePayoutId, setDeletePayoutId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all staff filtered to trainers
  const { data: staffUsers = [] } = useQuery<SafeUser[]>({
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
  });

  const trainers = useMemo(() => {
    const realTrainers = staffUsers.filter(u => u.role === "trainer");
    return USE_MOCK_DATA ? [...realTrainers, ...MOCK_TRAINERS] : realTrainers;
  }, [staffUsers]);

  // Salary config
  const { data: salaryConfig, isLoading: isLoadingConfig } = useQuery<TrainerSalaryConfig | null>({
    queryKey: ["/api/salary/config", selectedTrainerId],
    queryFn: async () => {
      if (!selectedTrainerId) return null;
      if (USE_MOCK_DATA && MOCK_SALARY_CONFIGS[selectedTrainerId]) {
        return MOCK_SALARY_CONFIGS[selectedTrainerId];
      }
      const res = await fetch(`/api/salary/config/${selectedTrainerId}`);
      if (!res.ok) throw new Error("Failed to fetch config");
      return res.json();
    },
    enabled: !!selectedTrainerId,
  });

  // Config form state
  const [configForm, setConfigForm] = useState({
    baseSalary: 0,
    perSessionRate: 0,
    attendanceBonusPerDay: 0,
    attendanceBonusThreshold: 20,
    reviewBonusMinRating: 4,
    reviewBonusAmount: 0,
  });

  useEffect(() => {
    if (salaryConfig) {
      setConfigForm({
        baseSalary: salaryConfig.baseSalary,
        perSessionRate: salaryConfig.perSessionRate,
        attendanceBonusPerDay: salaryConfig.attendanceBonusPerDay,
        attendanceBonusThreshold: salaryConfig.attendanceBonusThreshold,
        reviewBonusMinRating: salaryConfig.reviewBonusMinRating,
        reviewBonusAmount: salaryConfig.reviewBonusAmount,
      });
    } else {
      setConfigForm({
        baseSalary: 0,
        perSessionRate: 0,
        attendanceBonusPerDay: 0,
        attendanceBonusThreshold: 20,
        reviewBonusMinRating: 4,
        reviewBonusAmount: 0,
      });
    }
  }, [salaryConfig]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data: typeof configForm) => {
      const res = await apiRequest("POST", `/api/salary/config/${selectedTrainerId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salary/calculate"] });
      toast({ title: "Salary config saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveConfig = () => {
    saveConfigMutation.mutate(configForm);
  };

  // Refresh data when tab changes - use refetch to ensure fresh data
  const [lastRefreshTab, setLastRefreshTab] = useState("");
  
  useEffect(() => {
    if (selectedTrainerId && activeTab && activeTab !== lastRefreshTab) {
      queryClient.invalidateQueries({ queryKey: ["/api/salary/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salary/calculate"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salary/payouts"] });
      setLastRefreshTab(activeTab);
    }
  }, [activeTab, selectedTrainerId, queryClient, lastRefreshTab]);

  // Calculate payout preview
  const { data: payoutPreview, isLoading: isLoadingPreview } = useQuery<any>({
    queryKey: ["/api/salary/calculate", selectedTrainerId, selectedMonth, selectedYear],
    queryFn: async () => {
      if (USE_MOCK_DATA && MOCK_PAYOUT_PREVIEW[selectedTrainerId]) {
        return MOCK_PAYOUT_PREVIEW[selectedTrainerId];
      }
      const res = await fetch(
        `/api/salary/calculate/${selectedTrainerId}?month=${selectedMonth}&year=${selectedYear}`
      );
      if (!res.ok) throw new Error("Failed to calculate payout");
      return res.json();
    },
    enabled: !!selectedTrainerId,
  });

  // Use mock preview data when flag is on
  const effectivePreview = USE_MOCK_DATA
    ? (MOCK_PAYOUT_PREVIEW[selectedTrainerId] ?? payoutPreview)
    : payoutPreview;

  // Create payout
  const createPayoutMutation = useMutation({
    mutationFn: async () => {
      if (!effectivePreview) throw new Error("No payout preview available");
      const { breakdown } = effectivePreview;
      const res = await apiRequest("POST", "/api/salary/payout", {
        trainerId: selectedTrainerId,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        ...breakdown,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary/payouts"] });
      toast({ title: "Payout generated successfully" });
      setActiveTab("history");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleGeneratePayout = () => {
    if (!effectivePreview) return;
    createPayoutMutation.mutate();
  };

  // Payout history
  const { data: payouts = [], isLoading: isLoadingPayouts } = useQuery<TrainerPayout[]>({
    queryKey: ["/api/salary/payouts", selectedTrainerId],
    queryFn: async () => {
      if (!selectedTrainerId) return [];
      if (USE_MOCK_DATA) {
        return MOCK_PAYOUTS.filter(p => p.trainerId === selectedTrainerId);
      }
      const res = await fetch(`/api/salary/payouts?trainerId=${selectedTrainerId}`);
      if (!res.ok) throw new Error("Failed to fetch payouts");
      return res.json();
    },
    enabled: !!selectedTrainerId,
  });

  // Check if payout already exists for selected month/year
  const existingPayout = payouts.find(p => 
    p.month === parseInt(selectedMonth) && p.year === parseInt(selectedYear)
  );

  // Update payout status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/salary/payout/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary/payouts"] });
      toast({ title: "Payout status updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleUpdateStatus = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  // Delete payout
  const deletePayoutMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/salary/payout/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/salary/payouts"] });
      toast({ title: "Payout deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDeletePayout = (id: string) => {
    setDeletePayoutId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePayout = () => {
    if (deletePayoutId) {
      deletePayoutMutation.mutate(deletePayoutId);
    }
    setDeleteDialogOpen(false);
    setDeletePayoutId(null);
  };

  const selectedTrainer = trainers.find(t => t.id === selectedTrainerId);

  // PDF generation & Supabase link management
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [activePayoutForAction, setActivePayoutForAction] = useState<TrainerPayout | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Track which payouts have their link generated (stored on the payout record)
  // For mock data, we store URLs client-side since mock payouts aren't real DB records
  const [uploadedPayslipUrls, setUploadedPayslipUrls] = useState<Map<string, string>>(new Map());

  const getPayslipUrl = useCallback((payout: TrainerPayout): string | null => {
    // First check the payout's own payslipUrl field (real DB records)
    const dbUrl = (payout as TrainerPayout & { payslipUrl?: string | null }).payslipUrl;
    if (dbUrl) return dbUrl;

    // Then check client-side map (mock data / pre-payout previews)
    const key = `${payout.trainerId}-${payout.month}-${payout.year}`;
    const mapUrl = uploadedPayslipUrls.get(key) || null;
    console.log('[getPayslipUrl] key:', key, 'dbUrl:', !!dbUrl, 'mapUrl:', !!mapUrl, 'allKeys:', Array.from(uploadedPayslipUrls.keys()));
    return mapUrl;
  }, [uploadedPayslipUrls]);

  const isLinkReady = useCallback((payout: TrainerPayout): boolean => {
    return getPayslipUrl(payout) !== null;
  }, [getPayslipUrl]);

  const getPayslipData = useCallback((payout: TrainerPayout): { trainerName: string; month: number; year: number; baseSalary: number; attendanceDays: number; attendanceBonus: number; sessionCount: number; sessionBonus: number; reviewAvgRating: number; reviewBonus: number; grossPay: number; deductions: number; netPay: number; status: string; payDate: string | null; notes: string | null } => {
    return {
      trainerName: `${selectedTrainer?.firstName || ""} ${selectedTrainer?.lastName || ""}`.trim() || "Trainer",
      month: payout.month,
      year: payout.year,
      baseSalary: payout.baseSalary,
      attendanceDays: payout.attendanceDays,
      attendanceBonus: payout.attendanceBonus,
      sessionCount: payout.sessionCount,
      sessionBonus: payout.sessionBonus,
      reviewAvgRating: payout.reviewAvgRating,
      reviewBonus: payout.reviewBonus,
      grossPay: payout.grossPay,
      deductions: payout.deductions,
      netPay: payout.netPay,
      status: payout.status,
      payDate: payout.payDate || null,
      notes: payout.notes || null,
    };
  }, [selectedTrainer]);

  const generatePdfBlob = useCallback(async (payout: TrainerPayout): Promise<Blob> => {
    const payslipData = getPayslipData(payout);
    const blob = await pdf(<PayslipPDF data={payslipData} />).toBlob();
    return blob;
  }, [getPayslipData]);

  /** Upload a PDF to Supabase and persist the URL on the payout record */
  const uploadPayslipToSupabase = useCallback(async (payout: TrainerPayout, blob: Blob): Promise<string> => {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
    });
    reader.readAsDataURL(blob);
    const base64Data = await base64Promise;

    const filename = `payslip-${selectedTrainer?.firstName || "trainer"}-${MONTHS[payout.month - 1]}-${payout.year}.pdf`;

    const res = await apiRequest("POST", "/api/payslips/upload", {
      trainerId: selectedTrainerId,
      month: payout.month,
      year: payout.year,
      base64Data,
      filename,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Upload failed");
    return data.downloadUrl;
  }, [selectedTrainer, selectedTrainerId]);

  /**
   * Generate & Preview — called from Calculate & Preview tab.
   * Generates PDF, uploads to Supabase, opens preview.
   * If no payout exists yet, it still uploads (payslip-only mode).
   */
  const handleGenerateAndPreview = useCallback(async () => {
    if (!effectivePreview || !selectedTrainerId) return;

    try {
      setIsGeneratingPdf(true);

      // Build a temporary payout-like object from preview data
      const { breakdown } = effectivePreview;
      const tempPayout: TrainerPayout = {
        id: "", // no payout ID yet
        trainerId: selectedTrainerId,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        baseSalary: breakdown.baseSalary,
        attendanceDays: breakdown.attendanceDays,
        attendanceBonus: breakdown.attendanceBonus,
        sessionCount: breakdown.sessionCount,
        sessionBonus: breakdown.sessionBonus,
        reviewAvgRating: breakdown.reviewAvgRating,
        reviewBonus: breakdown.reviewBonus,
        grossPay: breakdown.grossPay,
        deductions: breakdown.deductions,
        netPay: breakdown.netPay,
        status: "draft",
        payDate: null,
        notes: null,
        payslipUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Generate PDF
      const blob = await generatePdfBlob(tempPayout);

      // Upload to Supabase
      const downloadUrl = await uploadPayslipToSupabase(tempPayout, blob);

      // Store URL client-side (works for mock data too)
      const key = `${tempPayout.trainerId}-${tempPayout.month}-${tempPayout.year}`;
      setUploadedPayslipUrls(prev => new Map(prev).set(key, downloadUrl));

      // Open preview in new tab
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      // Invalidate payouts query so the stored URL shows up
      queryClient.invalidateQueries({ queryKey: ["/api/salary/payouts"] });
      toast({ title: "Payslip generated & uploaded", description: "Link is now ready for WhatsApp sharing." });
    } catch (error: any) {
      toast({ title: "Error generating payslip", description: error.message, variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [effectivePreview, selectedTrainerId, selectedMonth, selectedYear, generatePdfBlob, uploadPayslipToSupabase, queryClient, toast]);

  /**
   * Download PDF from History tab.
   * If link is ready, fetch the blob and trigger a proper file download.
   * Otherwise, prompt user to generate first.
   */
  const handleDownloadPayslip = useCallback(async (payout: TrainerPayout) => {
    const downloadUrl = getPayslipUrl(payout);
    console.log('[PDF Download] payout:', payout.id, 'month:', payout.month, 'year:', payout.year);
    console.log('[PDF Download] downloadUrl:', downloadUrl);
    if (downloadUrl) {
      setIsGeneratingPdf(true);
      try {
        const filename = `payslip-${selectedTrainer?.firstName || "trainer"}-${MONTHS[payout.month - 1]}-${payout.year}.pdf`;

        // Fetch the PDF as blob, then create object URL for download
        console.log('[PDF Download] Fetching from Supabase...');
        const response = await fetch(downloadUrl);
        console.log('[PDF Download] Response status:', response.status, 'ok:', response.ok);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        console.log('[PDF Download] blob size:', blob.size, 'type:', blob.type);

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "Payslip downloaded" });
      } catch (err: any) {
        console.error("[PDF Download] Fetch failed:", err);
        // Fallback: open in new tab
        window.open(downloadUrl, "_blank");
        toast({ title: "Opening PDF in new tab", description: "Use browser's download button to save." });
      } finally {
        setIsGeneratingPdf(false);
      }
      return;
    }

    // No link ready — prompt user
    console.log('[PDF Download] No URL found for this payout');
    toast({
      title: "Payslip not generated yet",
      description: "Go to 'Calculate & Preview' tab and click 'Generate & Preview' first.",
      variant: "destructive",
    });
  }, [getPayslipUrl, selectedTrainer, toast]);

  const handleShareWhatsApp = useCallback((payout: TrainerPayout) => {
    setActivePayoutForAction(payout);
    setWhatsappPhone(selectedTrainer?.phone || "");
    setWhatsappDialogOpen(true);
  }, [selectedTrainer]);

  const sendWhatsAppMutation = useMutation({
    mutationFn: async ({ phone, payout }: { phone: string; payout: TrainerPayout }) => {
      const downloadUrl = getPayslipUrl(payout);

      if (downloadUrl) {
        // Link is ready — use the existing URL (no regeneration)
        const filename = `payslip-${selectedTrainer?.firstName || "trainer"}-${MONTHS[payout.month - 1]}-${payout.year}.pdf`;
        const caption = `Hi ${selectedTrainer?.firstName}, your payslip for ${MONTHS[payout.month - 1]} ${payout.year} is attached. Net payout: ₹${(payout.netPay / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

        const res = await apiRequest("POST", "/api/whatsapp/send-document", {
          phone,
          downloadUrl,
          filename,
          caption,
        });
        return res.json();
      } else {
        // No link ready — generate PDF now, upload, then send
        const blob = await generatePdfBlob(payout);
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
        });
        reader.readAsDataURL(blob);
        const base64Data = await base64Promise;

        const filename = `payslip-${selectedTrainer?.firstName || "trainer"}-${MONTHS[payout.month - 1]}-${payout.year}.pdf`;
        const caption = `Hi ${selectedTrainer?.firstName}, your payslip for ${MONTHS[payout.month - 1]} ${payout.year} is attached. Net payout: ₹${(payout.netPay / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

        const res = await apiRequest("POST", "/api/whatsapp/send-document", {
          phone,
          base64Data,
          filename,
          caption,
        });
        return res.json();
      }
    },
    onSuccess: () => {
      setWhatsappDialogOpen(false);
      setWhatsappPhone("");
      setActivePayoutForAction(null);
      queryClient.invalidateQueries({ queryKey: ["/api/salary/payouts"] });
      toast({ title: "Payslip sent via WhatsApp" });
    },
    onError: () => {
      // WAHA is down — fallback to WhatsApp Web link
      if (activePayoutForAction) {
        const trainerName = selectedTrainer?.firstName || "Trainer";
        const monthYear = `${MONTHS[activePayoutForAction.month - 1]} ${activePayoutForAction.year}`;
        const netPay = (activePayoutForAction.netPay / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
        const downloadUrl = getPayslipUrl(activePayoutForAction) || "";

        const message = `Hi ${trainerName},\nYour payslip for ${monthYear} is ready.\n\nNet payout: ₹${netPay}\n\nDownload: ${downloadUrl}\n\nThis link will remain available for your records.`;
        const cleanPhone = whatsappPhone.replace(/\D/g, "");
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, "_blank");
        toast({ title: "WAHA unavailable", description: "Opening WhatsApp Web instead — please send the message manually." });
      }
      setWhatsappDialogOpen(false);
      setWhatsappPhone("");
      setActivePayoutForAction(null);
    },
  });

  const handleSendWhatsApp = () => {
    if (!whatsappPhone) {
      toast({ title: "Please enter a phone number", variant: "destructive" });
      return;
    }
    if (!activePayoutForAction) {
      toast({ title: "No payout selected", variant: "destructive" });
      return;
    }
    sendWhatsAppMutation.mutate({ phone: whatsappPhone, payout: activePayoutForAction });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground" data-testid="heading-salary">TRAINER SALARY</h1>
          <p className="text-muted-foreground">Configure salary rules, calculate payouts, and manage trainer compensation.</p>
        </div>

        {/* Trainer + Month Selector */}
        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Select Trainer</Label>
                <Select value={selectedTrainerId} onValueChange={setSelectedTrainerId}>
                  <SelectTrigger data-testid="select-trainer-salary">
                    <SelectValue placeholder="Choose a trainer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {trainers.map(t => (
                      <SelectItem key={t.id} value={t.id} data-testid={`option-trainer-${t.id}`}>
                        {t.firstName} {t.lastName || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["2025", "2026", "2027"].map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedTrainerId && (
          <div className="text-center py-16 text-muted-foreground">
            <IndianRupee className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Select a trainer to manage their salary</p>
          </div>
        )}

        {selectedTrainerId && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-lg">
              <TabsTrigger value="config">Salary Config</TabsTrigger>
              <TabsTrigger value="calculate">Calculate & Preview</TabsTrigger>
              <TabsTrigger value="history">Payout History</TabsTrigger>
            </TabsList>

            {/* Salary Config Tab */}
            <TabsContent value="config" className="space-y-6 mt-6">
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Salary Configuration for {selectedTrainer?.firstName}</CardTitle>
                  <CardDescription>
                    Set base salary, per-session rates, and bonus rules for this trainer.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingConfig ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Base Monthly Salary (₹)</Label>
                        <Input
                          type="number"
                          value={configForm.baseSalary / 100}
                          onChange={(e) => setConfigForm(prev => ({ ...prev, baseSalary: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                          placeholder="e.g., 20000"
                        />
                        <p className="text-xs text-muted-foreground">Fixed monthly amount regardless of sessions</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Per-Session Rate (₹)</Label>
                        <Input
                          type="number"
                          value={configForm.perSessionRate / 100}
                          onChange={(e) => setConfigForm(prev => ({ ...prev, perSessionRate: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                          placeholder="e.g., 500"
                        />
                        <p className="text-xs text-muted-foreground">Earned for each completed coaching session</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Attendance Bonus Per Day (₹)</Label>
                        <Input
                          type="number"
                          value={configForm.attendanceBonusPerDay / 100}
                          onChange={(e) => setConfigForm(prev => ({ ...prev, attendanceBonusPerDay: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                          placeholder="e.g., 200"
                        />
                        <p className="text-xs text-muted-foreground">Bonus for each day the trainer checks in</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Attendance Bonus Threshold (days)</Label>
                        <Input
                          type="number"
                          value={configForm.attendanceBonusThreshold}
                          onChange={(e) => setConfigForm(prev => ({ ...prev, attendanceBonusThreshold: parseInt(e.target.value || "20") }))}
                          placeholder="e.g., 20"
                        />
                        <p className="text-xs text-muted-foreground">Minimum attendance days to qualify for bonus</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Review Bonus Min Rating (1-5)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={configForm.reviewBonusMinRating}
                          onChange={(e) => setConfigForm(prev => ({ ...prev, reviewBonusMinRating: parseInt(e.target.value || "4") }))}
                          placeholder="e.g., 4"
                        />
                        <p className="text-xs text-muted-foreground">Minimum average rating to earn review bonus</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Review Bonus Amount (₹)</Label>
                        <Input
                          type="number"
                          value={configForm.reviewBonusAmount / 100}
                          onChange={(e) => setConfigForm(prev => ({ ...prev, reviewBonusAmount: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                          placeholder="e.g., 2000"
                        />
                        <p className="text-xs text-muted-foreground">One-time bonus if avg rating meets threshold</p>
                      </div>
                      <div className="md:col-span-2">
                        <Button
                          onClick={handleSaveConfig}
                          disabled={saveConfigMutation.isPending}
                          className="gap-2"
                        >
                          {saveConfigMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : null}
                          Save Configuration
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Calculate & Preview Tab */}
            <TabsContent value="calculate" className="space-y-6 mt-6">
              {isLoadingPreview ? (
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardContent className="pt-8">
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ) : effectivePreview ? (
                <>
                  {/* Stats Cards */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-primary">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Attendance Days</p>
                            <h3 className="text-2xl font-bold">{effectivePreview.breakdown.attendanceDays}</h3>
                          </div>
                          <CalendarDays className="h-8 w-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-accent">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Sessions</p>
                            <h3 className="text-2xl font-bold">{effectivePreview.breakdown.sessionCount}</h3>
                          </div>
                          <Users className="h-8 w-8 text-accent" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-yellow-500">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                            <h3 className="text-2xl font-bold flex items-center gap-1">
                              {(effectivePreview.breakdown.reviewAvgRating / 100).toFixed(1)}
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            </h3>
                          </div>
                          <Star className="h-8 w-8 text-yellow-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50 backdrop-blur-sm border-l-4 border-l-green-500">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Net Payout</p>
                            <h3 className="text-2xl font-bold text-green-400">{effectivePreview.formatted.netPay}</h3>
                          </div>
                          <TrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Breakdown */}
                  <Card className="bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Payout Breakdown — {MONTHS[parseInt(selectedMonth) - 1]} {selectedYear}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-border">
                          <span className="text-muted-foreground">Base Salary</span>
                          <span className="font-medium">{effectivePreview.formatted.baseSalary}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border">
                          <span className="text-muted-foreground">Attendance Bonus ({effectivePreview.breakdown.attendanceDays} days)</span>
                          <span className="font-medium text-green-400">+{effectivePreview.formatted.attendanceBonus}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border">
                          <span className="text-muted-foreground">Session Bonus ({effectivePreview.breakdown.sessionCount} sessions)</span>
                          <span className="font-medium text-green-400">+{effectivePreview.formatted.sessionBonus}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border">
                          <span className="text-muted-foreground">Review Bonus (rating: {(effectivePreview.breakdown.reviewAvgRating / 100).toFixed(2)})</span>
                          <span className="font-medium text-green-400">+{effectivePreview.formatted.reviewBonus}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 text-lg font-bold">
                          <span>Gross Pay</span>
                          <span>{effectivePreview.formatted.grossPay}</span>
                        </div>
                        <div className="flex justify-between items-center py-3 text-lg font-bold text-green-400">
                          <span>Net Payout</span>
                          <span>{effectivePreview.formatted.netPay}</span>
                        </div>
                      </div>

                      {/* Existing Payout Alert */}
                      {existingPayout && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium text-sm">
                              Payout already generated for {MONTHS[existingPayout.month - 1]} {existingPayout.year}
                            </span>
                          </div>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            To regenerate, please delete the existing payout first from the Payout History tab.
                          </p>
                        </div>
                      )}

                      <div className="mt-6 flex gap-3">
                        <Button
                          onClick={handleGenerateAndPreview}
                          disabled={isGeneratingPdf}
                          className="gap-2"
                        >
                          {isGeneratingPdf ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          Generate & Preview
                        </Button>
                        {existingPayout ? (
                          <Button
                            variant="outline"
                            disabled
                            className="gap-2 opacity-50 cursor-not-allowed"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Already Generated
                          </Button>
                        ) : (
                          <Button
                            onClick={handleGeneratePayout}
                            disabled={createPayoutMutation.isPending}
                            variant="outline"
                            className="gap-2"
                          >
                            {createPayoutMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <IndianRupee className="h-4 w-4" />
                            )}
                            Generate Payout
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="bg-card/50 backdrop-blur-sm">
                  <CardContent className="pt-8">
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Select a trainer and month to calculate payout</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Payout History Tab */}
            <TabsContent value="history" className="space-y-6 mt-6">
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Payout History — {selectedTrainer?.firstName} {selectedTrainer?.lastName}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingPayouts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : payouts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No payouts generated yet
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground uppercase text-xs font-medium">
                        <tr>
                          <th className="px-4 py-3">Period</th>
                          <th className="px-4 py-3">Attendance</th>
                          <th className="px-4 py-3">Sessions</th>
                          <th className="px-4 py-3">Gross</th>
                          <th className="px-4 py-3">Net</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payouts.map((payout) => (
                          <tr key={payout.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">
                              {MONTHS[payout.month - 1]} {payout.year}
                            </td>
                            <td className="px-4 py-3">{payout.attendanceDays} days</td>
                            <td className="px-4 py-3">{payout.sessionCount}</td>
                            <td className="px-4 py-3">{formatCurrency(payout.grossPay)}</td>
                            <td className="px-4 py-3 font-bold text-green-400">{formatCurrency(payout.netPay)}</td>
                            <td className="px-4 py-3">{getStatusBadge(payout.status)}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 flex-wrap items-center">
                                {isLinkReady(payout) && (
                                  <Badge variant="outline" className="h-5 text-[10px] gap-0.5 text-green-600 border-green-300">
                                    <LinkIcon className="h-2.5 w-2.5" /> Link ready
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleDownloadPayslip(payout)}
                                  disabled={isGeneratingPdf}
                                >
                                  {isGeneratingPdf ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <FileDown className="h-3 w-3" />
                                  )}
                                  PDF
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-green-500 hover:text-green-400"
                                  onClick={() => handleShareWhatsApp(payout)}
                                  disabled={isGeneratingPdf}
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  WA
                                </Button>
                                {payout.status === "draft" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs gap-1 text-blue-400"
                                    onClick={() => handleUpdateStatus(payout.id, "approved")}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <Eye className="h-3 w-3" /> Approve
                                  </Button>
                                )}
                                {payout.status === "approved" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs gap-1 text-green-400"
                                    onClick={() => handleUpdateStatus(payout.id, "paid")}
                                    disabled={updateStatusMutation.isPending}
                                  >
                                    <CheckCircle className="h-3 w-3" /> Mark Paid
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                                  onClick={() => handleDeletePayout(payout.id)}
                                  disabled={deletePayoutMutation.isPending}
                                >
                                  {deletePayoutMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* WhatsApp Share Dialog */}
        <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
                Send Payslip via WhatsApp
              </DialogTitle>
              <DialogDescription>
                {activePayoutForAction
                  ? `Sending payslip for ${MONTHS[activePayoutForAction.month - 1]} ${activePayoutForAction.year} to the trainer.`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  data-testid="input-whatsapp-phone"
                />
                <p className="text-xs text-muted-foreground">
                  The payslip PDF will be sent to this number via WhatsApp.
                </p>
              </div>
              {activePayoutForAction && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net Payout</span>
                    <span className="font-bold text-green-400">{formatCurrency(activePayoutForAction.netPay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period</span>
                    <span>{MONTHS[activePayoutForAction.month - 1]} {activePayoutForAction.year}</span>
                  </div>
                  {getPayslipUrl(activePayoutForAction) && (
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                      <LinkIcon className="h-3 w-3" /> Payslip link ready — will use existing link
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => { setWhatsappDialogOpen(false); setWhatsappPhone(""); }}
                disabled={sendWhatsAppMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendWhatsApp}
                disabled={!whatsappPhone || sendWhatsAppMutation.isPending}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {sendWhatsAppMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4" />
                )}
                Send via WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payout</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this payout? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeletePayout}
                disabled={deletePayoutMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletePayoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
