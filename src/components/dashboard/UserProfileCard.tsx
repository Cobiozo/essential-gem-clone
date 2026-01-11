import React, { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSidebar } from '@/components/ui/sidebar';

export const UserProfileCard: React.FC = () => {
  const { profile, userRole, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const firstName = profile?.first_name || '';
  const lastName = profile?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || profile?.email || '';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
  const role = userRole?.role || 'client';
  const rank = (profile as any)?.rank || null;
  const avatarUrl = (profile as any)?.avatar_url || null;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'specjalista': return 'default';
      case 'partner': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return t('role.administrator');
      case 'partner': return t('role.partner');
      case 'specjalista': return t('role.specialist');
      default: return t('role.client');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.user_id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: t('toast.error'), description: t('error.invalidImageType'), variant: 'destructive' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t('toast.error'), description: t('error.fileTooLarge'), variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.user_id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('cms-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from('cms-images').getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', profile.user_id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: t('toast.success'), description: t('myAccount.avatarUpdated') });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({ title: t('toast.error'), description: t('error.uploadFailed'), variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (isCollapsed) {
    return (
      <div className="flex justify-center py-2">
        <Avatar className="h-10 w-10 border-2 border-primary/20">
          <AvatarImage src={avatarUrl} alt={fullName} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-sidebar-border">
      <div className="flex items-center gap-3">
        {/* Avatar with upload button */}
        <div className="relative group">
          <Avatar className="h-16 w-16 border-2 border-primary/20 transition-transform group-hover:scale-105">
            <AvatarImage src={avatarUrl} alt={fullName} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="secondary"
            size="icon"
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
            onClick={handleAvatarClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Camera className="h-3 w-3" />
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-sidebar-foreground truncate">
            {fullName}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={getRoleBadgeVariant(role)} className="text-xs">
              {getRoleDisplayName(role)}
            </Badge>
            {rank && (
              <Badge variant="outline" className="text-xs bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400">
                {rank}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
