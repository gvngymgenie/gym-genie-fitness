import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableMultiSelect } from "@/components/ui/searchable-multi-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, CheckCheck, Plus, Trash2, Loader2, ExternalLink,
  MessageCircle, Send, RefreshCw, CheckCircle2, XCircle, Users, User, Wifi, WifiOff
} from "lucide-react";
import { format } from "date-fns";
import type { Member } from "@shared/schema";

// ─── Push Notifications ────────────────────────────────────────────────────

const sentToTypeOptions = [
  { value: "individual", label: "Individual Member" },
  { value: "all", label: "All Members" },
];

interface Notification {
  id: string;
  message: string;
  date: string;
  sentTo: string;
  sentToType: string;
  status: string;
  deliveryStatus: string;
  createdAt: string;
}

interface NotificationFormData {
  title: string;
  message: string;
  sentTo: string | string[];
  sentToType: string;
  url: string;
}

// ─── WhatsApp ──────────────────────────────────────────────────────────────

interface WhatsAppMessageLog {
  id: string;
  recipientType: "individual" | "all";
  memberId?: string;
  recipientName: string;
  phone: string;
  message: string;
  status: "sent" | "failed";
  errorMessage?: string;
  messageId?: string;
  createdAt: string;
}

interface WhatsAppStats {
  total: number;
  sent: number;
  failed: number;
}

interface WhatsAppStatus {
  configured: boolean;
  message: string;
  health?: { success: boolean; message: string; source?: 'meta' | 'waha' | 'none' };
}

interface WhatsAppSendForm {
  recipientType: "individual" | "all";
  memberIds: string[];
  phone: string;
  recipientName: string;
  message: string;
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function Notifications() {
  // Push notifications state
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<NotificationFormData>({
    title: "",
    message: "",
    sentTo: [],
    sentToType: "individual",
    url: "",
  });

  // WhatsApp state
  const [waForm, setWaForm] = useState<WhatsAppSendForm>({
    recipientType: "individual",
    memberIds: [],
    phone: "",
    recipientName: "",
    message: "",
  });

  // ── Push queries & mutations ──────────────────────────────────────────────

  const { data: notifications = [], isLoading: notifLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      let sentToValue: string | string[] = "";
      
      if (data.sentToType === "individual") {
        if (Array.isArray(data.sentTo)) {
          sentToValue = data.sentTo;
        } else {
          sentToValue = data.sentTo ? [data.sentTo] : [];
        }
      }
      
      const res = await apiRequest("POST", "/api/notifications", {
        title: data.title,
        message: data.message,
        sentTo: sentToValue,
        sentToType: data.sentToType,
        url: data.url || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: data.pushSent ? "Notification sent via OneSignal!" : "Notification created" });
      resetPushForm();
      setOpen(false);
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/notifications/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }); toast({ title: "Notification deleted" }); },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const resetPushForm = () => setFormData({ title: "", message: "", sentTo: [], sentToType: "individual", url: "" });

  const handlePushSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      return toast({ title: "Error", description: "Title and message are required", variant: "destructive" });
    }
    if (formData.sentToType === "individual" && (!formData.sentTo || (Array.isArray(formData.sentTo) && formData.sentTo.length === 0))) {
      return toast({ title: "Error", description: "Please select at least one member", variant: "destructive" });
    }
    createMutation.mutate(formData);
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "text-green-500";
      case "sending": return "text-blue-500";
      case "pending": return "text-yellow-500";
      case "partial": return "text-orange-500";
      case "failed": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  // ── WhatsApp queries & mutations ──────────────────────────────────────────

  const { data: waStatus, isLoading: waStatusLoading, refetch: refetchWaStatus } = useQuery<WhatsAppStatus>({
    queryKey: ["/api/whatsapp/status"],
    retry: false,
  });

  const { data: waMessages = [], isLoading: waMessagesLoading, refetch: refetchWaMessages } = useQuery<WhatsAppMessageLog[]>({
    queryKey: ["/api/whatsapp/messages"],
  });

  const { data: waStats } = useQuery<WhatsAppStats>({
    queryKey: ["/api/whatsapp/stats"],
  });

  const waSendMutation = useMutation({
    mutationFn: async (data: WhatsAppSendForm) => {
      // When multiple members are selected, send individually to each
      if (data.recipientType === "individual" && data.memberIds.length > 1) {
        const results = [];
        for (const memberId of data.memberIds) {
          const member = members.find(m => m.id === memberId);
          if (member?.phone) {
            const res = await apiRequest("POST", "/api/whatsapp/send", {
              recipientType: "individual",
              memberIds: [memberId],
              phone: member.phone,
              recipientName: `${member.firstName}${member.lastName ? ' ' + member.lastName : ''}`,
              message: data.message,
            });
            const result = await res.json();
            results.push(result);
          }
        }
        const sentCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;
        return { success: true, sentCount, failedCount, message: `Sent to ${sentCount} members` };
      }
      // Single member or phone number entered directly
      const res = await apiRequest("POST", "/api/whatsapp/send", {
        recipientType: data.recipientType,
        memberIds: data.memberIds.length > 0 ? data.memberIds : undefined,
        phone: data.phone || undefined,
        recipientName: data.recipientName || undefined,
        message: data.message,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/stats"] });
      if (data.success) {
        toast({ title: data.recipientType === "all" ? `Broadcast: ${data.sentCount} sent, ${data.failedCount} failed` : "WhatsApp message sent!" });
        setWaForm(prev => ({ ...prev, message: "" }));
      } else {
        toast({ title: "Failed to send", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const waDeleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await apiRequest("DELETE", `/api/whatsapp/messages/${messageId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/stats"] });
      toast({ title: "Message deleted" });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message, variant: "destructive" }),
  });

  const handleWaSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waForm.message.trim()) {
      return toast({ title: "Error", description: "Message cannot be empty", variant: "destructive" });
    }
    if (waForm.recipientType === "individual" && waForm.memberIds.length === 0 && !waForm.phone) {
      return toast({ title: "Error", description: "Please select members or enter a phone number", variant: "destructive" });
    }
    waSendMutation.mutate(waForm);
  };

  const isWaConnected = waStatus?.configured && waStatus?.health?.success;
  const waSource = waStatus?.health?.source || 'meta';
  const waSourceLabel = waSource === 'waha' ? 'INK(Self-Hosted)' : waSource === 'meta' ? 'WhatsApp Business API' : 'Not Configured';

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold font-heading text-foreground uppercase tracking-tight">NOTIFICATIONS</h1>
          <p className="text-muted-foreground">Manage push and WhatsApp notifications for your gym members.</p>
        </div>

        <Tabs defaultValue="push" className="w-full">
          <TabsList className="mb-6 bg-muted/60 border border-border">
            <TabsTrigger value="push" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold uppercase tracking-wider text-xs">
              <Bell className="h-4 w-4" /> Push Notifications
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold uppercase tracking-wider text-xs">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </TabsTrigger>
          </TabsList>

          {/* ── Push Notifications Tab ─────────────────────────────────── */}
          <TabsContent value="push">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-muted-foreground">{notifications.length} notifications sent</p>
                <Button
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30 font-bold uppercase tracking-wider"
                  onClick={() => { resetPushForm(); setOpen(true); }}
                >
                  <Plus className="h-4 w-4" /> New Push Notification
                </Button>
              </div>

              {notifLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No notifications sent yet</p>
                  <p className="text-sm">Click "New Push Notification" to get started</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] w-full max-w-3xl rounded-md border border-border p-4">
                  <div className="space-y-4">
                    {notifications.map((notif) => (
                      <Card key={notif.id} className="bg-card/50 backdrop-blur-sm border-l-4 border-l-primary">
                        <CardContent className="pt-6 pb-6 flex gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Bell className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h3 className="font-bold text-lg">{notif.message}</h3>
                              <span className="text-xs text-muted-foreground">{format(new Date(notif.createdAt), "MMM d, yyyy h:mm a")}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                To: <span className="text-foreground font-medium">{notif.sentTo}</span>
                                {notif.sentToType !== "individual" && (
                                  <span className="ml-2 px-2 py-0.5 text-xs rounded bg-primary/10 text-primary">
                                    {notif.sentToType === "all" ? "All Members" : "All"}
                                  </span>
                                )}
                              </p>
                              <div className={`flex items-center gap-1 text-xs ${getDeliveryStatusColor(notif.deliveryStatus)}`}>
                                <CheckCheck className="h-3 w-3" />
                                {notif.deliveryStatus === "delivered" ? "Delivered" :
                                  notif.deliveryStatus === "sending" ? "Sending" :
                                  notif.deliveryStatus === "partial" ? "Partially Delivered" :
                                  notif.deliveryStatus === "failed" ? "Failed" :
                                  notif.deliveryStatus}
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              <Button size="sm" variant="destructive" className="h-8 w-8 p-0"
                                onClick={() => confirm("Delete this notification?") && deleteMutation.mutate(notif.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          {/* ── WhatsApp Tab ───────────────────────────────────────────── */}
          <TabsContent value="whatsapp">
            <div className="space-y-6">

              {/* Status Banner */}
              <Card className={`border ${isWaConnected ? "border-green-500/40 bg-green-500/5" : "border-yellow-500/40 bg-yellow-500/5"}`}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {waStatusLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : isWaConnected ? (
                      <Wifi className="h-5 w-5 text-green-500" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">
                        {waStatusLoading ? "Checking connection..." :
                          isWaConnected ? `WhatsApp Connected (${waSourceLabel})` :
                          waStatus?.configured ? "API Configured but Unreachable" :
                          "WhatsApp Not Configured"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {waStatus?.health?.message || waStatus?.message || waSource === 'waha' ? "Using INK server" : "Set USE_WAHA=true or configure WHATSAPP_API_TOKEN and PHONENUMBER_ID"}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground"
                    onClick={() => { refetchWaStatus(); refetchWaMessages(); }}>
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </Button>
                </CardContent>
              </Card>

              {/* Stats Row */}
              {waStats && (
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-card/50 border-border">
                    <CardContent className="py-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                        <Send className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{waStats.total}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Sent</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border">
                    <CardContent className="py-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-500">{waStats.sent}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Delivered</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50 border-border">
                    <CardContent className="py-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-red-500/20 flex items-center justify-center">
                        <XCircle className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-500">{waStats.failed}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Failed</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Compose Form */}
                <Card className="bg-card/50 border-border">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-lg font-bold font-heading uppercase tracking-tight flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-primary" /> Compose Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleWaSend} className="space-y-5">
                      {/* Recipient Type */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Send To</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={waForm.recipientType === "individual" ? "default" : "outline"}
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={() => setWaForm(prev => ({ ...prev, recipientType: "individual", memberIds: [], phone: "", recipientName: "" }))}
                          >
                            <User className="h-3.5 w-3.5" /> Individual
                          </Button>
                          <Button
                            type="button"
                            variant={waForm.recipientType === "all" ? "default" : "outline"}
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={() => setWaForm(prev => ({ ...prev, recipientType: "all", memberIds: [], phone: "", recipientName: "" }))}
                          >
                            <Users className="h-3.5 w-3.5" /> All Members
                          </Button>
                        </div>
                      </div>

                      {/* Member/Phone selector */}
                      {waForm.recipientType === "individual" && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Members</Label>
                            <SearchableMultiSelect
                              value={waForm.memberIds}
                              onValueChange={(val) => {
                                const selectedMembers = members.filter(m => val.includes(m.id));
                                const phoneNumbers = selectedMembers.map(m => m.phone).filter(Boolean);
                                setWaForm({ 
                                  ...waForm, 
                                  memberIds: val,
                                  phone: phoneNumbers.join(', ')
                                });
                              }}
                              members={members}
                              placeholder="Choose members"
                              className="h-11"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number(s)</Label>
                            <Input
                              value={waForm.phone}
                              onChange={(e) => setWaForm(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="+966XXXXXXXXX"
                              className="bg-background border-border h-11"
                            />
                            <p className="text-xs text-muted-foreground">International format, e.g. +966501234567</p>
                          </div>
                        </div>
                      )}

                      {waForm.recipientType === "all" && (
                        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm text-yellow-600 dark:text-yellow-400">
                          This will send a message to all <strong>{members.length}</strong> members who have a phone number on file.
                        </div>
                      )}

                      {/* Message */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Message <span className="text-destructive">*</span>
                        </Label>
                        <textarea
                          value={waForm.message}
                          onChange={(e) => setWaForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Type your WhatsApp message here..."
                          className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                          required
                        />
                        <p className="text-xs text-muted-foreground text-right">{waForm.message.length}/1000</p>
                      </div>

                      {/* Preview */}
                      {waForm.message && (
                        <div className="rounded-xl bg-[#e9fde5] dark:bg-[#1a2e1a] p-3 border border-green-200 dark:border-green-900">
                          <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wider">WhatsApp Preview</p>
                          <div className="bg-white dark:bg-[#1f321f] rounded-lg p-3 shadow-sm max-w-xs">
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{waForm.message}</p>
                            <p className="text-[10px] text-gray-400 text-right mt-1">{format(new Date(), "h:mm a")}</p>
                          </div>
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="w-full h-11 bg-[#25D366] hover:bg-[#20bd59] text-white font-bold uppercase tracking-wider gap-2 shadow-lg shadow-green-500/20"
                        disabled={waSendMutation.isPending || (waForm.recipientType === "individual" && waForm.memberIds.length === 0 && !waForm.phone)}
                      >
                        {waSendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {waSendMutation.isPending ? "Sending..." : waForm.recipientType === "all" ? "Broadcast to All Members" : "Send WhatsApp Message"}
                      </Button>
                      {!isWaConnected && !waStatusLoading && (
                        <p className="text-xs text-center text-muted-foreground">{waSource === 'waha' ? "WAHA server not connected. Check server status." : "Configure WAHA or WhatsApp Business API to enable sending."}</p>
                      )}
                    </form>
                  </CardContent>
                </Card>

                {/* Message History */}
                <Card className="bg-card/50 border-border">
                  <CardHeader className="border-b border-border pb-4">
                    <CardTitle className="text-lg font-bold font-heading uppercase tracking-tight flex items-center gap-2">
                      <Bell className="h-5 w-5 text-primary" /> Message History
                      <Badge variant="secondary" className="ml-auto text-xs">{waMessages.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {waMessagesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : waMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <MessageCircle className="h-10 w-10 mb-3 opacity-40" />
                        <p className="text-sm font-medium">No messages sent yet</p>
                        <p className="text-xs">Messages will appear here after sending</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[480px]">
                        <div className="divide-y divide-border">
                          {waMessages.map((msg) => (
                            <div key={msg.id} className="px-5 py-4 hover:bg-muted/30 transition-colors group">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.status === "sent" ? "bg-green-500/15" : "bg-red-500/15"}`}>
                                    {msg.status === "sent"
                                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                      : <XCircle className="h-3.5 w-3.5 text-red-500" />
                                    }
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-sm truncate">{msg.recipientName}</p>
                                      {msg.recipientType === "all" && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Broadcast</Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{msg.phone}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                                    {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                                    onClick={() => {
                                      if (confirm("Delete this message from history?")) {
                                        waDeleteMutation.mutate(msg.id);
                                      }
                                    }}
                                    disabled={waDeleteMutation.isPending}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground line-clamp-2 pl-9">{msg.message}</p>
                              {msg.errorMessage && (
                                <p className="mt-1 text-xs text-red-500 pl-9">Error: {msg.errorMessage}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Push Notification Sheet */}
        <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetPushForm(); }}>
          <SheetContent className="sm:max-w-lg w-full bg-card border-l border-border overflow-y-auto">
            <SheetHeader className="border-b border-border pb-6 mb-6">
              <SheetTitle className="text-2xl font-bold font-heading text-primary uppercase tracking-tight">
                New Push Notification
              </SheetTitle>
            </SheetHeader>

            <form onSubmit={handlePushSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Special Offer!"
                  className="bg-background border-border h-12 text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Message <span className="text-destructive">*</span>
                </Label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="e.g., Get 20% off on all premium plans this week!"
                  className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Send To <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.sentToType} onValueChange={(val) => setFormData({ ...formData, sentToType: val, sentTo: [] })}>
                  <SelectTrigger className="bg-background border-border h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sentToTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.sentToType === "individual" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Select Members <span className="text-destructive">*</span>
                  </Label>
                  <SearchableMultiSelect
                    value={formData.sentTo as string[]}
                    onValueChange={(val) => setFormData({ ...formData, sentTo: val })}
                    members={members}
                    placeholder="Choose members"
                    className="h-12"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <ExternalLink className="inline h-3 w-3 mr-1" />
                  Link URL (Optional)
                </Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="e.g., /member/payments or https://example.com"
                  className="bg-background border-border h-11"
                />
                <p className="text-xs text-muted-foreground">Where the user will be directed when they tap the notification</p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">Preview</Label>
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md max-w-sm">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">Gym Genie</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                        {formData.title || "Notification Title"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {formData.message || "Notification message will appear here..."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <Button
                  type="submit"
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-base"
                  disabled={createMutation.isPending || (formData.sentToType === "individual" && (!formData.sentTo || (Array.isArray(formData.sentTo) && formData.sentTo.length === 0)))}
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Push Notification
                </Button>
                <SheetClose asChild>
                  <Button type="button" variant="outline" className="w-full h-12 border-border hover:bg-muted font-bold uppercase tracking-wider">
                    Cancel
                  </Button>
                </SheetClose>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}
