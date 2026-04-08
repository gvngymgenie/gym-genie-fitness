import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fsAsync from 'fs/promises';

/**
 * Static file upload utility using Supabase Storage
 */
export class StaticFileUpload {
  private static supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use service role key for server-side operations that require elevated privileges
  private static supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
  private static supabase = () => {
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase URL or Service Role Key is not defined in environment variables.');
    }
    return createClient(this.supabaseUrl, this.supabaseKey);
  };
  private static readonly AVATARS_BUCKET = 'avatars';

  /**
   * Verify bucket exists or create it
   */
  private static async verifyBucket(bucket: string): Promise<void> {
    const supabaseInstance = this.supabase();
    try {
      const { data, error } = await supabaseInstance.storage.getBucket(bucket);
      if (error) {
        // Bucket doesn't exist, try to create it
        const { error: createError } = await supabaseInstance.storage.createBucket(bucket, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif'],
          fileSizeLimit: 1024 * 1024 * 5 // 5MB limit
        });
        if (createError) {
          throw new Error(`Failed to create bucket: ${createError.message}`);
        }
        console.log(`✅ Created new public bucket: ${bucket}`);
      }
    } catch (error) {
      console.error(`❌ Bucket verification failed for ${bucket}:`, error);
      throw error;
    }
  }

  /**
   * Generate a unique filename
   */
  private static generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(originalName);
    return `${timestamp}-${randomString}${extension}`;
  }

  /**
   * Upload file to Supabase Storage
   */
  private static async uploadToSupabase(buffer: Buffer, originalName: string, bucket: string): Promise<string> {
    const supabaseInstance = this.supabase();
    const filename = this.generateUniqueFilename(originalName);
    // Store in a subfolder named 'avatars' within the bucket for better organization
    const filePath = `avatars/${filename}`; 

    try {
      console.log(`📤 Uploading to Supabase Storage bucket: ${bucket}, path: ${filePath}`);
      const { data, error } = await supabaseInstance.storage
        .from(bucket)
        .upload(filePath, buffer, {
          cacheControl: '31536000', // 1 year
          upsert: false, 
          contentType: path.extname(originalName).toLowerCase() === '.jpg' || path.extname(originalName).toLowerCase() === '.jpeg' ? 'image/jpeg' :
                      path.extname(originalName).toLowerCase() === '.png' ? 'image/png' :
                      path.extname(originalName).toLowerCase() === '.gif' ? 'image/gif' : 'application/octet-stream',
        });

      if (error) {
        console.error('❌ Supabase upload failed:', error);
        throw error;
      }

      console.log('✅ Supabase upload successful:', data.path);
      
      const { data: publicUrlData } = supabaseInstance.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('❌ Supabase upload process failed:', error);
      throw error; 
    }
  }

  /**
   * Delete file from Supabase Storage
   */
  public static async deleteFromSupabase(filePath: string, bucket: string): Promise<void> {
    const supabaseInstance = this.supabase();
    // The filePath should include the 'avatars/' prefix if it was stored that way
    // If oldAvatarPath is a full URL, we need to extract the path part.
    // For simplicity, we assume oldAvatarPath is the relative path within the bucket (e.g., avatars/filename.jpg)
    // or a full Supabase URL that we can parse.
    let pathToDelete: string | undefined = undefined;

    if (filePath.startsWith('http')) {
        // It's a full URL, try to extract the path
        try {
            const url = new URL(filePath);
            // Supabase public URL format: https://[project-ref].supabase.co/storage/v1/object/public/[bucket-name]/[object-path]
            const pathParts = url.pathname.split('/object/public/');
            if (pathParts.length > 1) {
                pathToDelete = pathParts[1]; // This will be [bucket-name]/[object-path]
                // We only need the [object-path] part if we are sure of the bucket, or we can use it directly.
                // For now, let's assume the filePath passed is already the relative path for simplicity.
                // If it's a full URL, this logic needs to be more robust to extract the exact object path.
                // A simpler approach for now: if it's a URL, log a warning or ensure the caller passes the relative path.
                // For this iteration, we'll assume oldAvatarPath is the relative path.
                // If it's a full URL, we might need to adjust or the caller must provide the relative path.
                console.warn(`Received a full URL for deletion: ${filePath}. Ensure this is the correct relative path or adjust deletion logic.`);
                // Attempting to get the last part of the path if it's like /avatars/filename
                const segments = url.pathname.split('/');
                if (segments.length > 0 && segments[segments.length -1]) {
                    pathToDelete = `avatars/${segments[segments.length -1]}`; // A guess, might need refinement
                }
            }
        } catch (e) {
            console.error(`Failed to parse URL for deletion: ${filePath}`, e);
        }
    } else {
        // It's a relative path
        pathToDelete = filePath.startsWith('avatars/') ? filePath : `avatars/${filePath}`;
    }

    if (!pathToDelete) {
        console.warn(`Could not determine path to delete for: ${filePath}`);
        return;
    }

    try {
      console.log(`🗑️ Deleting from Supabase Storage bucket: ${bucket}, path: ${pathToDelete}`);
      const { error } = await supabaseInstance.storage
        .from(bucket)
        .remove([pathToDelete]);

      if (error) {
        // Supabase throws an error if the file doesn't exist, which is not critical for cleanup
        // PGRST116 is specific to PostgREST, for storage errors, we rely on message content.
        if (error.message && (error.message.toLowerCase().includes('not found') || error.message.toLowerCase().includes('no rows returned'))) {
          console.warn(`File not found in Supabase Storage, nothing to delete: ${pathToDelete}`);
        } else {
          console.error('❌ Supabase delete failed:', error);
        }
      } else {
        console.log(`✅ Successfully deleted from Supabase Storage: ${pathToDelete}`);
      }
    } catch (error) {
      // Catch any other unexpected errors during deletion
      if (error instanceof Error && (error.message && error.message.toLowerCase().includes('not found'))) {
         console.warn(`File not found in Supabase Storage, nothing to delete: ${pathToDelete}`);
      } else {
        console.error(`❌ Supabase delete process failed for ${pathToDelete}:`, error);
      }
    }
  }

  /**
   * Upload avatar to Supabase Storage with fallback to local storage
   */
  public static async uploadAvatar(buffer: Buffer, originalName: string, oldAvatarPath?: string): Promise<{
    localPath: string; // Supabase public URL
    staticUrl: string; // Supabase public URL (same as localPath)
    supabasePath: string; // Internal storage path (e.g. 'avatars/filename.jpg')
  }> {
    if (!this.supabaseUrl || !this.supabaseKey) {
        console.warn('Supabase URL or Service Role Key is not defined. Falling back to local storage.');
        return this.uploadAvatarLocally(buffer, originalName, oldAvatarPath);
    }
    
    let supabaseUrl: string;
    try {
      // Ensure bucket exists before uploading
      await this.verifyBucket(this.AVATARS_BUCKET);
      supabaseUrl = await this.uploadToSupabase(buffer, originalName, this.AVATARS_BUCKET);
    } catch (error) {
      console.error('Failed to upload avatar to Supabase, falling back to local storage:', error);
      return this.uploadAvatarLocally(buffer, originalName, oldAvatarPath);
    }

    // Clean up old avatar from Supabase Storage if provided
    if (oldAvatarPath && oldAvatarPath !== '/assets/dumbbells.avif' && !oldAvatarPath.includes('dicebear.com')) {
      try {
        // We need the relative path for deletion, e.g., 'avatars/filename.jpg'
        // This requires oldAvatarUrl to be parsed or stored correctly.
        // For now, let's assume oldAvatarPath might be a full Supabase URL or the relative path.
        // This part needs careful handling based on how oldAvatarPath is stored/returned.
        // If oldAvatarPath is the full public URL, we need to extract the path part.
        // Example: https://xyz.supabase.co/storage/v1/object/public/avatars/old-file-name.jpg
        // We need to extract 'avatars/old-file-name.jpg'
        let pathToDelete: string | undefined = undefined;
        if (oldAvatarPath.startsWith(this.supabaseUrl!)) {
            // Construct the expected public URL prefix to find our path
            const storageUrlPrefix = `${this.supabaseUrl!}/storage/v1/object/public/${this.AVATARS_BUCKET}/`;
            if (oldAvatarPath.startsWith(storageUrlPrefix)) {
                pathToDelete = oldAvatarPath.substring(storageUrlPrefix.length);
            }
        } else if (oldAvatarPath.startsWith(`avatars/`)) {
             // If it's already a relative path
            pathToDelete = oldAvatarPath;
        } else if (oldAvatarPath.startsWith(`https://`)) {
            // Fallback for other URL formats if necessary, or log a warning
            console.warn(`Cannot determine relative path for deletion from URL: ${oldAvatarPath}. Manual cleanup might be needed.`);
        } else {
            // Assume it's just the filename, prefix with avatars/
            pathToDelete = `avatars/${oldAvatarPath}`;
        }
        
        if (pathToDelete) {
            await this.deleteFromSupabase(pathToDelete, this.AVATARS_BUCKET);
        } else {
            console.warn(`Could not determine path for old avatar deletion: ${oldAvatarPath}`);
        }

      } catch (error) {
        console.error('Failed to delete old avatar from Supabase:', error);
        // Decide if this should be a fatal error for the upload or just a warning
      }
    }

    // Extract the internal path from the URL
    const url = new URL(supabaseUrl);
    const pathParts = url.pathname.split('/object/public/');
    const supabasePath = pathParts.length > 1 ? pathParts[1] : `avatars/${this.generateUniqueFilename(originalName)}`;

    return {
      localPath: supabaseUrl,
      staticUrl: supabaseUrl,
      supabasePath: supabasePath
    };
  }

  /**
   * Fallback method to upload avatar locally when Supabase is not available
   */
  private static async uploadAvatarLocally(buffer: Buffer, originalName: string, oldAvatarPath?: string): Promise<{
    localPath: string;
    staticUrl: string;
    supabasePath: string;
  }> {
    const isVercel = !!process.env.VERCEL;
    const uploadBase = isVercel ? '/tmp' : path.join(process.cwd(), 'uploads');
    const avatarUploadDir = path.join(uploadBase, 'avatars');

    try {
      // Ensure upload directory exists
      await fsAsync.mkdir(avatarUploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create avatar upload directory:', error);
      throw new Error('Failed to create upload directory');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(originalName);
    const filename = `${timestamp}-${randomString}${extension}`;
    const filePath = path.join(avatarUploadDir, filename);

    try {
      // Write file to local storage
      await fsAsync.writeFile(filePath, buffer);
      console.log('✅ Local avatar upload successful:', filePath);

      // Clean up old avatar if provided
      if (oldAvatarPath && oldAvatarPath !== '/assets/dumbbells.avif' && !oldAvatarPath.includes('dicebear.com')) {
        try {
          const oldPath = path.join(avatarUploadDir, path.basename(oldAvatarPath));
          await fsAsync.unlink(oldPath);
          console.log('✅ Successfully deleted old avatar:', oldPath);
        } catch (error) {
          console.warn('Could not delete old avatar:', error);
        }
      }

      // Return local file path
      const localUrl = `/uploads/avatars/${filename}`;
      return {
        localPath: localUrl,
        staticUrl: localUrl,
        supabasePath: `local/${filename}` // Mark local uploads with 'local/' prefix
      };
    } catch (error) {
      console.error('Failed to upload avatar locally:', error);
      throw error;
    }
  }

  /**
   * Get avatar URL with fallback logic
   * Now primarily returns Supabase URLs or handles DiceBear/default
   */
  public static getAvatarUrl(member: { avatar?: string; avatarStaticUrl?: string; firstName?: string }): string {
    // If avatarStaticUrl is set (new Supabase URL), use it
    if (member.avatarStaticUrl) {
      // Ensure it's a valid URL, or handle if it's just a path
      if (member.avatarStaticUrl.startsWith('http')) {
        return member.avatarStaticUrl;
      }
      // If it's a path, construct the full Supabase URL if needed, or assume it's already correct
      // For now, assume avatarStaticUrl is the full public URL from Supabase.
    }
    
    // If 'avatar' field is a DiceBear URL or any other external URL, use it
    // Check supabaseUrl first before using it in includes
    if (member.avatar?.startsWith('http') && (member.avatar.includes('dicebear.com') || !this.supabaseUrl || !member.avatar.includes(this.supabaseUrl))) {
      return member.avatar;
    }

    // If 'avatar' field contains a path that looks like it was from our old system or a Supabase path
    if (member.avatar) {
        // If it's already a full Supabase URL (e.g. from DB before migration)
        if (this.supabaseUrl && member.avatar.startsWith(this.supabaseUrl) && member.avatar.includes('/object/public/avatars/')) {
            return member.avatar;
        }
        // If it's just a filename, construct the Supabase URL
        // This assumes old 'avatar' field might just store the filename.
        const filename = path.basename(member.avatar);
        if (filename && this.supabaseUrl) {
            // Construct the Supabase public URL
            return `${this.supabaseUrl}/storage/v1/object/public/${this.AVATARS_BUCKET}/${filename}`;
        }
        // If it's a path like 'avatars/filename.jpg'
        if (member.avatar.startsWith(`${this.AVATARS_BUCKET}/`) && this.supabaseUrl) {
             return `${this.supabaseUrl}/storage/v1/object/public/${member.avatar}`;
        }
    }
    
    // Fallback to DiceBear API based on member name
    const name = member.firstName || 'User';
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
  }
}