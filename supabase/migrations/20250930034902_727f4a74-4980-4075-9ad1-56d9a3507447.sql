-- Fix function search path security issue
DROP FUNCTION IF EXISTS get_next_sequence_number();

CREATE OR REPLACE FUNCTION get_next_sequence_number()
RETURNS BIGINT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    next_seq BIGINT;
BEGIN
    SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO next_seq FROM rundown_operations;
    RETURN next_seq;
END;
$$;