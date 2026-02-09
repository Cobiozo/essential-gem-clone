import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const DISMISS_KEY = 'push_notification_modal_dismissed';
const DISMISS_DURATION_DAYS = 7;

export const PushNotificationModal: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    isLoading, 
    pushConfig,
    subscribe 
  } = usePushNotifications();

  // Check if modal should be shown
  useEffect(() => {
    const checkShouldShow = () => {
      // Don't show if push not supported or not enabled
      if (!isSupported || !pushConfig?.enabled) return false;
      
      // Don't show if already subscribed
      if (isSubscribed) return false;
      
      // Don't show if permission already denied
      if (permission === 'denied') return false;
      
      // Check dismissal timestamp
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const dismissedDate = new Date(parseInt(dismissedAt, 10));
        const now = new Date();
        const daysPassed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysPassed < DISMISS_DURATION_DAYS) return false;
      }
      
      return true;
    };

    // Small delay to prevent flash on initial load
    const timer = setTimeout(() => {
      if (checkShouldShow()) {
        setShowModal(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, permission, pushConfig?.enabled]);

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      setShowModal(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Bell icon with gradient */}
        <div className="pt-8 pb-4 flex justify-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg">
            <Bell className="h-7 w-7 text-white" />
          </div>
        </div>
        
        {/* Title and description */}
        <div className="text-center px-6 pb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Włącz powiadomienia
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Otrzymuj powiadomienia o nowych wiadomościach, webinarach i ważnych wydarzeniach.
          </p>
        </div>
        
        {/* Benefits list */}
        <div className="px-6 pb-6 space-y-3">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-sky-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Natychmiastowe powiadomienia</p>
              <p className="text-xs text-muted-foreground">Bądź na bieżąco z nowymi wiadomościami</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-sky-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Przypomnienia o webinarach</p>
              <p className="text-xs text-muted-foreground">Nie przegap żadnego wydarzenia</p>
            </div>
          </div>
        </div>
        
        {/* Buttons */}
        <div className="px-6 pb-6 space-y-2">
          <Button 
            className="w-full bg-sky-500 hover:bg-sky-600" 
            onClick={handleEnable}
            disabled={isLoading}
          >
            <Bell className="h-4 w-4 mr-2" />
            {isLoading ? 'Włączanie...' : 'Włącz powiadomienia'}
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleDismiss}
          >
            Później
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PushNotificationModal;
