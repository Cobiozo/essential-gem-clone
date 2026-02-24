import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log("[ResetPassword] Auth event:", event);
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoverySession(true);
      }
      setSessionChecked(true);
    });

    // Also check if we already have a session (user clicked link and was auto-logged in)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsRecoverySession(true);
      }
      setSessionChecked(true);
    };
    
    checkSession();

    return () => subscription.unsubscribe();
  }, []);

  const passwordValid = newPassword.length >= 8 
    && /[A-Z]/.test(newPassword) 
    && /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordValid) {
      toast({
        title: "Błąd",
        description: "Hasło musi mieć min. 8 znaków, wielką literę i cyfrę",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Błąd",
        description: "Hasła nie są identyczne",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) throw error;

      // Sign out and redirect to login
      await supabase.auth.signOut();
      
      toast({
        title: "Hasło zmienione",
        description: "Twoje hasło zostało pomyślnie zmienione. Zaloguj się nowym hasłem.",
      });
      
      navigate("/auth", { replace: true });
    } catch (error: any) {
      console.error("[ResetPassword] Error:", error);
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zmienić hasła",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isRecoverySession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Nieprawidłowy link</h1>
          <p className="text-muted-foreground">
            Link do resetowania hasła jest nieprawidłowy lub wygasł. Spróbuj ponownie poprosić o reset hasła.
          </p>
          <Button onClick={() => navigate("/auth")} className="mt-4">
            Przejdź do logowania
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg border border-border shadow-lg p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Ustaw nowe hasło</h1>
            <p className="text-sm text-muted-foreground">
              Wprowadź nowe hasło do swojego konta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nowe hasło</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 znaków, wielka litera, cyfra"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="space-y-1 text-xs">
                  <div className={`flex items-center gap-1 ${newPassword.length >= 8 ? 'text-green-600' : 'text-destructive'}`}>
                    {newPassword.length >= 8 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    Min. 8 znaków
                  </div>
                  <div className={`flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-destructive'}`}>
                    {/[A-Z]/.test(newPassword) ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    Wielka litera
                  </div>
                  <div className={`flex items-center gap-1 ${/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-destructive'}`}>
                    {/[0-9]/.test(newPassword) ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    Cyfra
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Powtórz nowe hasło</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Powtórz nowe hasło"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <div className={`text-xs flex items-center gap-1 ${passwordsMatch ? 'text-green-600' : 'text-destructive'}`}>
                  {passwordsMatch ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {passwordsMatch ? 'Hasła są zgodne' : 'Hasła nie są zgodne'}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !passwordValid || !passwordsMatch}
            >
              {loading ? "Zapisywanie..." : "Ustaw nowe hasło"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
