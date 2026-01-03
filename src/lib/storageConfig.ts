// Konfiguracja lokalnego storage na VPS
export const STORAGE_CONFIG = {
  // Limity
  MAX_FILE_SIZE_MB: 2048, // 2GB
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024 * 1024,
  
  // URL do API uploadu (względny dla tego samego serwera)
  UPLOAD_API_URL: '/api/upload.php',
  LIST_API_URL: '/api/list-files.php',
  
  // Klucz API (powinien odpowiadać kluczowi w PHP!)
  API_KEY: 'PURE_LIFE_UPLOAD_SECRET_2024',
  
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
