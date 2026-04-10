UPDATE translation_jobs 
SET status = 'failed', 
    error_message = 'Stuck in processing - cleaned up',
    updated_at = NOW()
WHERE status = 'processing' 
  AND updated_at < NOW() - INTERVAL '1 hour';