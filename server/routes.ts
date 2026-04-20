import { type Express } from "express";
import { Server } from "http";
import swaggerUi from "swagger-ui-express";
import swaggerSpecs from "./swagger";

// Import all route modules
import { registerAuthRoutes } from "./routes/auth";
import { registerUserRoutes } from "./routes/users";
import { registerPlanRoutes } from "./routes/plans";
import { registerInventoryRoutes } from "./routes/inventory";
import { registerLeadRoutes } from "./routes/leads";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerCompanyRoutes } from "./routes/company";
import { registerMemberRoutes } from "./routes/members";
import { registerAttendanceRoutes } from "./routes/attendance";
import { registerStaffAttendanceRoutes } from "./routes/staff-attendance";
import { registerBranchRoutes } from "./routes/branches";
import { registerWorkoutRoutes } from "./routes/workouts";
import { registerDietRoutes } from "./routes/diets";
import { registerTrainerRoutes } from "./routes/trainers";
import { registerPushRoutes } from "./routes/push";
import { registerRevenueRoutes } from "./routes/revenue";
import { registerPaymentRoutes } from "./routes/payments";
import { registerRoleRoutes } from "./routes/roles";
import { registerOptionsRoutes } from "./routes/options";
import { registerUploadsRoutes } from "./routes/uploads";
import { registerAIRoutes } from "./routes/ai";
import { registerMemberCreditsRoutes } from "./routes/memberCredits";
 import { registerSalaryRoutes } from "./routes/salary";
 import { registerAiUsageRoutes } from "./routes/aiUsage";
 import { registerWhatsAppRoutes } from "./routes/whatsapp";
 import { registerModuleControlRoutes } from "./routes/module-control";
 import { registerBookingsRoutes } from "./routes/bookings";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint (no DB required)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Register Swagger UI route
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

  // Register all route modules
  registerAuthRoutes(app);
  registerUserRoutes(app);
  registerCompanyRoutes(app);
  registerPlanRoutes(app);
  registerInventoryRoutes(app);
  registerLeadRoutes(app);
  registerMemberRoutes(app);
  registerBranchRoutes(app);
  registerAttendanceRoutes(app);
  registerStaffAttendanceRoutes(app);
  registerNotificationRoutes(app);
  registerWorkoutRoutes(app);
  registerDietRoutes(app);
  registerTrainerRoutes(app);
  registerPushRoutes(app);
  registerRevenueRoutes(app);
  registerPaymentRoutes(app);
  registerRoleRoutes(app);
  registerOptionsRoutes(app);
  registerUploadsRoutes(app);
  registerAIRoutes(app);
  registerMemberCreditsRoutes(app);
   registerSalaryRoutes(app);
   registerAiUsageRoutes(app);
   registerWhatsAppRoutes(app);
   registerModuleControlRoutes(app);
   registerBookingsRoutes(app);

  return httpServer;
}
