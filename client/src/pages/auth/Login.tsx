import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell } from "lucide-react";
import bgmain from "../../assets/bg-main.jpg";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type { SafeUser } from "@shared/schema";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("admin");
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (username) {
      try {
        const res = await apiRequest("POST", "/api/auth/login", { username, password });
        const { user } = await res.json();
        
        login(user);
        
        toast({
          title: "Login Successful",
          description: `Welcome, ${user.firstName}!`,
        });
        navigate("/dashboard");
        return;
      } catch (error) {
        toast({
          title: "Invalid Credentials",
          description: "Please check your username and password",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }
    
    const demoUser: SafeUser = {
      id: "demo-" + Date.now(),
      username: "demo_" + selectedRole,
      email: `${selectedRole}@demo.gym`,
      firstName: "Demo",
      lastName: selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1),
      phone: "9999999999",
      role: selectedRole as any,
      isActive: true,
      createdAt: new Date(),
    };
    
    login(demoUser);
    
    toast({
      title: "Demo Login",
      description: `Logged in as ${selectedRole}`,
    });
    navigate("/dashboard");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10"
      style={{
        margin: "-25px -50px 0",
        backgroundImage: `linear-gradient(to top, rgb(14 22 41 / 1), rgba(0, 0, 0, 0.5)), url(${bgmain})`,
        backgroundSize: "125%,125%",
        backgroundPositionX: "center, center",
      }}
    >
      <Card
        className="w-full max-w-md shadow-lg border-none"
        style={{
          background: "rgb(18 31 59 / 64%)",
          border: "1px solid rgb(74 87 115 / 64%)",
        }}
      >
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center place-items-center">
            <Dumbbell className="h-12 w-12 text-accent mb-4 " />
            Welcome to Lime Fitness
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Staff Login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-username"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-password"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !username || !password}
              data-testid="button-staff-submit"
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or quick demo</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Demo Login (No account needed)</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select role to demo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin (Full Access)</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              type="button"
              variant="outline" 
              className="w-full" 
              disabled={isLoading}
              onClick={() => {
                setUsername("");
                setPassword("");
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }}
              data-testid="button-demo-login"
            >
              Demo as {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
            </Button>
            
            <div className="text-center pt-4 border-t border-border mt-4">
              <p className="text-sm text-muted-foreground mb-2">Are you a gym member?</p>
              <Link href="/member/login">
                <Button variant="ghost" className="w-full" data-testid="link-member-login">
                  Member Login
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
