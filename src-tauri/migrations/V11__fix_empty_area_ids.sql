-- Fix existing rigs with empty string area_id values
-- Convert empty strings to NULL so LEFT JOIN works correctly

UPDATE rigs
SET area_id = NULL
WHERE area_id = '' OR area_id = ' ';
