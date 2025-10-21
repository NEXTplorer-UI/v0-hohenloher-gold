-- Fix the products ID sequence to prevent duplicate key errors
-- This sets the sequence to the next available ID after the highest existing ID

-- Reset the sequence for products table
SELECT setval(
  pg_get_serial_sequence('products', 'id'),
  COALESCE((SELECT MAX(id) FROM products), 0) + 1,
  false
);

-- Removed currval verification that caused session error
-- The sequence is now correctly set to the next available ID
