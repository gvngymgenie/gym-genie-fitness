import { Link, useLocation } from "wouter";
import { Home, Dumbbell, Heart, Bell, Users, LogOut, Menu, X, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import generatedImage from "@assets/generated_images/dark_modern_abstract_gym_background_texture_with_geometric_shapes.png";

const memberNav = [
  { icon: Home, label: "Dashboard", href: "/member" },
  { icon: CreditCard, label: "Payments", href: "/member/payments" },
  { icon: Dumbbell, label: "My Workouts", href: "/member/workouts" },
  { icon: Heart, label: "Health Tracker", href: "/member/health" },
  { icon: Bell, label: "Notifications", href: "/member/notifications" },
  { icon: Users, label: "My Trainers", href: "/member/trainers" },
];

export function MemberLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { member, logoutMember } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent selection:text-accent-foreground">
      {/* Background Texture */}
      <div 
        className="fixed inset-0 z-0 opacity-10 pointer-events-none mix-blend-overlay"
        style={{ 
          backgroundImage: `url(${generatedImage})`, 
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen fixed left-0 top-0 z-40 hidden md:flex">
        <div className="p-6">
          <Link href="/member">
            <div className="cursor-pointer">
              <h1 className="text-2xl font-bold text-primary font-heading tracking-wider flex items-center gap-2">
                <Dumbbell className="h-8 w-8 text-accent" />
                Lime Fitness
              </h1>
              <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Member Portal</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
          {memberNav.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer group",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-sidebar-primary-foreground" : "text-muted-foreground group-hover:text-accent")} />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          {member && (
            <div className="px-4 py-2 mb-2 text-sm text-muted-foreground">
              Welcome, {member.firstName || 'Member'}
            </div>
          )}
          <button 
            onClick={logoutMember}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-colors cursor-pointer"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed left-0 top-16 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-40 md:hidden shadow-2xl">
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto py-4">
              {memberNav.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer group",
                        isActive 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5", isActive ? "text-sidebar-primary-foreground" : "text-muted-foreground group-hover:text-accent")} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-sidebar-border">
              <Link href="/">
                <button className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-colors cursor-pointer">
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Logout</span>
                </button>
              </Link>
            </div>
          </aside>
        </>
      )}

      {/* Mobile Header */}
      <header className="md:hidden h-16 border-b border-border bg-background flex items-center px-4 justify-between sticky top-0 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-accent" />
          ) : (
            <Menu className="h-6 w-6 text-foreground" />
          )}
        </button>
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-accent" />
          <span className="font-bold text-lg font-heading text-primary">Lime Fitness</span>
        </div>
        <div className="w-10" />
      </header>

      <div className="md:ml-64 min-h-screen flex flex-col relative z-10">
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 md:mt-0 mt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
