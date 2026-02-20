/**
 * iOS-safe clipboard helper.
 * Tries modern Clipboard API first, falls back to textarea+execCommand for iOS Safari.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Method 1: Modern Clipboard API (Chrome, Firefox, iOS 13.4+)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_err) {
      // Fall through to method 2
    }
  }

  // Method 2: textarea + execCommand fallback (iOS Safari < 13.4, WKWebView)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Must NOT use display:none — iOS Safari ignores hidden elements
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);

    // iOS requires setSelectionRange instead of select()
    textArea.focus();
    textArea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (_err) {
    return false;
  }
}
