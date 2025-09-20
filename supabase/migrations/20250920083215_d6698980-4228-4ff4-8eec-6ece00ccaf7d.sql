-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create trigger for updated_at on profiles table  
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for role validation
CREATE TRIGGER validate_profile_role_change
  BEFORE UPDATE ON public.profiles  
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();