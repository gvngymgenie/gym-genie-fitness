import { useState, useEffect, useMemo, useCallback } from 'react';
import { imageService } from '@/lib/imageService';
import { cn } from '@/lib/utils';

interface ProfilePictureProps {
  src?: string;
  alt?: string;
  fallback?: string;
  memberName?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function ProfilePicture({ 
  src, 
  alt, 
  fallback, 
  memberName,
  className, 
  size = 'md' 
}: ProfilePictureProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Get the direct URL from image service (no blob conversion needed)
  const imageUrl = useMemo(() => {
    return imageService.getAvatarUrl(src, memberName);
  }, [src, memberName]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Image failed to load:', e.currentTarget.src);
    setError(true);
    setIsLoading(false);
  }, []);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setError(false);
  }, []);

  const getFallbackText = useMemo(() => {
    // Use provided fallback first
    if (fallback) return fallback;
    
    // Use member name for initials if available
    if (memberName) {
      const nameParts = memberName.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      } else if (nameParts.length === 1) {
        return nameParts[0].substring(0, 2).toUpperCase();
      }
    }
    
    // Fallback to filename initials if src is a path
    if (src && !src.startsWith('http')) { // if it's a relative path, try to get initials
      const filename = src.split('/').pop() || '';
      const name = filename.split('.')[0];
      const parts = name.split('-');
      
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      if (name.length > 0) {
        return name.substring(0, 2).toUpperCase();
      }
    }
    
    // Final fallback
    return 'U';
  }, [fallback, memberName, src]);

  const sizeClasses = useMemo(() => ({
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-20 w-20 text-xl'
  }), []);

  // Log cache stats for debugging
  useEffect(() => {
    const stats = imageService.getCacheStats();
    console.log('Image cache stats:', stats);
  }, [src]);

  return (
    <div className={cn("relative flex shrink-0 overflow-hidden rounded-xl", sizeClasses[size], className)}>
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={alt || 'Profile picture'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300",
            isLoading || error ? "opacity-0 absolute" : "opacity-100"
          )}
        />
      )}
      
      {(isLoading || error || !imageUrl) && (
        <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-600">
          {isLoading ? (
            <div className="animate-pulse bg-gray-300 w-full h-full" />
          ) : (
            getFallbackText
          )}
        </div>
      )}
    </div>
  );
}