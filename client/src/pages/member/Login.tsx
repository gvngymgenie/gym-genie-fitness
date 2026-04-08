import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { pushManager, requestNotificationPermission } from "@/lib/pwa";
import { apiRequest } from "@/lib/queryClient";
import { Dumbbell, Phone, ArrowRight, ArrowLeft, CheckCircle, Bell, Send } from "lucide-react";

type Step = "phone" | "otp";

export default function MemberLogin() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const { toast } = useToast();
  const { loginMember } = useAuth();
  const [, navigate] = useLocation();

  const formatPhoneForWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('91')) return cleanPhone;
    return '91' + cleanPhone;
  };

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // First, call the API to store OTP in database
      const otpResponse = await fetch("/api/auth/member/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const otpData = await otpResponse.json();

      if (!otpResponse.ok) {
        throw new Error(otpData.error || "Failed to generate OTP");
      }

      const demoOtp = otpData.demoOtp;

      // Then send OTP via WhatsApp
      const formattedPhone = formatPhoneForWhatsApp(phone);
      const message = `Your verification code is: ${demoOtp}\n\nThis code will expire in 5 minutes.`;
      
      const waRes = await apiRequest("POST", "/api/whatsapp/send", {
        recipientType: "individual",
        phone: formattedPhone,
        recipientName: "Member",
        message: message,
      });

      const waData = await waRes.json();

      if (!waRes.ok || !waData.success) {
        console.warn("WhatsApp send failed, but OTP is stored:", waData.message);
      }

      setDemoOtp(demoOtp);
      setStep("otp");
      toast({
        title: "OTP Sent via WhatsApp",
        description: "Please check your WhatsApp for the verification code.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/member/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid OTP");
      }

      // Login successful
      loginMember(data.member);

      // Request notification permission and subscribe to push notifications
      try {
        const permission = await pushManager.requestPermission();
        if (permission === 'granted') {
          const subscription = await pushManager.subscribe(undefined, data.member.id);
          if (subscription) {
            toast({
              title: "Notifications enabled",
              description: "You'll receive important updates about your membership",
              duration: 3000,
            });
          }
        }
      } catch (pushError) {
        console.warn('Failed to setup push notifications:', pushError);
        // Don't show error to user - notifications are optional
      }

      toast({
        title: "Welcome back!",
        description: "Login successful",
      });
      navigate("/member");
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-xl">
              <Dumbbell className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold" data-testid="text-title">
            Member Portal
          </CardTitle>
          <CardDescription data-testid="text-subtitle">
            {step === "phone" 
              ? "Enter your registered phone number to login"
              : "Enter the verification code sent to your phone"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
            {/* {demoOtp && (
              <div className="text-sm text-muted-foreground text-center">
                Demo OTP: {demoOtp}
              </div>
            )} */}
          {step === "phone" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    className="pl-10"
                    data-testid="input-phone"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button 
                className="w-full h-11 bg-[#25D366] hover:bg-[#20bd59] text-white font-bold"
                onClick={handleSendOtp}
                disabled={isLoading || phone.length < 10}
                data-testid="button-send-otp"
              >
                {isLoading ? "Sending..." : "Send OTP via WhatsApp"}
                <Send className="ml-2 h-4 w-4" />
              </Button>
              <div className="text-center mt-4">
                <a 
                  href="/login" 
                  className="text-sm text-muted-foreground hover:text-primary"
                  data-testid="link-staff-login"
                >
                  Staff login
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP 
                    maxLength={6} 
                    value={otp} 
                    onChange={setOtp}
                    data-testid="input-otp"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length !== 6}
                data-testid="button-verify-otp"
              >
                {isLoading ? "Verifying..." : "Verify & Login"}
                <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setDemoOtp(null);
                }}
                data-testid="button-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Change Phone Number
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
