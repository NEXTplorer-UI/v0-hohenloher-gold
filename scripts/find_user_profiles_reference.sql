-- Finde ALLE Policies in der Datenbank die auf "user_profiles" referenzieren
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
WHERE 
    qual::text LIKE '%user_profiles%' 
    OR with_check::text LIKE '%user_profiles%'
ORDER BY schemaname, tablename, policyname;
