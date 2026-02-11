-- Ensure all admin users have has_all_rigs = 1
UPDATE users 
SET has_all_rigs = 1 
WHERE role = 'admin' AND has_all_rigs = 0;
