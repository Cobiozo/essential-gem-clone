-- Add RLS policy to allow users to see modules they have been assigned
CREATE POLICY "Users can view assigned modules"
ON training_modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM training_assignments 
    WHERE training_assignments.module_id = training_modules.id 
    AND training_assignments.user_id = auth.uid()
  )
);