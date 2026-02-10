-- Check rigs table for area_id values
SELECT
    r.id,
    r.name,
    r.area_id,
    CASE
        WHEN r.area_id IS NULL THEN 'NULL'
        WHEN r.area_id = '' THEN 'EMPTY STRING'
        ELSE 'HAS VALUE'
    END as area_id_status,
    a.name as area_name
FROM rigs r
LEFT JOIN areas a ON r.area_id = a.id
ORDER BY r.name;

-- Check what areas are available
SELECT * FROM areas;
