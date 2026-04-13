import { type Express } from "express";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client
let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Allow all image types including jpeg, jpg, png, gif, svg, webp
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/svg+xml',
      'image/webp'
    ];
    if (allowedTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, SVG, WebP) are allowed'));
    }
  }
});

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
  app.post("/api/uploads", upload.single('file'), async (req, res) => {
    try {
      console.log('Upload request received:', {
        hasFile: !!req.file,
        fileName: req.file?.originalname,
        mimeType: req.file?.mimetype,
        fileSize: req.file?.size,
        hasBody: !!req.body
      });

      // Handle file upload from multer
      if (!req.file) {
        console.log('No file in request, checking for URL-based upload');
        // Check if it's a URL-based upload
        if (req.body?.url) {
          const imageUrl = req.body.url;
          const response = await fetch(imageUrl);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

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

            return res.json({
              success: true,
              url: publicUrl,
              filename,
              source: 'supabase'
            });
          } else {
            const filePath = path.join(UPLOADS_DIR, filename);
            fs.writeFileSync(filePath, buffer);

            return res.json({
              success: true,
              url: `/uploads/${filename}`,
              filename,
              source: 'local'
            });
          }
        }
        return res.status(400).json({ error: "No file or URL provided" });
      }

      const fileBuffer = req.file.buffer;
      const filename = `${uuidv4()}${path.extname(req.file.originalname)}`;
      console.log('Processing file upload:', { filename, mimetype: req.file.mimetype });

      if (supabase) {
        console.log('Uploading to Supabase storage');
        
        // Try to create the bucket if it doesn't exist (ignore errors if it already exists)
        try {
          await supabase.storage.createBucket('avatars', {
            public: true,
            allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'],
            fileSizeLimit: 5 * 1024 * 1024 // 5MB
          });
          console.log('Created avatars bucket');
        } catch (bucketError: any) {
          // Bucket might already exist, continue
          console.log('Bucket creation note:', bucketError.message);
        }
        
        // Upload to Supabase
        const { data, error } = await supabase.storage
          .from("avatars")
          .upload(`logos/${filename}`, fileBuffer, {
            contentType: req.file.mimetype || "image/jpeg",
            upsert: true
          });

        if (error) {
          console.error('Supabase upload error:', error);
          
          // If bucket still doesn't exist, fall back to local storage
          if (error.message.includes('Bucket not found')) {
            console.log('Falling back to local storage due to missing bucket');
            const logosDir = path.join(UPLOADS_DIR, "logos");
            if (!fs.existsSync(logosDir)) {
              fs.mkdirSync(logosDir, { recursive: true });
            }
            const filePath = path.join(logosDir, filename);
            fs.writeFileSync(filePath, fileBuffer);

            console.log('Local upload successful:', filePath);
            return res.json({
              success: true,
              url: `/uploads/logos/${filename}`,
              filename,
              source: 'local'
            });
          }
          
          throw new Error(error.message);
        }

        console.log('Supabase upload successful:', data);
        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(`logos/${filename}`);

        res.json({
          success: true,
          url: publicUrl,
          filename,
          source: 'supabase'
        });
      } else {
        console.log('Supabase not configured, using local storage');
        // Fallback to local storage
        const logosDir = path.join(UPLOADS_DIR, "logos");
        if (!fs.existsSync(logosDir)) {
          fs.mkdirSync(logosDir, { recursive: true });
        }
        const filePath = path.join(logosDir, filename);
        fs.writeFileSync(filePath, fileBuffer);

        console.log('Local upload successful:', filePath);
        res.json({
          success: true,
          url: `/uploads/logos/${filename}`,
          filename,
          source: 'local'
        });
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
