import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { NotificationInitializer } from "@/components/NotificationInitializer";
import { NotificationPermissionPrompt } from "@/components/NotificationPermissionPrompt";
import { useSuperadminTerminal } from "@/hooks/useSuperadminTerminal";
import { ModuleControlTerminal } from "@/components/admin/ModuleControlTerminal";
import NotFound from "@/pages/not-found";

 // Admin Pages
 import Dashboard from "@/pages/Dashboard";
 import Home from "@/pages/Home";
 import Leads from "@/pages/Leads";
 import Members from "@/pages/Members";
 import Attendance from "@/pages/Attendance";
 import Salary from "@/pages/Salary";
 import AdminPlans from "@/pages/Admin/AdminPlans";
 import AdminStaff from "@/pages/Admin/AdminStaff";
 import AdminBookings from "@/pages/Admin/Bookings";
 import AdminRoles from "@/pages/Admin/AdminRoles";
 import AdminInventory from "@/pages/Admin/AdminInventory";
 import AdminMerchandise from "@/pages/Admin/AdminMerchandise";
 import AdminRevenue from "@/pages/Admin/AdminRevenue";
 import AdminAccount from "@/pages/Admin/AdminAccount";
 import AdminOptions from "@/pages/Admin/AdminOptions";
 import AdminUploads from "@/pages/Admin/AdminUploads";
 // import AdminAIUsage from "@/pages/Admin/AIUsage";
 import Reports from "@/pages/Reports";
 import Workouts from "@/pages/Workouts";
 import Trainers from "@/pages/Trainers";
 import Notifications from "@/pages/Notifications";
 import MemberProfile from "@/pages/MemberProfile";
 import Payments from "@/pages/Payments";

// Member Pages
import MemberDashboard from "@/pages/member/Dashboard";
import MemberWorkouts from "@/pages/member/Workouts";
import MemberHealth from "@/pages/member/Health";
import MemberTrainers from "@/pages/member/Trainers";
import MemberNotifications from "@/pages/member/Notifications";
import NotificationSettings from "@/pages/member/NotificationSettings";
import MemberLogin from "@/pages/member/Login";
import MemberPayments from "@/pages/member/Payments";

// Auth Pages
import Login from "@/pages/auth/Login";
import AdminAIUsageTable from "./components/AIUsageTable";

function Router() {
  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/login" component={Login} />

      {/* Admin Routes */}
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/leads" component={Leads} />
      <Route path="/members" component={Members} />
      <Route path="/members/:id" component={MemberProfile} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/salary" component={Salary} />
      <Route path="/payments" component={Payments} />
       <Route path="/admin">
         <Redirect to="/admin/plans" />
       </Route>
       <Route path="/admin/plans" component={AdminPlans} />
       <Route path="/admin/staff" component={AdminStaff} />
       <Route path="/admin/bookings" component={AdminBookings} />
       <Route path="/admin/roles" component={AdminRoles} />
      <Route path="/admin/inventory" component={AdminInventory} />
      <Route path="/admin/merchandise" component={AdminMerchandise} />
      <Route path="/admin/revenue" component={AdminRevenue} />
      <Route path="/admin/ai-usage" component={AdminAIUsageTable} />
      <Route path="/admin/account" component={AdminAccount} />
      <Route path="/admin/options" component={AdminOptions} />
      <Route path="/admin/uploads" component={AdminUploads} />
      <Route path="/reports" component={Reports} />
      <Route path="/workouts" component={Workouts} />
      <Route path="/trainers" component={Trainers} />
      <Route path="/notifications" component={Notifications} />

      {/* Member Routes */}
      <Route path="/member/login" component={MemberLogin} />
      <Route path="/member" component={MemberDashboard} />
      <Route path="/member/payments" component={MemberPayments} />
      <Route path="/member/workouts" component={MemberWorkouts} />
      <Route path="/member/health" component={MemberHealth} />
      <Route path="/member/trainers" component={MemberTrainers} />
      <Route path="/member/notifications" component={MemberNotifications} />
      <Route path="/member/notification-settings" component={NotificationSettings} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { isOpen, closeTerminal } = useSuperadminTerminal();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <NotificationInitializer />
          <Router />
          <PWAInstallPrompt variant="floating" debug={true} />
          <NotificationPermissionPrompt />
          <ModuleControlTerminal isOpen={isOpen} onClose={closeTerminal} />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
