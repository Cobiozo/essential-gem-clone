import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Lock, Clock, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FormattedText } from '@/components/FormattedText';
import confetti from 'canvas-confetti';
import pureLifeLogo from '@/assets/pure-life-logo-new.png';

const SESSION_STORAGE_KEY = 'infolink_session_';

interface SessionData {
  session_token: string;
  expires_at: string;
}

export default function InfoLinkPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [reflink, setReflink] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // OTP form state
  const [otpValue, setOtpValue] = useState('');
  const [validating, setValidating] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Session state
  const [hasAccess, setHasAccess] = useState(false);
  const [protectedContent, setProtectedContent] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Confirmation & transition states
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showLogoTransition, setShowLogoTransition] = useState(false);

  // Trigger confetti animation
  const triggerConfetti = useCallback(() => {
    // First burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b'],
    });

    // Second burst from sides
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
    }, 200);
  }, []);

  // Handle "WCHODZĘ" click - show logo transition then redirect
  const handleEnter = useCallback(() => {
    setShowConfirmation(false);
    setShowLogoTransition(true);

    setTimeout(() => {
      if (!reflink?.infolink_url) {
        // Fallback: if no URL, just hide transition and show protected_content
        setShowLogoTransition(false);
        return;
      }

      if (reflink.infolink_url_type === 'external') {
        // External link - redirect in same tab
        window.location.href = reflink.infolink_url;
      } else {
        // Internal link - use react-router
        navigate(reflink.infolink_url);
      }
    }, 1500);
  }, [reflink, navigate]);

  // Load reflink data
  useEffect(() => {
    const loadReflink = async () => {
      if (!slug) {
        setError('Brak identyfikatora linku');
        setLoading(false);
        return;
      }

      try {
        // Try by slug first, then by ID - include infolink_url fields
        let { data, error: fetchError } = await supabase
          .from('reflinks')
          .select('id, title, description, welcome_message, requires_otp, slug, is_active, infolink_url, infolink_url_type')
          .eq('slug', slug)
          .single();

        if (fetchError || !data) {
          // Try by ID
          const { data: byId, error: idError } = await supabase
            .from('reflinks')
            .select('id, title, description, welcome_message, requires_otp, slug, is_active, infolink_url, infolink_url_type')
            .eq('id', slug)
            .single();

          if (idError || !byId) {
            setError('Nie znaleziono tego linku informacyjnego');
            setLoading(false);
            return;
          }
          data = byId;
        }

        if (!data.is_active) {
          setError('Ten link jest obecnie nieaktywny');
          setLoading(false);
          return;
        }

        setReflink(data);

        // Check for existing session
        if (data.requires_otp) {
          await checkExistingSession(data.slug || data.id);
        } else {
          // If no OTP required, show content directly (fetch protected_content)
          const { data: fullData } = await supabase
            .from('reflinks')
            .select('protected_content')
            .eq('id', data.id)
            .single();
          
          if (fullData?.protected_content) {
            setProtectedContent(fullData.protected_content);
            setHasAccess(true);
          }
        }
      } catch (err) {
        console.error('Error loading reflink:', err);
        setError('Wystąpił błąd podczas ładowania');
      } finally {
        setLoading(false);
      }
    };

    loadReflink();
  }, [slug]);

  // Check for existing valid session
  const checkExistingSession = async (reflinkSlug: string) => {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY + reflinkSlug);
    if (!storedSession) return;

    try {
      const sessionData: SessionData = JSON.parse(storedSession);
      
      // Verify session with server
      const { data, error } = await supabase.functions.invoke('verify-infolink-session', {
        body: {
          session_token: sessionData.session_token,
          reflink_slug: reflinkSlug,
        },
      });

      if (error || !data?.valid) {
        // Session expired or invalid
        localStorage.removeItem(SESSION_STORAGE_KEY + reflinkSlug);
        return;
      }

      // Valid session - go directly to content (no confirmation screen for existing sessions)
      setHasAccess(true);
      setProtectedContent(data.protected_content);
      setExpiresAt(new Date(data.expires_at));
      setRemainingSeconds(data.remaining_seconds);
    } catch (err) {
      console.error('Session verification error:', err);
      localStorage.removeItem(SESSION_STORAGE_KEY + reflinkSlug);
    }
  };

  // Handle OTP submission
  const handleOTPSubmit = async () => {
    if (otpValue.length < 8) {
      setOtpError('Wprowadź pełny kod dostępu');
      return;
    }

    setValidating(true);
    setOtpError(null);

    try {
      // Format OTP: add dashes if not present
      let formattedCode = otpValue.toUpperCase();
      if (!formattedCode.includes('-')) {
        formattedCode = `${formattedCode.slice(0, 2)}-${formattedCode.slice(2, 6)}-${formattedCode.slice(6, 8)}`;
      }

      const { data, error } = await supabase.functions.invoke('validate-infolink-otp', {
        body: {
          reflink_slug: reflink.slug || reflink.id,
          otp_code: formattedCode,
          device_fingerprint: navigator.userAgent,
        },
      });

      if (error) {
        console.error('OTP validation error:', error);
        setOtpError('Błąd weryfikacji kodu');
        return;
      }

      if (!data?.success) {
        setOtpError(data?.error || 'Nieprawidłowy kod dostępu');
        return;
      }

      // Store session
      const sessionData: SessionData = {
        session_token: data.session_token,
        expires_at: data.expires_at,
      };
      localStorage.setItem(SESSION_STORAGE_KEY + (reflink.slug || reflink.id), JSON.stringify(sessionData));

      // Update state
      setHasAccess(true);
      setProtectedContent(data.protected_content);
      setExpiresAt(new Date(data.expires_at));
      setRemainingSeconds(data.remaining_seconds);

      // Show confirmation screen with confetti
      setShowConfirmation(true);
      triggerConfetti();

      toast({
        title: 'Dostęp przyznany',
        description: 'Możesz teraz przejść do treści',
      });
    } catch (err) {
      console.error('OTP submission error:', err);
      setOtpError('Wystąpił błąd podczas weryfikacji');
    } finally {
      setValidating(false);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!hasAccess || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Session expired
          clearInterval(interval);
          setHasAccess(false);
          setProtectedContent(null);
          setShowConfirmation(false);
          localStorage.removeItem(SESSION_STORAGE_KEY + (reflink?.slug || reflink?.id));
          toast({
            title: 'Sesja wygasła',
            description: 'Poproś o nowy kod dostępu',
            variant: 'destructive',
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasAccess, reflink, toast]);

  // Format remaining time
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }, []);

  // Logo transition overlay
  if (showLogoTransition) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center space-y-6">
          <img 
            src={pureLifeLogo}
            alt="Pure Life"
            className="h-32 w-auto mx-auto animate-logo-reveal"
          />
          <p className="text-lg text-muted-foreground animate-banner-fade-in-enhanced">
            Przekierowuję...
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Błąd</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Session expiry banner - shown when accessing content directly */}
        {hasAccess && expiresAt && !showConfirmation && (
          <Alert className={remainingSeconds < 300 ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : 'border-primary bg-primary/5'}>
            <Clock className={`h-4 w-4 ${remainingSeconds < 300 ? 'text-orange-500' : 'text-primary'}`} />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Dostęp ważny do: {expiresAt.toLocaleDateString('pl-PL')} {expiresAt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className={`font-mono font-semibold ${remainingSeconds < 300 ? 'text-orange-600' : 'text-primary'}`}>
                {formatTime(remainingSeconds)}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Main card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center border-b">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              {showConfirmation ? (
                <CheckCircle className="h-8 w-8 text-green-500 animate-logo-pulse" />
              ) : hasAccess ? (
                <CheckCircle className="h-8 w-8 text-primary" />
              ) : (
                <Shield className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {showConfirmation ? 'Kod poprawny!' : (reflink?.title || 'Informacje')}
            </CardTitle>
            {!showConfirmation && reflink?.description && (
              <CardDescription>{reflink.description}</CardDescription>
            )}
            {showConfirmation && (
              <CardDescription className="text-green-600 font-medium">
                Dostęp został przyznany
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="pt-6">
            {/* Confirmation screen after OTP verification */}
            {showConfirmation && (
              <div className="space-y-6 animate-banner-scale-in-enhanced">
                {/* Welcome message */}
                {reflink?.welcome_message && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <FormattedText text={reflink.welcome_message} />
                  </div>
                )}

                {/* Timer info */}
                <div className="text-center text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Ważność dostępu: {formatTime(remainingSeconds)}
                </div>

                {/* WCHODZĘ button */}
                <div className="text-center">
                  <Button 
                    size="lg" 
                    className="px-12 py-6 text-xl font-bold"
                    onClick={handleEnter}
                  >
                    WCHODZĘ
                  </Button>
                </div>
              </div>
            )}

            {/* Welcome message - shown before OTP verification */}
            {reflink?.welcome_message && !hasAccess && (
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <FormattedText text={reflink.welcome_message} />
              </div>
            )}

            {/* OTP form - shown when no access */}
            {reflink?.requires_otp && !hasAccess && (
              <div className="space-y-6">
                <div className="text-center">
                  <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Wprowadź kod dostępu</h3>
                  <p className="text-sm text-muted-foreground">
                    Aby uzyskać dostęp do treści, wpisz kod otrzymany od partnera
                  </p>
                </div>

                <div className="flex flex-col items-center space-y-4">
                  <InputOTP
                    maxLength={8}
                    value={otpValue}
                    onChange={(value) => {
                      setOtpValue(value);
                      setOtpError(null);
                    }}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={6} />
                      <InputOTPSlot index={7} />
                    </InputOTPGroup>
                  </InputOTP>

                  {otpError && (
                    <p className="text-sm text-destructive">{otpError}</p>
                  )}

                  <Button
                    onClick={handleOTPSubmit}
                    disabled={validating || otpValue.length < 8}
                    className="w-full max-w-xs"
                  >
                    {validating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Weryfikacja...
                      </>
                    ) : (
                      'Uzyskaj dostęp'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Protected content - shown when has access and NOT in confirmation mode */}
            {hasAccess && protectedContent && !showConfirmation && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <FormattedText text={protectedContent} as="div" />
              </div>
            )}

            {/* No content message - only when no URL and no content */}
            {hasAccess && !protectedContent && !showConfirmation && !reflink?.infolink_url && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Brak dodatkowej treści do wyświetlenia</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-muted-foreground">
          Treść chroniona kodem dostępu • Pure Life
        </p>
      </div>
    </div>
  );
}
