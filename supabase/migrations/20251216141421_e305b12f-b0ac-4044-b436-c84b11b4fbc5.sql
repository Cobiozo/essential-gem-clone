
-- Create enum for resource types
CREATE TYPE public.resource_type AS ENUM ('pdf', 'doc', 'zip', 'form', 'link', 'page');

-- Create enum for resource status
CREATE TYPE public.resource_status AS ENUM ('active', 'draft', 'archived');

-- Create table for knowledge resources
CREATE TABLE public.knowledge_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  context_of_use TEXT,
  resource_type resource_type NOT NULL DEFAULT 'pdf',
  source_type TEXT NOT NULL DEFAULT 'file' CHECK (source_type IN ('file', 'link')),
  source_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  visible_to_clients BOOLEAN NOT NULL DEFAULT false,
  visible_to_partners BOOLEAN NOT NULL DEFAULT false,
  visible_to_specjalista BOOLEAN NOT NULL DEFAULT false,
  visible_to_everyone BOOLEAN NOT NULL DEFAULT false,
  status resource_status NOT NULL DEFAULT 'draft',
  version TEXT DEFAULT '1.0',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  is_updated BOOLEAN NOT NULL DEFAULT false,
  download_count INTEGER NOT NULL DEFAULT 0,
  work_stage TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_resources ENABLE ROW LEVEL SECURITY;

-- Admin can manage all resources
CREATE POLICY "Admins can manage knowledge resources"
ON public.knowledge_resources
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Users can view active resources based on role
CREATE POLICY "Users can view resources based on role"
ON public.knowledge_resources
FOR SELECT
USING (
  status = 'active' AND (
    visible_to_everyone = true OR
    (visible_to_clients = true AND get_current_user_role() IN ('client', 'user')) OR
    (visible_to_partners = true AND get_current_user_role() = 'partner') OR
    (visible_to_specjalista = true AND get_current_user_role() = 'specjalista')
  )
);

-- Create index for faster queries
CREATE INDEX idx_knowledge_resources_category ON public.knowledge_resources(category);
CREATE INDEX idx_knowledge_resources_status ON public.knowledge_resources(status);
CREATE INDEX idx_knowledge_resources_tags ON public.knowledge_resources USING GIN(tags);

-- Create trigger for updated_at
CREATE TRIGGER update_knowledge_resources_updated_at
BEFORE UPDATE ON public.knowledge_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for knowledge resources
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-resources', 'knowledge-resources', true);

-- Storage policies
CREATE POLICY "Anyone can view knowledge resources files"
ON storage.objects FOR SELECT
USING (bucket_id = 'knowledge-resources');

CREATE POLICY "Admins can upload knowledge resources files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'knowledge-resources' AND is_admin());

CREATE POLICY "Admins can update knowledge resources files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'knowledge-resources' AND is_admin());

CREATE POLICY "Admins can delete knowledge resources files"
ON storage.objects FOR DELETE
USING (bucket_id = 'knowledge-resources' AND is_admin());
