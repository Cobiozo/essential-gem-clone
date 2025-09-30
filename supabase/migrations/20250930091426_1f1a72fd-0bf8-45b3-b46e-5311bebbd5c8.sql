-- Add RLS policy to allow users to view lessons of assigned modules
CREATE POLICY "Users can view lessons of assigned modules"
ON training_lessons
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM training_assignments 
    WHERE training_assignments.module_id = training_lessons.module_id
    AND training_assignments.user_id = auth.uid()
  )
);