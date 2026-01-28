import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Download, Share2, Copy, Check, ExternalLink,
  Facebook, Twitter, MessageCircle, Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface SocialShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title: string;
  resourceId: string;
  allowDownload?: boolean;
  allowShare?: boolean;
  allowCopyLink?: boolean;
}

export const SocialShareDialog: React.FC<SocialShareDialogProps> = ({
  open,
  onOpenChange,
  imageUrl,
  title,
  resourceId,
  allowDownload = true,
  allowShare = true,
  allowCopyLink = true,
}) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const downloadUrl = `https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/download-resource?id=${resourceId}`;
  const shareText = `${title} - Pure Life`;
  const encodedUrl = encodeURIComponent(imageUrl);
  const encodedText = encodeURIComponent(shareText);

  const handleDownload = () => {
    window.open(downloadUrl, '_blank');
    toast({
      title: t('dashboard.download'),
      description: title,
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      toast({
        title: t('dashboard.copied'),
        description: t('share.linkCopied'),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: t('toast.error'),
        description: t('share.copyFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: imageUrl,
        });
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled or failed:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer');
  };

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    messenger: `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=291494419107518&redirect_uri=${encodeURIComponent(window.location.href)}`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>

        {/* Image Preview */}
        <div className="relative aspect-square sm:aspect-video bg-muted rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-contain"
            loading="lazy"
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        </div>

        {/* Action Buttons - show only if any action is available */}
        {(allowDownload || allowShare) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
            {/* Download Button - conditional */}
            {allowDownload && (
              <Button onClick={handleDownload} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                {t('dashboard.download')}
              </Button>
            )}

            {/* Share Dropdown - conditional */}
            {allowShare && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-1 gap-2">
                    <Share2 className="h-4 w-4" />
                    {t('share.share')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Native Share (mobile) */}
                  {navigator.share && (
                    <>
                      <DropdownMenuItem onClick={handleNativeShare} className="gap-3">
                        <Share2 className="h-4 w-4" />
                        {t('share.shareNative')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Social Media */}
                  <DropdownMenuItem 
                    onClick={() => openShareWindow(shareLinks.facebook)}
                    className="gap-3"
                  >
                    <Facebook className="h-4 w-4 text-blue-600" />
                    Facebook
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => openShareWindow(shareLinks.twitter)}
                    className="gap-3"
                  >
                    <Twitter className="h-4 w-4 text-sky-500" />
                    Twitter / X
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => openShareWindow(shareLinks.whatsapp)}
                    className="gap-3"
                  >
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    WhatsApp
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => openShareWindow(shareLinks.telegram)}
                    className="gap-3"
                  >
                    <Send className="h-4 w-4 text-blue-400" />
                    Telegram
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => openShareWindow(shareLinks.messenger)}
                    className="gap-3"
                  >
                    <MessageCircle className="h-4 w-4 text-purple-500" />
                    Messenger
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Copy Link - conditional */}
                  {allowCopyLink && (
                    <DropdownMenuItem onClick={handleCopyLink} className="gap-3">
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copied ? t('share.copied') : t('share.copyLink')}
                    </DropdownMenuItem>
                  )}

                  {/* Instagram Info */}
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2 mb-1">
                      <ExternalLink className="h-3 w-3" />
                      Instagram
                    </p>
                    <p>{t('share.instagramInfo')}</p>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SocialShareDialog;
