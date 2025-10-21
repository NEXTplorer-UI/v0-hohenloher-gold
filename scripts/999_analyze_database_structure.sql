-- =====================================================
-- DATABASE STRUCTURE ANALYSIS SCRIPT
-- =====================================================
-- This script analyzes and displays the current database structure
-- Run this anytime to see what tables, columns, indexes, etc. exist
-- =====================================================

-- 1. LIST ALL TABLES
SELECT 
    '=== TABLES ===' as info,
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. LIST ALL COLUMNS FOR EACH TABLE
SELECT 
    '=== COLUMNS ===' as info,
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. LIST ALL INDEXES
SELECT 
    '=== INDEXES ===' as info,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. LIST ALL FOREIGN KEYS
SELECT 
    '=== FOREIGN KEYS ===' as info,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 5. LIST ALL TRIGGERS
SELECT 
    '=== TRIGGERS ===' as info,
    trigger_schema,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6. LIST ALL FUNCTIONS
SELECT 
    '=== FUNCTIONS ===' as info,
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 7. LIST ALL RLS POLICIES
SELECT 
    '=== RLS POLICIES ===' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. CHECK IF RLS IS ENABLED ON TABLES
SELECT 
    '=== RLS STATUS ===' as info,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 9. LIST ALL SEQUENCES
SELECT 
    '=== SEQUENCES ===' as info,
    sequence_schema,
    sequence_name,
    data_type,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- 10. SUMMARY
SELECT 
    '=== SUMMARY ===' as info,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public') as total_columns,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers,
    (SELECT COUNT(*) FROM pg_proc p LEFT JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public') as total_functions,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies;
