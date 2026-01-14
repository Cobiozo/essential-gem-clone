// Konfiguracja lokalnego storage na VPS
export const STORAGE_CONFIG = {
  // Limity
  MAX_FILE_SIZE_MB: 2048, // 2GB - maksymalny rozmiar ogólny
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024 * 1024,
  
  // Limit dla Supabase Storage (małe pliki)
  SUPABASE_MAX_SIZE_MB: 2, // 2MB
  SUPABASE_MAX_SIZE_BYTES: 2 * 1024 * 1024, // 2MB w bajtach
  
  // URL do API uploadu (Node.js Express)
  UPLOAD_API_URL: '/upload',
  LIST_API_URL: '/list-files',
  
  // Dozwolone typy plików
  ALLOWED_TYPES: {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/flac'],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain'
    ]
  }
};

// Helper do formatowania rozmiaru pliku
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
