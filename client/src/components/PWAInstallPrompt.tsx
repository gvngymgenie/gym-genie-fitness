import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Download, Smartphone, X, CheckCircle } from 'lucide-react';
import { pwaInstall, isPWAInstalled, isIOS, isAndroid, isMobile, getPWADisplayMode } from '@/lib/pwa';

const PWA_DISMISSED_KEY = 'pwa_install_dismissed';
const PWA_DISMISSED_EXPIRY_KEY = 'pwa_install_dismissed_expiry';

interface PWAInstallPromptProps {
  className?: string;
  variant?: 'floating' | 'inline' | 'banner';
  autoShow?: boolean;
  debug?: boolean;
  onInstall?: () => void;
  onDismiss?: () => void;
}

const isPwaPromptDismissed = (): boolean => {
  const dismissed = localStorage.getItem(PWA_DISMISSED_KEY);
  const expiry = localStorage.getItem(PWA_DISMISSED_EXPIRY_KEY);
  
  if (!dismissed || !expiry) {
    return false;
  }
  
  const expiryDate = new Date(expiry);
  if (expiryDate <= new Date()) {
    // Expired, clear the storage
    localStorage.removeItem(PWA_DISMISSED_KEY);
    localStorage.removeItem(PWA_DISMISSED_EXPIRY_KEY);
    return false;
  }
  
  return dismissed === 'true';
};

const setPwaPromptDismissed = (dismissed: boolean): void => {
  if (dismissed) {
    // Set expiry to 24 hours from now
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    localStorage.setItem(PWA_DISMISSED_KEY, 'true');
    localStorage.setItem(PWA_DISMISSED_EXPIRY_KEY, expiryDate.toISOString());
  } else {
    localStorage.removeItem(PWA_DISMISSED_KEY);
    localStorage.removeItem(PWA_DISMISSED_EXPIRY_KEY);
  }
};

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  className = '',
  variant = 'floating',
  autoShow = true,
  debug = false,
  onInstall,
  onDismiss,
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if prompt was dismissed
    setIsDismissed(isPwaPromptDismissed());

    // Debug information
    if (debug) {
      const debugData = {
        isInstalled: isPWAInstalled(),
        isInstallable: pwaInstall.isInstallable(),
        displayMode: getPWADisplayMode(),
        isMobile: isMobile(),
        isIOS: isIOS(),
        isAndroid: isAndroid(),
        userAgent: navigator.userAgent,
        hasServiceWorker: 'serviceWorker' in navigator,
        hasBeforeInstallPrompt: 'onbeforeinstallprompt' in window,
        isDismissed: isPwaPromptDismissed(),
      };
      setDebugInfo(debugData);
      console.log('PWA Debug Info:', debugData);
    }

    // Check if already installed
    if (isPWAInstalled()) {
      setIsInstalled(true);
      return;
    }

    // Check if installable and not dismissed
    if (pwaInstall.isInstallable() && autoShow && !isPwaPromptDismissed()) {
      setShowPrompt(true);
    }

    // Listen for install prompt availability
    const handleInstallPrompt = (event: Event) => {
      console.log('PWA: beforeinstallprompt event fired');
      if (autoShow && !isPWAInstalled() && !isPwaPromptDismissed()) {
        setShowPrompt(true);
      }
    };

    // Custom event for PWA updates
    const handleUpdate = (event: any) => {
      console.log('PWA update available:', event.detail);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('pwa-update-available', handleUpdate);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('pwa-update-available', handleUpdate);
    };
  }, [autoShow, debug]);

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallError(null);

    try {
      const success = await pwaInstall.showInstallDialog();

      if (success) {
        setIsInstalled(true);
        setShowPrompt(false);
        onInstall?.();
      } else {
        setInstallError('Installation cancelled');
      }
    } catch (error) {
      console.error('PWA install error:', error);
      setInstallError('Installation failed. Please try again.');
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setPwaPromptDismissed(true);
    setIsDismissed(true);
    onDismiss?.();
  };

  // Don't show if already installed, not installable, or dismissed
  if (isInstalled || !showPrompt || isPWAInstalled() || isDismissed) {
    return null;
  }

  const getPlatformInstructions = () => {
    if (isIOS()) {
      return {
        icon: '📱',
        instruction: 'Tap the Share button, then "Add to Home Screen"',
        browser: 'Safari'
      };
    } else if (isAndroid()) {
      return {
        icon: '🤖',
        instruction: 'Tap the menu (⋮), then "Add to Home Screen"',
        browser: 'Chrome'
      };
    } else {
      return {
        icon: '💻',
        instruction: 'Look for the install icon in your browser',
        browser: 'Your Browser'
      };
    }
  };

  const platform = getPlatformInstructions();

  if (variant === 'banner') {
    return (
      <Card className={`border-l-4 border-l-primary bg-primary/5 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Install Gym Genie</h3>
                <p className="text-sm text-muted-foreground">
                  Get the full app experience with offline access
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
                disabled={isInstalling}
                className="gap-2"
              >
                {isInstalling ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Installing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Install
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {installError && (
            <p className="text-sm text-destructive mt-2">{installError}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`p-4 border rounded-lg bg-muted/50 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <div>
              <h4 className="font-medium text-sm">Install Gym Genie App</h4>
              <p className="text-sm text-muted-foreground">Access offline and get push notifications</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleInstall}
            disabled={isInstalling}
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </Button>
        </div>
        {installError && (
          <p className="text-sm text-destructive mt-2">{installError}</p>
        )}
      </div>
    );
  }

  // Default floating variant
  return (
    <Card className={`fixed bottom-4 right-4 z-50 w-80 shadow-lg border-2 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">Install Gym Genie</h3>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          Install our app for the best experience with offline access and push notifications.
        </p>

        {isMobile() && (
          <div className="bg-muted/50 p-3 rounded-lg mb-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">{platform.icon}</span>
              <div>
                <p className="font-medium">{platform.browser} Instructions</p>
                <p className="text-muted-foreground text-xs">{platform.instruction}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1 gap-2"
          >
            {isInstalling ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Installing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Install App
              </>
            )}
          </Button>

          {!isMobile() && (
            <Badge variant="outline" className="text-xs">
              {getPWADisplayMode()}
            </Badge>
          )}
        </div>

        {installError && (
          <p className="text-sm text-destructive mt-2">{installError}</p>
        )}
      </CardContent>
    </Card>
  );
};

// Hook for PWA status
export const usePWAStatus = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [displayMode, setDisplayMode] = useState('browser');

  useEffect(() => {
    const checkStatus = () => {
      setIsInstalled(isPWAInstalled());
      setIsInstallable(pwaInstall.isInstallable());
      setDisplayMode(getPWADisplayMode());
    };

    checkStatus();

    // Listen for changes
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    isInstalled,
    isInstallable,
    displayMode,
    canInstall: isInstallable && !isInstalled,
  };
};

export default PWAInstallPrompt;
