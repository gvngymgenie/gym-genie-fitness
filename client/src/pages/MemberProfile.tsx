import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRoute } from "wouter";
import { ArrowLeft, Edit2, Shield, Trash2, ChevronLeft, ChevronRight, Plus, X, Loader2, Camera, Brain, CreditCard, Wallet, History, Zap, Trash, IndianRupee } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { imageService } from "@/lib/imageService";
import { ProfilePicture } from "@/components/ProfilePicture";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import type { Member } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberMemberships } from "./MemberProfile/tabs/MemberMemberships";
import { MemberMeasurement } from "./MemberProfile/tabs/MemberMeasurement";
import { MemberBmiTracking } from "./MemberProfile/tabs/MemberBmiTracking";
import { MemberWorkouts } from "./MemberProfile/tabs/MemberWorkouts";
import { MemberDiet } from "./MemberProfile/tabs/MemberDiet";
import { MemberGymGeniePlus } from "./MemberProfile/tabs/MemberGymGeniePlus";

export default function MemberProfile() {
  const [, params] = useRoute("/members/:id");
  const memberId = params?.id || "";

  const { data: member, isLoading, error } = useQuery<Member>({
    queryKey: ["/api/members", memberId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/members/${memberId}`);
      return res.json();
    },
    enabled: !!memberId,
  });
  
  const [openTrainer, setOpenTrainer] = useState(false);
  const [openBranch, setOpenBranch] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [activeTab, setActiveTab] = useState("memberships");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch trainers
  const { data: trainers = [] } = useQuery({
    queryKey: ["/api/staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff");
      if (!res.ok) return [];
      const staff = await res.json();
      return staff.filter((s: any) => s.role === "trainer");
    },
  });

  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch attendance data
  const { data: attendanceData = [] } = useQuery({
    queryKey: ["/api/members", memberId, "attendance"],
    queryFn: async () => {
      const res = await fetch(`/api/members/${memberId}/attendance`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!memberId,
  });

  // Fetch interest options from API
  const { data: interestOptions = [] } = useQuery({
    queryKey: ["/api/options/interests"],
    queryFn: async () => {
      const res = await fetch("/api/options/interests");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch training types from API
  const { data: trainingTypes = [] } = useQuery({
    queryKey: ["/api/options/training-types"],
    queryFn: async () => {
      const res = await fetch("/api/options/training-types");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch member credits from member_credits table
  const { data: memberCredits, isLoading: creditsLoading, refetch: refetchCredits } = useQuery({
    queryKey: ["/api/member-credits", memberId],
    queryFn: async () => {
      const res = await fetch(`/api/member-credits/${memberId}`);
      if (!res.ok) return { balance: 5 }; // Default balance if API fails
      return res.json();
    },
    enabled: !!memberId,
  });

  // Fetch credit packages
  const { data: creditPackages = [] } = useQuery({
    queryKey: ["/api/credit-packages"],
    queryFn: async () => {
      const res = await fetch("/api/credit-packages");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch credit transactions
  const { data: creditTransactions = [] } = useQuery({
    queryKey: ["/api/member-credits", memberId, "transactions"],
    queryFn: async () => {
      const res = await fetch(`/api/member-credits/${memberId}/transactions`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!memberId,
  });

  // Credit management state
  const [openCredits, setOpenCredits] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    gender: "male",
    dob: "",
    height: "",
    address: "",
    interestAreas: [] as string[],
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update form data when member data loads
  useEffect(() => {
    if (member) {
      setFormData({
        firstName: member.firstName || "",
        lastName: member.lastName || "",
        phone: member.phone || "",
        email: member.email || "",
        gender: member.gender || "male",
        dob: member.dob || "",
        height: member.height?.toString() || "",
        address: member.address || "",
        interestAreas: member.interestAreas || [],
      });
      console.log("member:", member);
    }
  }, [member]);

  // Load avatar blob URL when member data changes
  useEffect(() => {
    if (member) {
      const avatarSrc = member.avatarStaticUrl || member.avatar;
      const loadAvatar = async () => {
        const blobUrl = await imageService.getAvatarBlobUrl(avatarSrc, `${member.firstName} ${member.lastName}`);
        setAvatarBlobUrl(blobUrl);
      };
      loadAvatar();
    }
  }, [member?.id, member?.avatarStaticUrl, member?.avatar, member?.firstName, member?.lastName]);

  const updateMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/members/${memberId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members", memberId] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Member updated successfully" });
      setOpenEdit(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Topup credits mutation
  const topupCreditsMutation = useMutation({
    mutationFn: async ({ credits, packageId, amount }: { credits: number; packageId?: string; amount?: number }) => {
      const res = await fetch(`/api/member-credits/${memberId}/topup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits, packageId, amount }),
      });
      if (!res.ok) throw new Error("Failed to topup credits");
      return res.json();
    },
    onSuccess: (updatedCredits) => {
      // Update individual member credits cache
      queryClient.setQueryData(["/api/member-credits", memberId], updatedCredits);
      
      // Update bulk credits cache for Members list
      queryClient.setQueryData(["members/credits"], (oldData: any[] = []) => {
        const index = oldData.findIndex(c => c.memberId === memberId);
        if (index >= 0) {
          const newData = [...oldData];
          newData[index] = { ...newData[index], ...updatedCredits };
          return newData;
        } else {
          return [...oldData, updatedCredits];
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/member-credits", memberId, "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["members/credits"] });
      toast({ title: "Credits added successfully!" });
      setSelectedPackage(null);
      setPaymentAmount(0);
      setOpenCredits(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  // Reset credits mutation
  const resetCreditsMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/member-credits/${memberId}/reset-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed to reset credits");
      return res.json();
    },
    onSuccess: (updatedCredits) => {
      // Update individual member credits cache
      queryClient.setQueryData(["/api/member-credits", memberId], updatedCredits);
      
      // Update bulk credits cache for Members list
      queryClient.setQueryData(["members/credits"], (oldData: any[] = []) => {
        const index = oldData.findIndex(c => c.memberId === memberId);
        if (index >= 0) {
          const newData = [...oldData];
          newData[index] = { ...newData[index], ...updatedCredits };
          return newData;
        } else {
          return [...oldData, updatedCredits];
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/member-credits", memberId, "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["members/credits"] });
      toast({ title: "Credits reset to 0" });
      setOpenCredits(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Handle package selection
  const handlePackageSelect = (pkg: any) => {
    setSelectedPackage(pkg);
    setPaymentAmount(pkg.price);
  };

  // Handle topup
  const handleTopup = () => {
    if (!selectedPackage) return;
    topupCreditsMutation.mutate({
      credits: selectedPackage.credits,
      packageId: selectedPackage.id,
      amount: paymentAmount,
    });
  };

  // Handle reset
  const handleReset = () => {
    if (confirm("Are you sure you want to reset all credits to 0? This cannot be undone.")) {
      resetCreditsMutation.mutate(`Manual reset by admin`);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setCameraStream(stream);
      setCameraOpen(true);
    } catch (error: any) {
      console.error('Camera error:', error);
      setCameraError(error.message || 'Failed to access camera');
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraOpen(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (!cameraStream) return;

    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const canvas = document.getElementById('camera-canvas') as HTMLCanvasElement;
    const context = canvas.getContext('2d');

    if (!video || !canvas || !context) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);

        // Stop camera and close modal
        stopCamera();
        toast({ title: "Photo captured successfully" });
      }
    }, 'image/jpeg', 0.9);
  };

  // Helper functions for calendar
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getAttendedDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    return attendanceData
      .filter((record: { date: string; }) => record.date.startsWith(monthStr))
      .map((record: { date: string; }) => parseInt(record.date.split('-')[2]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Upload avatar first if selected
      if (selectedFile) {
        console.log('Uploading avatar file:', selectedFile.name);
        const formDataUpload = new FormData();
        formDataUpload.append('avatar', selectedFile);

        const uploadResponse = await fetch(`/api/members/${memberId}/avatar`, {
          method: 'POST',
          body: formDataUpload,
          // Don't set Content-Type header manually - let browser set it for FormData
        });

        console.log('Upload response status:', uploadResponse.status);

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload failed:', errorText);
          throw new Error(`Failed to upload avatar: ${uploadResponse.status} ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        console.log('Upload successful:', uploadResult);
        toast({ title: "Profile picture uploaded successfully" });

        // Clear the preview and selected file
        setSelectedFile(null);
        setPreviewUrl(null);
      }

      // Update member data
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email,
        gender: formData.gender,
        dob: formData.dob,
        height: formData.height ? parseInt(formData.height) : null,
        address: formData.address,
        interestAreas: formData.interestAreas,
      };

      updateMemberMutation.mutate(updateData);
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  if (!memberId || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !member) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-muted-foreground">Member not found</p>
          <Link href="/members">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Members
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/members">
            <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> Back to Members
            </Button>
          </Link>
          <div className="flex gap-2">
          {/* AI Credits Chip - clickable to open credits management */}
          {memberCredits !== undefined && memberCredits !== null && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20"
              onClick={() => setOpenCredits(true)}
            >
              <Brain className="h-3 w-3" />
              {memberCredits?.balance ?? 0} Credits
            </Button>
          )}

          {/* Credit Management Sheet */}
          <Sheet open={openCredits} onOpenChange={setOpenCredits}>
            <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
              <SheetHeader className="border-b border-border pb-4">
                <SheetTitle className="flex items-center gap-2 text-xl">
                  <Wallet className="h-5 w-5 text-green-500" />
                  AI Credits Management
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-6 py-4">
                {/* Current Balance */}
                <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-3">
                    <Brain className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Balance</p>
                      <p className="text-2xl font-bold text-green-500">{memberCredits?.balance ?? 0} Credits</p>
                    </div>
                  </div>
                </div>

                {/* Credit Packages */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Add Credits
                  </Label>
                  <div className="grid grid-cols-3 gap-3">
                    {creditPackages.map((pkg: any) => (
                      <button
                        key={pkg.id}
                        onClick={() => handlePackageSelect(pkg)}
                        className={cn(
                          "p-3 rounded-lg border text-center transition-all",
                          selectedPackage?.id === pkg.id
                            ? "bg-green-500/20 border-green-500 text-green-500"
                            : "bg-muted/50 border-border hover:bg-muted"
                        )}
                      >
                        <p className="font-bold text-lg">{pkg.credits}</p>
                        <p className="text-xs text-muted-foreground">Credits</p>
                        <p className="font-semibold text-green-500 mt-1">₹{pkg.price}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Amount */}
                {selectedPackage && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold">Amount to Pay</Label>
                      <div className="flex items-center gap-1 text-green-500 font-bold text-xl">
                        <IndianRupee className="h-5 w-5" />
                        <span>{paymentAmount}</span>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-green-500 hover:bg-green-600 text-white gap-2"
                      onClick={handleTopup}
                      disabled={topupCreditsMutation.isPending}
                    >
                      {topupCreditsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      Add {selectedPackage.credits} Credits
                    </Button>
                  </div>
                )}

                {/* Reset Credits */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 gap-2"
                    onClick={handleReset}
                    disabled={resetCreditsMutation.isPending || (memberCredits?.balance ?? 0) === 0}
                  >
                    {resetCreditsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash className="h-4 w-4" />
                    )}
                    Reset All Credits to 0
                  </Button>
                </div>

                {/* Transaction History */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Credit History
                  </Label>
                  <div className="rounded-lg border border-border max-h-48 overflow-y-auto">
                    {creditTransactions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Date</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Amount</TableHead>
                            <TableHead className="text-xs">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {creditTransactions.slice(0, 10).map((tx: any) => (
                            <TableRow key={tx.id} className="hover:bg-muted/30">
                              <TableCell className="text-xs">
                                {new Date(tx.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-xs capitalize">
                                <Badge variant="outline" className={cn(
                                  tx.type === "topup" && "bg-green-500/20 text-green-500",
                                  tx.type === "reset" && "bg-red-500/20 text-red-500",
                                  tx.type === "deduct" && "bg-orange-500/20 text-orange-500"
                                )}>
                                  {tx.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                <span className={tx.amount > 0 ? "text-green-500" : "text-red-500"}>
                                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">{tx.balanceAfter}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No credit transactions yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
            <Sheet open={openEdit} onOpenChange={setOpenEdit}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                  <Edit2 className="h-4 w-4" /> Edit Profile
                </Button>
              </SheetTrigger>
              <SheetContent className="max-w-2xl overflow-y-auto bg-card border-border shadow-2xl">
                <SheetHeader className="border-b border-border pb-4 mb-4">
                  <SheetTitle className="text-2xl font-bold font-heading text-primary">Edit Member Profile</SheetTitle>
                </SheetHeader>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Profile Picture Section */}
                  <div className="flex flex-col items-center space-y-4 pb-6 border-b border-border">
                    <div className="relative">
                      <div className="h-24 w-24 rounded-xl overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                        {previewUrl ? (
                          <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                          <ProfilePicture 
                            src={member.avatarStaticUrl ?? member.avatar ?? undefined}
                            memberName={`${member.firstName} ${member.lastName}`}
                            className="h-full w-full object-cover"
                          />
                        )}
                        
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                    <div className="text-center space-y-2">
                      <div className="flex gap-2 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('avatar-upload')?.click()}
                          className="gap-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          Upload Photo
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={startCamera}
                          className="gap-2"
                        >
                          <Camera className="h-4 w-4" />
                          Take Photo
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Max 5MB, JPG/PNG/GIF/WebP</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">First Name</Label>
                      <Input
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="bg-background border-border"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Last Name</Label>
                      <Input
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-background border-border"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Gender</Label>
                      <RadioGroup
                        value={formData.gender}
                        onValueChange={(value) => setFormData({ ...formData, gender: value })}
                        className="flex gap-4 pt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="male" id="edit-male" />
                          <Label htmlFor="edit-male" className="text-xs">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="female" id="edit-female" />
                          <Label htmlFor="edit-female" className="text-xs">Female</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Date of Birth</Label>
                      <Input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Height (cm)</Label>
                      <Input
                        type="number"
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Interest Areas</Label>
                      <MultiSelectDropdown
                        value={formData.interestAreas}
                        onValueChange={(values) => setFormData({ ...formData, interestAreas: values })}
                        options={interestOptions.map((opt: any) => opt.name)}
                        placeholder="Select Interest Areas"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Address</Label>
                      <Textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="bg-background border-border min-h-[80px]"
                        placeholder="Enter full address"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
                    <SheetClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </SheetClose>
                    <Button
                      type="submit"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={updateMemberMutation.isPending}
                    >
                      {updateMemberMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </SheetContent>
            </Sheet>
            {/* 
             * Freeze Action - TODO: Implement functionality
             * Purpose: Temporarily suspend a member's membership
             * Features:
             * - Change member status from "Active" to "Frozen"
             * - Pause membership billing during freeze period
             * - Allow members to resume membership later
             * - Store freeze start/end dates
             * 
             * API Endpoint: PATCH /api/members/:id/freeze
             * Request Body: { freeze: boolean, freezeReason?: string, freezeEndDate?: string }
             */}
            <Button size="sm" variant="outline" className="gap-2 border-border" title="TODO: Implement freeze functionality">
              <Shield className="h-4 w-4" /> Freeze
            </Button>
            <Button size="sm" variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
        
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Profile Info */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border overflow-hidden">
              <CardContent className="pt-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative group">
                    <div className="h-32 w-32 rounded-2xl overflow-hidden border-4 border-background shadow-xl bg-muted flex items-center justify-center text-4xl font-bold text-primary">
                      <ProfilePicture 
                        src={member.avatarStaticUrl ?? member.avatar ?? undefined}
                        memberName={`${member.firstName} ${member.lastName}`}
                        className="h-full w-full object-cover"
                        size="xl"
                      />
                    </div>
                    <Button size="icon" variant="secondary" className="absolute -right-2 -bottom-2 h-8 w-8 rounded-lg shadow-lg" onClick={() => setOpenEdit(true)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <h2 className="text-2xl font-bold font-heading">{member.firstName} {member.lastName}</h2>
                      <Edit2 className="h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setOpenEdit(true)} />
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{member.address}</p>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-4 py-4 border-y border-border/50">
                    <div className="text-left space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Status</p>
                      <Badge className={cn(
                        "font-bold hover:bg-opacity-20",
                        member.status === "Active" ? "bg-green-500/20 text-green-500 border-green-500/30" :
                        member.status === "Expiring Soon" ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" :
                        member.status === "Expired" ? "bg-red-500/20 text-red-600 border-red-500/30" :
                        "bg-muted text-muted-foreground"
                      )}>{member.status}</Badge>
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Date of Joining</p>
                      <p className="text-sm font-semibold">{member.startDate}</p>
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Gender</p>
                      <p className="text-sm font-semibold capitalize">{member.gender}</p>
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Date of Birth</p>
                      <p className="text-sm font-semibold">{member.dob || "Not set"}</p>
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Phone</p>
                      <p className="text-sm font-semibold">{member.phone}</p>
                    </div>
                    <div className="text-left space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Height (cm)</p>
                      <p className="text-sm font-semibold">{member.height || "Not set"}</p>
                    </div>
                  </div>

                  <div className="w-full space-y-4 pt-2">
                    <div className="text-left">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Address</p>
                      <p className="text-sm">{member.address || "Not set"}</p>
                    </div>
                      <div className="text-left">
                        <Sheet open={openBranch} onOpenChange={setOpenBranch}>
                          <SheetTrigger asChild>
                            <div className="group cursor-pointer">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1 flex items-center justify-between">
                                Branch <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </p>
                              <p className="text-sm font-semibold text-primary underline decoration-dotted underline-offset-4">
                                {member.branch || "Not set"}
                              </p>
                            </div>
                          </SheetTrigger>
                          <SheetContent className="sm:max-w-[425px] bg-card border-border shadow-2xl">
                            <SheetHeader>
                              <SheetTitle className="text-xl font-bold font-heading text-primary">Change Branch</SheetTitle>
                            </SheetHeader>
                            <form className="space-y-6 pt-4">
                              <div className="space-y-2">
                                <Label htmlFor="branch" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Select Branch</Label>
                                <Select
                                  defaultValue={member.branch || ""}
                                  onValueChange={async (branchName) => {
                                    await apiRequest("PATCH", `/api/members/${memberId}`, { branch: branchName });
                                    queryClient.invalidateQueries({ queryKey: ["/api/members", memberId] });
                                    toast({ title: "Branch updated successfully" });
                                    setOpenBranch(false);
                                  }}
                                >
                                  <SelectTrigger className="bg-background border-border">
                                    <SelectValue placeholder="Select a branch" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {branches.map((b: any) => (
                                      <SelectItem key={b.id} value={b.name}>
                                        {b.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <Button type="button" variant="outline" onClick={() => setOpenBranch(false)}>Cancel</Button>
                                <Button type="button" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setOpenBranch(false)}>Close</Button>
                              </div>
                            </form>
                          </SheetContent>
                        </Sheet>
                      </div>
                    <div className="text-left">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Interest Areas</p>
                      <div className="flex flex-wrap gap-2">
                      
                        {member.interestAreas && member.interestAreas.length > 0 ? (
                          member.interestAreas.map((area, index) => (
                            <Badge 
                              key={index}
                              variant="secondary" 
                              className="bg-primary/10 text-primary border-primary/20 font-bold text-xs px-3 py-1 hover:bg-primary/20 transition-colors"
                            >
                              {area}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="bg-muted text-foreground font-bold text-xs px-3 py-1">
                            General Fitness
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Sheet open={openTrainer} onOpenChange={setOpenTrainer}>
                      <SheetTrigger asChild>
                        <div className="text-left group cursor-pointer">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1 flex items-center justify-between">
                            Trainer <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </p>
                          <p className="text-sm font-semibold text-primary underline decoration-dotted underline-offset-4">
                            {member.trainerId
                              ? (() => {
                                  const assignedTrainer = trainers.find((t: any) => t.id === member.trainerId);
                                  return assignedTrainer
                                    ? `${assignedTrainer.firstName} ${assignedTrainer.lastName}`
                                    : "No Trainer Assigned";
                                })()
                              : "No Trainer Assigned"
                            }
                          </p>
                        </div>
                      </SheetTrigger>
                      <SheetContent className="sm:max-w-[425px] bg-card border-border shadow-2xl">
                        <SheetHeader>
                          <SheetTitle className="text-xl font-bold font-heading text-primary">Assign Trainer</SheetTitle>
                        </SheetHeader>
                        <form className="space-y-6 pt-4">
                          <div className="space-y-2">
                            <Label htmlFor="trainer" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Select Trainer</Label>
                            <Select
                              defaultValue={member.trainerId || ""}
                              onValueChange={async (trainerId) => {
                                await apiRequest("PATCH", `/api/members/${memberId}`, { trainerId });
                                queryClient.invalidateQueries({ queryKey: ["/api/members", memberId] });
                                toast({ title: "Trainer assigned successfully" });
                                setOpenTrainer(false);
                              }}
                            >
                              <SelectTrigger className="bg-background border-border">
                                <SelectValue placeholder="Select a trainer" />
                              </SelectTrigger>
                              <SelectContent>
                                {trainers.map((trainer: any) => (
                                  <SelectItem key={trainer.id} value={trainer.id}>
                                    {trainer.firstName} {trainer.lastName} ({trainer.role})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="type" className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Training Type</Label>
                            <Select defaultValue={member.trainingType || ""}>
                              <SelectTrigger className="bg-background border-border">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {trainingTypes.length > 0 ? (
                                  trainingTypes.map((type: any) => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <>
                                    <SelectItem value="personal">Personal Training (1-on-1)</SelectItem>
                                    <SelectItem value="group">Group Session</SelectItem>
                                    <SelectItem value="online">Online Coaching</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <SheetClose asChild>
                              <Button type="button" variant="outline">Cancel</Button>
                            </SheetClose>
                            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">Assign Trainer</Button>
                          </div>
                        </form>
                      </SheetContent>
                    </Sheet>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Mini Calendar */}
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">Attendance</CardTitle>
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg">
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => navigateMonth('prev')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-bold">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => navigateMonth('next')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground uppercase">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {(() => {
                      const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
                      const attendedDays = getAttendedDays();
                      const cells = [];

                      // Empty cells for days before the first day of the month
                      for (let i = 0; i < startingDayOfWeek; i++) {
                        cells.push(
                          <div key={`empty-${i}`} className="h-8 w-8"></div>
                        );
                      }

                      // Days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        const isAttended = attendedDays.includes(day);
                        cells.push(
                          <div
                            key={day}
                            className={cn(
                              "h-8 w-8 flex items-center justify-center rounded-lg text-xs font-semibold",
                              isAttended
                                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                : "hover:bg-muted"
                            )}
                          >
                            {day}
                          </div>
                        );
                      }

                      return cells;
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Tabbed Content */}
          <div className="lg:col-span-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 mb-6">
                <TabsTrigger value="memberships" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Memberships</TabsTrigger>
                <TabsTrigger value="measurement" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Measurement</TabsTrigger>
                <TabsTrigger value="bmi-tracking" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">BMI tracking</TabsTrigger>
                <TabsTrigger value="workouts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Workouts</TabsTrigger>
                <TabsTrigger value="diet" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Diet</TabsTrigger>
                <TabsTrigger value="gymgenie-plus" className="rounded-none border-b-2 border-transparent data-[state=active]:border-yellow-500 data-[state=active]:bg-transparent px-4 py-2 text-yellow-500">GymGenie Plus</TabsTrigger>
              </TabsList>

              {/* Memberships Tab */}
              <TabsContent value="memberships">
                <MemberMemberships memberId={memberId} />
              </TabsContent>

              {/* Measurement Tab */}
              <TabsContent value="measurement">
                <MemberMeasurement memberId={memberId} />
              </TabsContent>

              {/* BMI Tracking Tab */}
              <TabsContent value="bmi-tracking">
                <MemberBmiTracking memberId={memberId} />
              </TabsContent>

              {/* Workouts Tab */}
              <TabsContent value="workouts">
                <MemberWorkouts memberId={memberId} />
              </TabsContent>

              {/* Diet Tab */}
              <TabsContent value="diet">
                <MemberDiet memberId={memberId} />
              </TabsContent>

              {/* GymGenie Plus Tab */}
              <TabsContent value="gymgenie-plus">
                <MemberGymGeniePlus memberId={memberId} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      <Dialog open={cameraOpen} onOpenChange={(open) => {
        if (!open) stopCamera();
        setCameraOpen(open);
      }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading text-primary flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Take Profile Photo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {cameraError ? (
              <div className="text-center py-8">
                <X className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-destructive text-sm">{cameraError}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-black">
                  <video
                    id="camera-video"
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                    ref={(video) => {
                      if (video && cameraStream) {
                        video.srcObject = cameraStream;
                      }
                    }}
                  />
                  <canvas id="camera-canvas" className="hidden" />
                </div>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={capturePhoto}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Capture Photo
                  </Button>
                  <Button
                    onClick={stopCamera}
                    variant="outline"
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function MoreHorizontal({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}
