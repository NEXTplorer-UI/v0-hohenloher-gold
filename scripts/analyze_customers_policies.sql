SELECT 
  schemaname, 
  tablename, 
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_clause,
  with_check
FROM pg_policies 
WHERE tablename = 'customers'
ORDER BY policyname;
