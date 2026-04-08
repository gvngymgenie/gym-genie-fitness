/**
 * Image Service for handling avatar URLs.
 * Supports Supabase Storage, local uploads, and DiceBear fallbacks.
 */

import axios from 'axios';

// Supabase project URL for constructing URLs
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://oqadltfzjckgmjmjhsqk.supabase.co';
const AVATARS_BUCKET = 'avatars';

class ImageService {
  private imageCache = new Map<string, string>();
  private pendingRequests = new Map<string, Promise<string>>();

  /**
   * Get a URL for an avatar.
   * Supports: Supabase URLs, local paths, DiceBear, and defaults.
   */
  getAvatarUrl(avatarUrl: string | undefined | null, memberName?: string): string {
    if (!avatarUrl) {
      // Generate initials avatar if member name is provided
      if (memberName) {
        return this.getDiceBearUrl(memberName);
      }
      return '/assets/dumbbells.avif'; // Default avatar
    }

    // If it's already a full URL (Supabase, DiceBear, or other external), return it directly
    if (avatarUrl.startsWith('http')) {
      return avatarUrl;
    }

    // If it's a local path (e.g., /uploads/avatars/filename.jpg), check if it needs Supabase URL
    if (avatarUrl.startsWith('/uploads/') || avatarUrl.startsWith('uploads/')) {
      // This is a local upload path - try to construct Supabase URL
      const filename = avatarUrl.split('/').pop();
      if (filename) {
        // Check if this file might be in Supabase
        // We'll return the local path, but log a warning
        console.warn(`Local avatar path detected: ${avatarUrl}. Consider migrating to Supabase.`);
        return avatarUrl;
      }
    }

    // If it's a path starting with /assets, return it directly
    if (avatarUrl.startsWith('/assets/')) {
      return avatarUrl;
    }

    // If it's some other relative path, try to construct Supabase URL
    if (avatarUrl.includes('avatars/') || avatarUrl.endsWith('.jpg') || avatarUrl.endsWith('.jpeg') || avatarUrl.endsWith('.png')) {
      const filename = avatarUrl.split('/').pop() || avatarUrl;
      // Construct Supabase URL
      return `${SUPABASE_URL}/storage/v1/object/public/${AVATARS_BUCKET}/${filename}`;
    }

    // Fallback to DiceBear or default
    console.warn(`Unknown avatar URL format: ${avatarUrl}`);
    if (memberName) {
      return this.getDiceBearUrl(memberName);
    }
    
    return '/assets/dumbbells.avif';
  }

  /**
   * Get DiceBear initials avatar URL
   */
  getDiceBearUrl(memberName: string): string {
    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memberName)}`;
  }

  /**
   * Check if a URL is a valid Supabase URL
   */
  isSupabaseUrl(url: string): boolean {
    return url.includes('/storage/v1/object/public/');
  }

  /**
   * Check if URL needs migration to Supabase
   */
  needsMigration(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.startsWith('/uploads/') || url.startsWith('uploads/');
  }

  /**
   * Get a blob URL for an avatar.
   * Only used for external URLs that need to be fetched.
   * For static files, returns the direct URL.
   * Falls back to DiceBear for initials or a default asset if the URL is invalid.
   */
  async getAvatarBlobUrl(avatarUrl: string | undefined | null, memberName?: string): Promise<string> {
    if (!avatarUrl) {
      // Generate initials avatar if member name is provided
      if (memberName) {
        return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memberName)}`;
      }
      return '/assets/dumbbells.avif'; // Default avatar
    }

    // If it's a local path (e.g. default assets or uploads), return it directly
    if (avatarUrl.startsWith('/')) {
      return avatarUrl;
    }

    // If it's already a full URL (Supabase, DiceBear, or other external), fetch and convert to blob URL
    if (avatarUrl.startsWith('http')) {
      // Check cache first
      if (this.imageCache.has(avatarUrl)) {
        console.log('Returning cached blob URL for:', avatarUrl);
        return this.imageCache.get(avatarUrl)!;
      }

      // Check if request is already pending
      if (this.pendingRequests.has(avatarUrl)) {
        console.log('Returning pending request for:', avatarUrl);
        return this.pendingRequests.get(avatarUrl)!;
      }

      // Create new request promise
      const requestPromise = this.fetchImageAsBlobUrl(avatarUrl, memberName);
      this.pendingRequests.set(avatarUrl, requestPromise);

      try {
        const blobUrl = await requestPromise;
        this.pendingRequests.delete(avatarUrl);
        return blobUrl;
      } catch (error) {
        this.pendingRequests.delete(avatarUrl);
        throw error;
      }
    }

    // If it's some other relative path, assume it might need to be resolved or is an error.
    // For now, log a warning and fallback to default or DiceBear if name provided.
    console.warn(`Unknown avatar URL format: ${avatarUrl}`);
    if (memberName) {
      return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memberName)}`;
    }
    
    return '/assets/dumbbells.avif';
  }

  /**
   * Fetch image and convert to blob URL with caching
   */
  private async fetchImageAsBlobUrl(avatarUrl: string, memberName?: string): Promise<string> {
    try {
      console.log('Fetching image from URL:', avatarUrl);
      
      // Construct full URL if it's a relative path
      const fullUrl = avatarUrl.startsWith('/') ? `${window.location.origin}${avatarUrl}` : avatarUrl;
      
      // Use axios for better request handling
      const response = await axios.get(fullUrl, {
        responseType: 'blob',
        timeout: 10000,
        headers: {
          'Cache-Control': 'max-age=3600' // Cache for 1 hour
        }
      });

      console.log('Fetch response status:', response.status);
      
      if (response.status !== 200) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = response.data;
      console.log('Successfully created blob, size:', blob.size);
      const blobUrl = URL.createObjectURL(blob);
      console.log('Created blob URL:', blobUrl);
      
      // Cache the blob URL
      this.imageCache.set(avatarUrl, blobUrl);
      
      // Set up cleanup for the blob URL after 5 minutes
      setTimeout(() => {
        if (this.imageCache.get(avatarUrl) === blobUrl) {
          URL.revokeObjectURL(blobUrl);
          this.imageCache.delete(avatarUrl);
          console.log('Cleaned up cached blob URL for:', avatarUrl);
        }
      }, 5 * 60 * 1000);

      return blobUrl;
    } catch (error) {
      console.error(`Failed to fetch avatar from ${avatarUrl}:`, error);
      // Fallback to DiceBear if member name is provided
      if (memberName) {
        console.log('Falling back to DiceBear for member:', memberName);
        return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(memberName)}`;
      }
      console.log('Falling back to default avatar');
      return '/assets/dumbbells.avif';
    }
  }

  /**
   * Clear all cached blob URLs and revoke object URLs
   */
  clearCache(): void {
    Array.from(this.imageCache.entries()).forEach(([url, blobUrl]) => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        console.warn('Failed to revoke blob URL:', blobUrl, e);
      }
    });
    this.imageCache.clear();
    this.pendingRequests.clear();
    console.log('Cleared all cached avatar blob URLs');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cachedUrls: number; pendingRequests: number } {
    return {
      cachedUrls: this.imageCache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}

// Export singleton instance
export const imageService = new ImageService();

// Export for cleanup on app unmount if needed
export default imageService;