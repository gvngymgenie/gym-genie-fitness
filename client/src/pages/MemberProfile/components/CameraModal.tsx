import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CameraModalProps } from "../types";

export function CameraModal({ 
  open, 
  onOpenChange,
  onCapture 
}: CameraModalProps) {
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      setCameraStream(stream);
    } catch (error: any) {
      console.error('Camera error:', error);
      setCameraError(error.message || 'Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraError(null);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      stopCamera();
    }
    onOpenChange(isOpen);
  };

  const capturePhoto = () => {
    if (!cameraStream || !videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) return;

    context.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
        stopCamera();
        onOpenChange(false);
      }
    }, 'image/jpeg', 0.9);
  };

  useEffect(() => {
    if (open && !cameraStream && !cameraError) {
      startCamera();
    }
  }, [open]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-heading text-primary flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Take Profile Photo
          </DialogTitle>
          </DialogHeader>
        <div className="space-y-4">
          {cameraError ? (
            <div className="text-center py-8">
              <X className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive text-sm">{cameraError}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={capturePhoto}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                >
                  <Camera className="h-4 w-4" />
                  Capture Photo
                </Button>
                <Button
                  onClick={() => {
                    stopCamera();
                    onOpenChange(false);
                  }}
                  variant="outline"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
