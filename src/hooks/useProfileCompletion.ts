import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export interface ProfileCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
  isSpecialist: boolean;
  requiresSpecialistData: boolean;
}

export const useProfileCompletion = (): ProfileCompletionStatus => {
  const { profile, userRole } = useAuth();
  
  return useMemo(() => {
    if (!profile) {
      return {
        isComplete: false,
        missingFields: ['profile'],
        isSpecialist: false,
        requiresSpecialistData: false,
      };
    }
    
    const missingFields: string[] = [];
    const isSpecialist = userRole?.role === 'specjalista';
    
    // Check mandatory fields for everyone
    if (!profile.first_name?.trim()) missingFields.push('first_name');
    if (!profile.last_name?.trim()) missingFields.push('last_name');
    if (!profile.email?.trim()) missingFields.push('email');
    if (!profile.phone_number?.trim()) missingFields.push('phone_number');
    
    // Guardian name is stored in the profile now
    const profileAny = profile as any;
    if (!profileAny.guardian_name?.trim()) missingFields.push('guardian_name');
    
    // For specialists, check specialization is mandatory
    if (isSpecialist) {
      if (!profileAny.specialization?.trim()) missingFields.push('specialization');
      if (!profileAny.profile_description?.trim()) missingFields.push('profile_description');
    }
    
    return {
      isComplete: missingFields.length === 0,
      missingFields,
      isSpecialist,
      requiresSpecialistData: isSpecialist,
    };
  }, [profile, userRole]);
};
