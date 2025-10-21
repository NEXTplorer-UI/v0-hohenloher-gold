-- Add pickup time fields to delivery_schedules table
-- This allows specifying a time range for pickup on each delivery day

ALTER TABLE public.delivery_schedules
ADD COLUMN IF NOT EXISTS pickup_start_time TIME,
ADD COLUMN IF NOT EXISTS pickup_end_time TIME;

COMMENT ON COLUMN public.delivery_schedules.pickup_start_time IS 'Start time for pickup window (e.g., 10:00)';
COMMENT ON COLUMN public.delivery_schedules.pickup_end_time IS 'End time for pickup window (e.g., 12:00)';
