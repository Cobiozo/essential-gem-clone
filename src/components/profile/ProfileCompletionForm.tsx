import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, User, AlertCircle, CheckCircle, Briefcase, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProfileCompletion, ProfileCompletionStatus } from '@/hooks/useProfileCompletion';

interface ProfileCompletionFormProps {
  onProfileCompleted?: () => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export const ProfileCompletionForm: React.FC<ProfileCompletionFormProps> = ({ 
  onProfileCompleted,
  onCancel,
  isEditing = false 
}) => {
  const { user, profile, userRole } = useAuth();
  const { toast } = useToast();
  const { isComplete, missingFields, isSpecialist } = useProfileCompletion();
  
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [guardianName, setGuardianName] = useState('');
  // Address fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  // Specialist fields
  const [specialization, setSpecialization] = useState('');
  const [profileDescription, setProfileDescription] = useState('');
  const [searchKeywords, setSearchKeywords] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize form values from profile
  useEffect(() => {
    if (profile) {
      const profileAny = profile as any;
      setFirstName(profileAny.first_name || '');
      setLastName(profileAny.last_name || '');
      setEmail(profileAny.email || '');
      setPhoneNumber(profileAny.phone_number || '');
      setGuardianName(profileAny.guardian_name || '');
      // Address
      setAddress(profileAny.street_address || '');
      setCity(profileAny.city || '');
      setPostalCode(profileAny.postal_code || '');
      setCountry(profileAny.country || '');
      // Specialist
      setSpecialization(profileAny.specialization || '');
      setProfileDescription(profileAny.profile_description || '');
      setSearchKeywords(profileAny.search_keywords?.join(', ') || '');
    }
  }, [profile]);

  const validateForm = (): string | null => {
    if (!firstName.trim()) return 'Imię jest wymagane';
    if (!lastName.trim()) return 'Nazwisko jest wymagane';
    if (!email.trim()) return 'Adres e-mail jest wymagany';
    if (!phoneNumber.trim()) return 'Numer telefonu jest wymagany';
    if (!guardianName.trim()) return 'Imię i nazwisko opiekuna jest wymagane';
    
    if (isSpecialist) {
      if (!specialization.trim()) return 'Specjalizacje i dziedziny są wymagane dla roli Specjalista';
      if (!profileDescription.trim()) return 'Opis profilu jest wymagany dla roli Specjalista';
    }
    
    return null;
  };

  const handleSave = async () => {
    if (!user) return;
    
    const validationError = validateForm();
    if (validationError) {
      toast({
        title: 'Błąd walidacji',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      // Parse search keywords
      const keywordsArray = searchKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      
      const updateData: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
        guardian_name: guardianName.trim(),
        // Address fields
        street_address: address.trim() || null,
        city: city.trim() || null,
        postal_code: postalCode.trim() || null,
        country: country.trim() || null,
        // Specialist fields
        specialization: specialization.trim() || null,
        profile_description: profileDescription.trim() || null,
        search_keywords: keywordsArray.length > 0 ? keywordsArray : null,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };
      
      // For specialists, make them searchable
      if (isSpecialist) {
        updateData.is_searchable = true;
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Profil został zapisany pomyślnie',
      });
      
      onProfileCompleted?.();
      
      // Reload page to refresh profile data
      window.location.reload();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać profilu',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFieldStatus = (fieldName: string): 'valid' | 'missing' | 'optional' => {
    if (missingFields.includes(fieldName)) return 'missing';
    return 'valid';
  };

  const isProfileAlreadyCompleted = (profile as any)?.profile_completed === true;

  return (
    <div className="space-y-6">
      {/* Profile Status Banner */}
      {!isProfileAlreadyCompleted && !isComplete && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Uzupełnij dane, aby rozpocząć korzystanie z aplikacji.</strong>
            <p className="mt-1 text-sm">Wszystkie pola oznaczone * są obowiązkowe.</p>
          </AlertDescription>
        </Alert>
      )}
      
      {isComplete && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Twój profil jest kompletny.
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Dane podstawowe
          </CardTitle>
          <CardDescription>
            Uzupełnij swoje dane osobowe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center gap-2">
                Imię *
                {getFieldStatus('first_name') === 'missing' && (
                  <Badge variant="destructive" className="text-xs">Wymagane</Badge>
                )}
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Wprowadź imię"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName" className="flex items-center gap-2">
                Nazwisko *
                {getFieldStatus('last_name') === 'missing' && (
                  <Badge variant="destructive" className="text-xs">Wymagane</Badge>
                )}
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Wprowadź nazwisko"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                Adres e-mail *
                {getFieldStatus('email') === 'missing' && (
                  <Badge variant="destructive" className="text-xs">Wymagane</Badge>
                )}
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Adres e-mail nie może być zmieniony</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                Numer telefonu *
                {getFieldStatus('phone_number') === 'missing' && (
                  <Badge variant="destructive" className="text-xs">Wymagane</Badge>
                )}
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+48 123 456 789"
                disabled={loading}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="guardianName" className="flex items-center gap-2">
              Imię i nazwisko opiekuna *
              {getFieldStatus('guardian_name') === 'missing' && (
                <Badge variant="destructive" className="text-xs">Wymagane</Badge>
              )}
            </Label>
            <Input
              id="guardianName"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              placeholder="Wprowadź imię i nazwisko opiekuna"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Osoba, z którą można się skontaktować</p>
          </div>
        </CardContent>
      </Card>

      {/* Address Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Dane adresowe
          </CardTitle>
          <CardDescription>
            Opcjonalne dane adresowe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Adres (ulica i numer)</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ul. Przykładowa 123/4"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Kod pocztowy</Label>
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="00-000"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="city">Miasto</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Warszawa"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="country">Kraj</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Polska"
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specialist Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Specjalizacje i dziedziny
            {isSpecialist && <Badge variant="default">Wymagane dla Specjalisty</Badge>}
          </CardTitle>
          <CardDescription>
            {isSpecialist 
              ? 'Te dane są obowiązkowe dla Twojej roli i będą wykorzystane w wyszukiwarce specjalistów.'
              : 'Opcjonalne - możesz uzupełnić te dane, jeśli chcesz.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="specialization" className="flex items-center gap-2">
              Specjalizacje i dziedziny {isSpecialist && '*'}
              {isSpecialist && getFieldStatus('specialization') === 'missing' && (
                <Badge variant="destructive" className="text-xs">Wymagane</Badge>
              )}
            </Label>
            <Textarea
              id="specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="Np. Dietetyka, Naturoterapia, Coaching zdrowia..."
              disabled={loading}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Wprowadź wszystkie swoje specjalizacje</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profileDescription" className="flex items-center gap-2">
              Opis profilu {isSpecialist && '*'}
              {isSpecialist && getFieldStatus('profile_description') === 'missing' && (
                <Badge variant="destructive" className="text-xs">Wymagane</Badge>
              )}
            </Label>
            <Textarea
              id="profileDescription"
              value={profileDescription}
              onChange={(e) => setProfileDescription(e.target.value)}
              placeholder="Opisz swoje doświadczenie, podejście do pracy, obszary specjalizacji..."
              disabled={loading}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="searchKeywords">Słowa kluczowe (opcjonalne)</Label>
            <Input
              id="searchKeywords"
              value={searchKeywords}
              onChange={(e) => setSearchKeywords(e.target.value)}
              placeholder="odchudzanie, zdrowe żywienie, sport, wellness..."
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Rozdziel słowa kluczowe przecinkami - ułatwią znalezienie Cię w wyszukiwarce</p>
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        {isEditing && onCancel && (
          <Button 
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            size="lg"
          >
            Anuluj
          </Button>
        )}
        <Button 
          onClick={handleSave} 
          disabled={loading}
          size="lg"
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Zapisywanie...' : 'Zapisz profil'}
        </Button>
      </div>
    </div>
  );
};
