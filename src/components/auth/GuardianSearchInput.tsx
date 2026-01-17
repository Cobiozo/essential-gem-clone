import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export interface Guardian {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  eq_id: string | null;
  email: string;
}

interface GuardianSearchInputProps {
  value: Guardian | null;
  onChange: (guardian: Guardian | null) => void;
  disabled?: boolean;
  error?: string;
}

export const GuardianSearchInput: React.FC<GuardianSearchInputProps> = ({
  value,
  onChange,
  disabled = false,
  error,
}) => {
  const { t } = useLanguage();
  const [eqidInput, setEqidInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!eqidInput.trim()) return;
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      const { data, error: searchError } = await supabase
        .rpc('search_guardians', { search_query: eqidInput.trim() });
      
      if (searchError || !data || data.length === 0) {
        setVerificationError(t('guardian.notFound'));
        return;
      }
      
      // Szukaj dokładnego dopasowania EQID
      const exactMatch = data.find((g: Guardian) => g.eq_id === eqidInput.trim());
      
      if (!exactMatch) {
        setVerificationError(t('guardian.notFound'));
        return;
      }
      
      // Sukces - ustaw opiekuna
      onChange(exactMatch);
      setEqidInput('');
      setVerificationError(null);
    } catch (err) {
      console.error('Verification error:', err);
      setVerificationError(t('guardian.searchError'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setEqidInput('');
    setVerificationError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerify();
    }
  };

  const formatGuardianName = (guardian: Guardian) => {
    const name = [guardian.first_name, guardian.last_name].filter(Boolean).join(' ');
    return name || guardian.email;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="guardian-eqid" className="flex flex-col gap-1">
        <span>Opiekun (osoba wprowadzająca Partner/Specjalista Zespołu Pure Life) *</span>
        <span className="font-normal text-xs text-muted-foreground">
          {t('guardian.searchByEqid')}. Jeżeli nie znasz numeru EQID, skontaktuj się z opiekunem lub administratorem.
        </span>
      </Label>
      
      {value ? (
        // Selected guardian display
        <div className="flex items-center gap-2 p-3 bg-muted/50 border border-border rounded-md">
          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-foreground truncate">
              {formatGuardianName(value)}
            </div>
            <div className="text-xs text-muted-foreground">
              EQID: {value.eq_id}
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded-sm"
              aria-label={t('guardian.change')}
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      ) : (
        // EQID input with verify button
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              id="guardian-eqid"
              type="text"
              value={eqidInput}
              onChange={(e) => {
                setEqidInput(e.target.value);
                setVerificationError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Wpisz numer EQID opiekuna..."
              disabled={disabled}
              className={cn(
                verificationError && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <Button 
              type="button"
              onClick={handleVerify}
              disabled={disabled || isVerifying || !eqidInput.trim()}
              variant="secondary"
            >
              {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : t('guardian.verify')}
            </Button>
          </div>

          {/* Error message */}
          {verificationError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{verificationError}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

export default GuardianSearchInput;
