import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { Heart, Lock, Clock, ArrowLeft, Loader2, CheckCircle2, Play, FileText, Image, Music, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { SecureMedia } from '@/components/SecureMedia';

interface ContentData {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  media_url: string | null;
  text_content: string | null;
  duration_seconds: number | null;
}

const ContentTypeIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
  const icons: Record<string, React.ReactNode> = {
    video: <Play className={className} />,
    audio: <Music className={className} />,
    document: <FileText className={className} />,
    image: <Image className={className} />,
    text: <Type className={className} />,
  };
  return <>{icons[type] || <FileText className={className} />}</>;
};

const LiveCountdown: React.FC<{ expiresAt: string }> = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('00:00:00');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock className="w-4 h-4" />
      <span className="font-mono">{timeLeft}</span>
    </div>
  );
};

const HealthyKnowledgePublicPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  
  const [otpValue, setOtpValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Session state
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [content, setContent] = useState<ContentData | null>(null);
  
  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (!slug) {
        setVerifying(false);
        return;
      }

      const storedToken = sessionStorage.getItem(`hk_session_${slug}`);
      if (!storedToken) {
        setVerifying(false);
        return;
      }

      try {
        const response = await supabase.functions.invoke('verify-hk-session', {
          body: { session_token: storedToken, knowledge_slug: slug },
        });

        if (response.error || !response.data?.valid) {
          sessionStorage.removeItem(`hk_session_${slug}`);
          setVerifying(false);
          return;
        }

        setSessionToken(storedToken);
        setExpiresAt(response.data.expires_at);
        setContent(response.data.content);
      } catch (err) {
        console.error('Session verification error:', err);
        sessionStorage.removeItem(`hk_session_${slug}`);
      } finally {
        setVerifying(false);
      }
    };

    checkSession();
  }, [slug]);

  const handleOtpSubmit = async () => {
    if (otpValue.length !== 6) {
      toast.error('Wprowadź pełny kod dostępu');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Format code as ZW-XXXX-XX
      const formattedCode = `ZW-${otpValue.slice(0, 4)}-${otpValue.slice(4, 6)}`.toUpperCase();

      const response = await supabase.functions.invoke('validate-hk-otp', {
        body: {
          knowledge_slug: slug,
          otp_code: formattedCode,
          device_fingerprint: navigator.userAgent,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Błąd walidacji');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Nieprawidłowy kod');
      }

      // Success! Store session and show content
      sessionStorage.setItem(`hk_session_${slug}`, response.data.session_token);
      setSessionToken(response.data.session_token);
      setExpiresAt(response.data.expires_at);
      setContent(response.data.content);

      // Celebration!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success('Dostęp przyznany!');
    } catch (err: any) {
      console.error('OTP validation error:', err);
      setError(err.message || 'Nieprawidłowy lub wygasły kod dostępu');
      toast.error(err.message || 'Nieprawidłowy kod');
    } finally {
      setLoading(false);
    }
  };

  // Render loading state
  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Weryfikacja sesji...</p>
        </div>
      </div>
    );
  }

  // Render content if session is valid
  if (sessionToken && content) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          {/* Header with timer */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold">Zdrowa Wiedza</span>
            </div>
            {expiresAt && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
                <LiveCountdown expiresAt={expiresAt} />
              </div>
            )}
          </div>

          {/* Content Card */}
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  content.content_type === 'video' && "bg-blue-500/10 text-blue-500",
                  content.content_type === 'audio' && "bg-purple-500/10 text-purple-500",
                  content.content_type === 'document' && "bg-orange-500/10 text-orange-500",
                  content.content_type === 'image' && "bg-green-500/10 text-green-500",
                  content.content_type === 'text' && "bg-gray-500/10 text-gray-500",
                )}>
                  <ContentTypeIcon type={content.content_type} className="w-5 h-5" />
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <CardTitle className="text-xl">{content.title}</CardTitle>
              {content.description && (
                <CardDescription>{content.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {/* Video/Audio */}
              {(content.content_type === 'video' || content.content_type === 'audio') && content.media_url && (
                <div className="bg-black rounded-lg">
                  <SecureMedia
                    mediaUrl={content.media_url}
                    mediaType={content.content_type}
                    disableInteraction={false}
                  />
                </div>
              )}

              {/* Image */}
              {content.content_type === 'image' && content.media_url && (
                <div className="max-w-2xl mx-auto">
                  <SecureMedia
                    mediaUrl={content.media_url}
                    mediaType="image"
                  />
                </div>
              )}

              {/* Document */}
              {content.content_type === 'document' && content.media_url && (
                <div className="text-center py-8">
                  <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Dokument do pobrania</p>
                  <SecureMedia
                    mediaUrl={content.media_url}
                    mediaType="document"
                  />
                </div>
              )}

              {/* Text content */}
              {content.content_type === 'text' && content.text_content && (
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: content.text_content }}
                />
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Ten materiał jest chroniony. Dostęp wygasa po określonym czasie.
          </p>
        </div>
      </div>
    );
  }

  // Render OTP input form
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Zdrowa Wiedza</CardTitle>
          <CardDescription>
            Wprowadź kod dostępu, aby zobaczyć materiał
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Kod w formacie: ZW-XXXX-XX</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-bold text-muted-foreground">ZW-</span>
              <InputOTP 
                value={otpValue} 
                onChange={setOtpValue} 
                maxLength={6}
                onComplete={() => handleOtpSubmit()}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>

          <Button 
            className="w-full" 
            size="lg"
            onClick={handleOtpSubmit}
            disabled={loading || otpValue.length !== 6}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Weryfikacja...
              </>
            ) : (
              'Uzyskaj dostęp'
            )}
          </Button>

          <div className="text-center">
            <Link 
              to="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Wróć na stronę główną
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthyKnowledgePublicPage;
