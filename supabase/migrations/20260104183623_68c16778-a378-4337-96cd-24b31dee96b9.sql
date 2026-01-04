-- Delete placeholder certificates that were never properly generated
DELETE FROM certificates 
WHERE file_url LIKE 'pending-generation%';