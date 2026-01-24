-- Polityka pozwalająca adminom wstawiać postęp dla dowolnego użytkownika
CREATE POLICY "Admins can insert training progress"
  ON training_progress
  FOR INSERT
  TO public
  WITH CHECK (is_admin());

-- Polityka pozwalająca adminom aktualizować postęp dowolnego użytkownika  
CREATE POLICY "Admins can update training progress"
  ON training_progress
  FOR UPDATE
  TO public
  USING (is_admin())
  WITH CHECK (is_admin());

-- Polityka pozwalająca adminom usuwać postęp (dla resetowania)
CREATE POLICY "Admins can delete training progress"
  ON training_progress
  FOR DELETE
  TO public
  USING (is_admin());