import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name in a way that works in both development and production
const __filename = import.meta.url ? fileURLToPath(import.meta.url) : "";
const __dirname = __filename ? path.dirname(__filename) : path.join(process.cwd(), "server");

export function serveStatic(app: Express) {
  // Check if we're in Vercel environment
  const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

  // Path to the built client application
  const clientBuildPath = isVercel
    ? path.resolve(__dirname, "../public") // For Vercel, 'public' is typically the build output
    : path.resolve(__dirname, "../dist/public"); // For local dev, 'dist/public' is common

  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    console.log(`✅ Serving static files from: ${clientBuildPath}`);
  } else {
    // Log a warning but don't throw an error, allowing the server to start
    // This is useful for API-only routes or during initial setup.
    console.warn(`⚠️  Static file directory not found at: ${clientBuildPath}. Ensure client is built.`);
    // For Vercel, if public is missing, it might be an issue. For local, it might be a dev start.
    if (isVercel) {
        // In Vercel, if this is missing, it's a more critical issue for the frontend.
        // However, we'll let it proceed to allow API testing.
    }
  }

  // Serve uploaded avatar images
  const uploadsPath = path.resolve(__dirname, "../uploads");
  if (fs.existsSync(uploadsPath)) {
    app.use("/uploads", express.static(uploadsPath, {
      maxAge: '1h',
      etag: true,
      lastModified: true
    }));
    console.log(`✅ Serving uploaded files from: ${uploadsPath}`);
  } else {
    console.warn(`⚠️  Uploads directory not found at: ${uploadsPath}. Creating directory.`);
    try {
      fs.mkdirSync(uploadsPath, { recursive: true });
      app.use("/uploads", express.static(uploadsPath));
      console.log(`✅ Created and serving uploaded files from: ${uploadsPath}`);
    } catch (error) {
      console.error(`❌ Failed to create uploads directory: ${error}`);
    }
  }

  // SPA fallback - serve index.html for all non-API routes
  app.get("*", (req, res) => {
    // Skip API routes - let them return 404 if not found
    if (req.path.startsWith('/api')) {
      // If it's an API route that hasn't been handled, return 404
      return res.status(404).json({ error: 'API route not found' });
    }

    // Skip static file routes that should have been handled by express.static
    if (req.path.startsWith('/uploads/') || req.path.startsWith('/assets/')) {
      return res.status(404).send('Not found');
    }

    // For all other routes (client-side routes), serve the index.html
    // This allows client-side routing to work.
    const indexPath = path.resolve(clientBuildPath, "index.html");

    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // If index.html is missing, send a basic HTML structure
      // This can happen if the client hasn't been built yet.
      console.warn(`⚠️  index.html not found at: ${indexPath}. Serving fallback page.`);
      res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Gym-Genie</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
            div { text-align: center; }
            h1 { color: #333; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div>
            <h1>Gym-Genie</h1>
            <p>Loading application...</p>
            <p style="font-size: 0.8em; color: #999;">If this persists, please ensure the client application has been built.</p>
          </div>
        </body>
        </html>
      `);
    }
  });
}
