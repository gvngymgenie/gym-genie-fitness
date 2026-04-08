export const connectedClients: Map<string, any> = new Map();
export function broadcastNotification(notification: any, userId?: string, memberId?: string): void {
  const key = userId ?? (memberId ? `member_${memberId}` : "");
  if (!key) {
    console.log("[Broadcast] no target specified");
    return;
  }
  console.log("[Broadcast] to", key, notification);
  // shim: no actual WebSocket broadcast in serverless environment yet
}
// A lightweight serverless-friendly entry point for Vercel.
// We export a function that can be invoked by the serverless platform
// and avoid starting a long-running HTTP server in the function scope.

import express from "express";
import type { Request, Response } from "express";
import { Server } from "http";
import { createServer } from "http";
import { registerRoutes } from "./routes";

// Basic Express app that will be reused across invocations
const app = express();
const httpServer: Server = createServer(app);

let initialized = false;

// Minimal middleware to preserve existing behavior
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));

// Simple CORS allowing all origins (production beware)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") res.status(204).end();
  else next();
});

// Prevent caching on all API routes
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Lightweight logger
function log(message: string, source: string = "express") {
  const t = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${t} [${source}] ${message}`);
}

async function initialize() {
  if (initialized) return;
  initialized = true;
  try {
    console.log("[Init] Starting route registration...");
    await registerRoutes(httpServer, app);
    log("Routes registered for serverless environment");
  } catch (err) {
    console.error("[Init] Failed to initialize serverless routes:", err);
    console.error("[Init] Error stack:", err instanceof Error ? err.stack : 'No stack');
  }
}

// The handler that the serverless platform will call
export default async function handler(req: any, res: any) {
  try {
    console.log(`[Handler] ${req.method} ${req.url}`);
    console.log(`[Handler] Headers:`, JSON.stringify(req.headers));
    
    await initialize();
    console.log("[Handler] Routes ready, processing request...");
    
    // Use Express's router directly - wrap in promise for async handling
    await new Promise<void>((resolve, reject) => {
      app(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log("[Handler] Request processed");
  } catch (err) {
    console.error("[Handler] Error:", err);
    console.error("[Handler] Error stack:", err instanceof Error ? err.stack : 'No stack');
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error", message: err instanceof Error ? err.message : 'Unknown error' });
    }
  }
}

// Start the server if this file is run directly (for local development)
// Only start if not in serverless environment
if (process.argv[1]?.includes('index.ts') || process.argv[1]?.includes('index.js')) {
  // Check if we're in a serverless environment (Vercel, AWS Lambda, etc.)
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTION_NAME;
  
  if (!isServerless) {
    const PORT = process.env.PORT || 5000;
    (async () => {
      try {
        await initialize();
        httpServer.listen(PORT, () => {
          log(`Server started on port ${PORT}`, "server");
          console.log(`🚀 Server running at http://localhost:${PORT}`);
          console.log(`📚 API Docs available at http://localhost:${PORT}/api-docs`);
        });
      } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
      }
    })();
  }
}
