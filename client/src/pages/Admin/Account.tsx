import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Building2, Phone, MapPin, User, Plus, Edit2, Trash2, Loader2, Save, Bell, BellOff, CheckCircle, XCircle, Image } from "lucide-react";
import type { CompanySettings, Branch } from "@shared/schema";
import { oneSignalManager, getOneSignalPlayerId, isOneSignalSubscribed, isOneSignalSupported } from "@/lib/onesignal";

export default function Account() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, setCompanyName, setCompanyLogo } = useAuth();

  const [openBranch, setOpenBranch] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    address: "",
    phone: "",
    email: "",
    logo: "",
  });

  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const [branchForm, setBranchForm] = useState({
    name: "",
    address: "",
    phone: "",
    contactPerson: "",
  });

  // Push notification state
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushPlayerId, setPushPlayerId] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isPushLoading, setIsPushLoading] = useState(false);

  const {
    data: settings,
    isLoading: settingsLoading,
    isError: settingsError,
    error: settingsErrorObj
  } = useQuery<CompanySettings>({
    queryKey: ["/api/company-settings"],
  });

  const {
    data: branches = [],
    isLoading: branchesLoading,
    isError: branchesError,
    error: branchesErrorObj
  } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  useEffect(() => {
    if (settings) {
      setCompanyForm({
        companyName: settings.companyName || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        logo: settings.logo || "",
      });
      setLogoPreview(settings.logo || "");
    }
  }, [settings]);

  // Check push notification status on mount
  useEffect(() => {
    const checkPushStatus = async () => {
      const supported = isOneSignalSupported();
      setIsPushSupported(supported);
      
      if (supported) {
        const permission = await oneSignalManager.getPermission();
        setPushPermission(permission);
        
        // First, check database for existing subscription
        if (user?.id) {
          try {
            const response = await fetch(`/api/push/status?userId=${user.id}`);
            if (response.ok) {
              const data = await response.json();
              if (data.isSubscribed && data.playerId) {
                // User has an active subscription in database
                setIsPushSubscribed(true);
                setPushPlayerId(data.playerId);
                console.log('Push: Found existing subscription in database:', data.playerId.substring(0, 20) + '...');
              }
            }
          } catch (error) {
            console.error('Push: Error checking database status:', error);
          }
        }
        
        // Also check OneSignal SDK state (may take time to initialize)
        if (permission === 'granted') {
          // Wait a bit for OneSignal SDK to initialize
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const subscribed = await isOneSignalSubscribed();
          const playerId = await getOneSignalPlayerId();
          
          // Update state if SDK reports subscription (more accurate)
          if (playerId) {
            setIsPushSubscribed(subscribed);
            setPushPlayerId(playerId);
            console.log('Push: OneSignal SDK reports subscription:', playerId.substring(0, 20) + '...');
          }
        }
      }
    };
    
    checkPushStatus();
  }, [user?.id]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: typeof companyForm) => {
      const res = await apiRequest("PUT", "/api/company-settings", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company-settings"] });
      // Update the global company name and logo in auth context
      if (companyForm.companyName) {
        setCompanyName(companyForm.companyName);
      }
      if (companyForm.logo) {
        setCompanyLogo(companyForm.logo);
      }
      toast({ title: "Company settings updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async (data: typeof branchForm) => {
      const res = await apiRequest("POST", "/api/branches", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Branch added successfully" });
      resetBranchForm();
      setOpenBranch(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof branchForm }) => {
      const res = await apiRequest("PATCH", `/api/branches/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Branch updated successfully" });
      resetBranchForm();
      setOpenBranch(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/branches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      toast({ title: "Branch deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetBranchForm = () => {
    setBranchForm({
      name: "",
      address: "",
      phone: "",
      contactPerson: "",
    });
    setEditingBranch(null);
  };

  const handleOpenAddBranch = () => {
    resetBranchForm();
    setOpenBranch(true);
  };

  const handleOpenEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name,
      address: branch.address,
      phone: branch.phone || "",
      contactPerson: branch.contactPerson || "",
    });
    setOpenBranch(true);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(companyForm);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File", description: "Please select an image file", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    setLogoFile(file);

    // Upload logo
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      // Get the actual error message from the server
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Upload failed with status:', response.status, responseData);
        throw new Error(responseData.error || 'Upload failed');
      }

      console.log('Upload successful:', responseData);
      setCompanyForm({ ...companyForm, logo: responseData.url });
      toast({ title: "Logo Uploaded", description: "Company logo uploaded successfully" });
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload logo",
        variant: "destructive"
      });
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBranch) {
      updateBranchMutation.mutate({ id: editingBranch.id, data: branchForm });
    } else {
      createBranchMutation.mutate(branchForm);
    }
  };

  const handleDeleteBranch = (id: string) => {
    if (confirm("Are you sure you want to delete this branch?")) {
      deleteBranchMutation.mutate(id);
    }
  };

  // Handle push notification subscription
  const handleSubscribePush = async () => {
    if (!user?.id) {
      toast({ title: "Error", description: "User not authenticated", variant: "destructive" });
      return;
    }

    setIsPushLoading(true);
    try {
      // 1. Request permission
      const permission = await oneSignalManager.requestPermission();
      setPushPermission(permission);
      
      if (permission !== 'granted') {
        toast({ 
          title: "Permission Denied", 
          description: "Please allow notifications in your browser settings",
          variant: "destructive" 
        });
        return;
      }

      // 2. Wait a moment for OneSignal to process the subscription
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Get player ID from OneSignal
      const playerId = await getOneSignalPlayerId();
      if (!playerId) {
        toast({ 
          title: "Subscription Failed", 
          description: "Could not get player ID from OneSignal. Please try again.",
          variant: "destructive" 
        });
        return;
      }

      // 4. Send to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, userId: user.id })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription to server');
      }

      // 5. Set external user ID in OneSignal
      await oneSignalManager.setExternalUserId(user.id);
      
      setPushPlayerId(playerId);
      setIsPushSubscribed(true);
      toast({ 
        title: "Successfully Subscribed", 
        description: "You will now receive push notifications" 
      });
    } catch (error) {
      console.error('Push subscription error:', error);
      toast({ 
        title: "Subscription Failed", 
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive" 
      });
    } finally {
      setIsPushLoading(false);
    }
  };

  if (settingsLoading || branchesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (settingsError || branchesError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="text-destructive font-bold">Failed to load account data</div>
        <p className="text-muted-foreground text-sm">
          {settingsErrorObj ? (settingsErrorObj as Error).message : ''}
          {branchesErrorObj ? (branchesErrorObj as Error).message : ''}
        </p>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/company-settings", "/api/branches"] })}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCompany} className="space-y-6">
            {/* Logo Upload Section */}
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Company Logo
              </Label>
              <div className="flex items-start gap-6">
                {/* Logo Preview */}
                <div className="flex flex-col items-center gap-2">
                  <div className="w-32 h-32 rounded-lg border-2 border-border bg-background flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Company Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Image className="h-12 w-12" />
                        <span className="text-xs text-center">No Logo</span>
                      </div>
                    )}
                  </div>
                  {logoUploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      Upload New Logo
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="mt-2 bg-background border-border"
                      disabled={logoUploading}
                      data-testid="input-logo-upload"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Supported formats: PNG, JPG, GIF, SVG, WebP (Max 5MB)
                    </p>
                  </div>
                  {companyForm.logo && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCompanyForm({ ...companyForm, logo: "" });
                        setLogoPreview("");
                        setLogoFile(null);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Logo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  placeholder="Your Company Name"
                  className="bg-background border-border h-11"
                  required
                  data-testid="input-company-name"
                />
                <p className="text-xs text-muted-foreground">This will be displayed as your logo title</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <Input
                  type="email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  placeholder="company@email.com"
                  className="bg-background border-border h-11"
                  data-testid="input-company-email"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Phone
                </Label>
                <Input
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  placeholder="+91 9999999999"
                  className="bg-background border-border h-11"
                  data-testid="input-company-phone"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Address
                </Label>
                <Textarea
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  placeholder="Company headquarters address"
                  className="bg-background border-border min-h-[80px]"
                  data-testid="input-company-address"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={updateSettingsMutation.isPending}
              data-testid="button-save-company"
            >
              {updateSettingsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Branches
          </CardTitle>
          <Button
            onClick={handleOpenAddBranch}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-add-branch"
          >
            <Plus className="h-4 w-4" /> Add Branch
          </Button>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No branches added yet</p>
              <p className="text-sm">Add your first branch to manage multiple locations</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {branches.map((branch) => (
                <Card key={branch.id} className="bg-background border-border" data-testid={`card-branch-${branch.id}`}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-lg text-foreground">{branch.name}</h3>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleOpenEditBranch(branch)}
                            data-testid={`button-edit-branch-${branch.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteBranch(branch.id)}
                            data-testid={`button-delete-branch-${branch.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary/70" />
                          <span>{branch.address}</span>
                        </div>
                        {branch.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 shrink-0 text-primary/70" />
                            <span>{branch.phone}</span>
                          </div>
                        )}
                        {branch.contactPerson && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 shrink-0 text-primary/70" />
                            <span>{branch.contactPerson}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Push Notifications Section */}
      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isPushSupported ? (
            <div className="text-center py-8 text-muted-foreground">
              <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Push notifications not supported</p>
              <p className="text-sm">Your browser does not support push notifications</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Permission Status */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-3">
                  {pushPermission === 'granted' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : pushPermission === 'denied' ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Bell className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Permission Status</p>
                    <p className="text-sm text-muted-foreground">
                      {pushPermission === 'granted' 
                        ? 'Notifications are allowed' 
                        : pushPermission === 'denied'
                        ? 'Notifications are blocked'
                        : 'Permission not requested yet'}
                    </p>
                  </div>
                </div>
                <Badge variant={pushPermission === 'granted' ? 'default' : pushPermission === 'denied' ? 'destructive' : 'secondary'}>
                  {pushPermission}
                </Badge>
              </div>

              {/* Subscription Status */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
                <div className="flex items-center gap-3">
                  {isPushSubscribed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">Subscription Status</p>
                    <p className="text-sm text-muted-foreground">
                      {isPushSubscribed 
                        ? 'You are subscribed to push notifications' 
                        : 'You are not subscribed to push notifications'}
                    </p>
                  </div>
                </div>
                <Badge variant={isPushSubscribed ? 'default' : 'secondary'}>
                  {isPushSubscribed ? 'Subscribed' : 'Not Subscribed'}
                </Badge>
              </div>

              {/* Player ID */}
              {pushPlayerId && (
                <div className="p-4 rounded-lg bg-background border border-border">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Player ID
                  </p>
                  <p className="font-mono text-sm break-all">{pushPlayerId}</p>
                </div>
              )}

              {/* Subscribe Button */}
              {pushPermission === 'denied' ? (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Notifications are blocked. Please enable them in your browser settings:
                  </p>
                  <ol className="text-sm text-muted-foreground mt-2 list-decimal list-inside space-y-1">
                    <li>Click the lock/info icon in your address bar</li>
                    <li>Find "Notifications" in the permissions</li>
                    <li>Change it to "Allow"</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              ) : (
                <Button
                  onClick={handleSubscribePush}
                  disabled={isPushLoading || (isPushSubscribed && pushPermission === 'granted')}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="button-subscribe-push"
                >
                  {isPushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isPushSubscribed ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Subscribed
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4" />
                      Subscribe to Notifications
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={openBranch} onOpenChange={(val) => { setOpenBranch(val); if (!val) resetBranchForm(); }}>
        <SheetContent className="sm:max-w-md w-full bg-card border-l border-border overflow-y-auto">
          <SheetHeader className="border-b border-border pb-6 mb-6">
            <SheetTitle className="text-2xl font-bold font-heading text-primary uppercase tracking-tight">
              {editingBranch ? "Edit Branch" : "Add Branch"}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSaveBranch} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Branch Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                placeholder="Main Branch"
                className="bg-background border-border h-11"
                required
                data-testid="input-branch-name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={branchForm.address}
                onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                placeholder="Full address of the branch"
                className="bg-background border-border min-h-[80px]"
                required
                data-testid="input-branch-address"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Phone
              </Label>
              <Input
                value={branchForm.phone}
                onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                placeholder="+91 9999999999"
                className="bg-background border-border h-11"
                data-testid="input-branch-phone"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Contact Person
              </Label>
              <Input
                value={branchForm.contactPerson}
                onChange={(e) => setBranchForm({ ...branchForm, contactPerson: e.target.value })}
                placeholder="Manager name"
                className="bg-background border-border h-11"
                data-testid="input-branch-contact"
              />
            </div>

            <div className="flex flex-col gap-3 pt-6 border-t border-border">
              <Button
                type="submit"
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider"
                disabled={createBranchMutation.isPending || updateBranchMutation.isPending}
                data-testid="button-submit-branch"
              >
                {(createBranchMutation.isPending || updateBranchMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBranch ? "Update Branch" : "Add Branch"}
              </Button>
              <SheetClose asChild>
                <Button type="button" variant="outline" className="w-full h-12 border-border hover:bg-muted font-bold uppercase tracking-wider">Cancel</Button>
              </SheetClose>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
