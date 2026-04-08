import { type Express } from "express";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "avatars");

export function registerUploadsRoutes(app: Express): void {
  // GET /api/uploads/list - List all uploaded files
  app.get("/api/uploads/list", async (req, res) => {
    try {
      const files: any[] = [];

      // Get local files
      if (fs.existsSync(UPLOADS_DIR)) {
        const localFiles = fs.readdirSync(UPLOADS_DIR);
        for (const filename of localFiles) {
          const filePath = path.join(UPLOADS_DIR, filename);
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            files.push({
              id: filename,
              filename,
              url: `/uploads/avatars/${filename}`,
              size: stats.size,
              uploadedAt: stats.mtime.toISOString(),
              source: 'local'
            });
          }
        }
      }

      // Get Supabase files if configured
      if (supabase) {
        try {
          const { data: sbFiles, error } = await supabase.storage
            .from("avatars")
            .list("avatars", { limit: 100 });
            
          if (!error && sbFiles) {
            for (const sbFile of sbFiles) {
              const { data: { publicUrl } } = supabase.storage
                .from("avatars")
                .getPublicUrl(`avatars/${sbFile.name}`);
              
              files.push({
                id: sbFile.name,
                filename: sbFile.name,
                url: publicUrl,
                size: sbFile.metadata?.size || 0,
                uploadedAt: sbFile.created_at || new Date().toISOString(),
                source: 'supabase'
              });
            }
          }
        } catch (e) {
          console.error("Error fetching Supabase files:", e);
        }
      }

      res.json(files);
    } catch (error) {
      console.error("Error listing files:", error);
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  // GET /api/uploads/supabase-stats - Get Supabase storage stats
  app.get("/api/uploads/supabase-stats", async (req, res) => {
    try {
      if (!supabase) {
        return res.json(null);
      }

      const { data: sbFiles, error } = await supabase.storage
        .from("avatars")
        .list("avatars", { limit: 100 });

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const totalSize = sbFiles?.reduce((acc, file) => acc + (file.metadata?.size || 0), 0) || 0;

      res.json({
        fileCount: sbFiles?.length || 0,
        totalSize
      });
    } catch (error) {
      console.error("Error getting Supabase stats:", error);
      res.status(500).json({ error: "Failed to get Supabase stats" });
    }
  });

  // POST /api/uploads - Upload a new file
  app.post("/api/uploads", async (req, res) => {
    try {
      const isMultipart = req.headers["content-type"]?.includes("multipart/form-data");

      if (isMultipart && req.body?.file) {
        // Handle file upload from FormData
        const fileBuffer = Buffer.from(req.body.file.data || req.body.file, "base64");
        const ext = path.extname(req.body.file.name || ".jpg") || ".jpg";
        const filename = `${uuidv4()}${ext}`;

        if (supabase) {
          // Upload to Supabase
          const { data, error } = await supabase.storage
            .from("avatars")
            .upload(`avatars/${filename}`, fileBuffer, {
              contentType: req.body.file.type || "image/jpeg",
              upsert: true
            });

          if (error) {
            throw new Error(error.message);
          }

          const { data: { publicUrl } } = supabase.storage
            .from("avatars")
            .getPublicUrl(`avatars/${filename}`);

          res.json({
            success: true,
            url: publicUrl,
            filename,
            source: 'supabase'
          });
        } else {
          // Fallback to local storage
          const filePath = path.join(UPLOADS_DIR, filename);
          fs.writeFileSync(filePath, fileBuffer);
          
          res.json({
            success: true,
            url: `/uploads/avatars/${filename}`,
            filename,
            source: 'local'
          });
        }
      } else if (req.body?.url) {
        // Handle URL-based upload (download and upload to Supabase)
        const imageUrl = req.body.url;
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Determine content type from response
        const contentType = response.headers.get("content-type") || "image/jpeg";
        const ext = path.extname(imageUrl) || ".jpg";
        const filename = `${uuidv4()}${ext}`;

        if (supabase) {
          const { data, error } = await supabase.storage
            .from("avatars")
            .upload(`avatars/${filename}`, buffer, {
              contentType,
              upsert: true
            });

          if (error) {
            throw new Error(error.message);
          }

          const { data: { publicUrl } } = supabase.storage
            .from("avatars")
            .getPublicUrl(`avatars/${filename}`);

          res.json({
            success: true,
            url: publicUrl,
            filename,
            source: 'supabase'
          });
        } else {
          // Fallback to local storage
          const filePath = path.join(UPLOADS_DIR, filename);
          fs.writeFileSync(filePath, buffer);
          
          res.json({
            success: true,
            url: `/uploads/avatars/${filename}`,
            filename,
            source: 'local'
          });
        }
      } else {
        res.status(400).json({ error: "No file or URL provided" });
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ error: error.message || "Upload failed" });
    }
  });

  // DELETE /api/uploads/:id - Delete a file
  app.delete("/api/uploads/:id", async (req, res) => {
    try {
      const filename = req.params.id;

      // Try to delete from Supabase first
      if (supabase) {
        const { error } = await supabase.storage
          .from("avatars")
          .remove([`avatars/${filename}`]);

        if (!error) {
          return res.json({ success: true, source: 'supabase' });
        }
      }

      // Fallback to local storage
      const filePath = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return res.json({ success: true, source: 'local' });
      }

      res.status(404).json({ error: "File not found" });
    } catch (error: any) {
      console.error("Delete error:", error);
      res.status(500).json({ error: error.message || "Delete failed" });
    }
  });
}
