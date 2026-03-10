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
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (_err) {
    return false;
  }
}

/**
 * Copy text to clipboard after an async operation (iOS Safari safe).
 * Uses ClipboardItem with a pending Blob so the clipboard write is initiated
 * synchronously in the user-gesture call stack, while the actual content
 * resolves asynchronously.
 */
export async function copyAfterAsync(
  asyncFn: () => Promise<string>
): Promise<{ success: boolean; text: string }> {
  // Modern approach: ClipboardItem with pending blob (iOS Safari 15.4+)
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      const textPromise = asyncFn();
      const item = new ClipboardItem({
        'text/plain': textPromise.then(t => new Blob([t], { type: 'text/plain' }))
      });
      const text = await textPromise;
      await navigator.clipboard.write([item]);
      return { success: true, text };
    } catch (_err) {
      // If ClipboardItem approach failed, the promise likely already resolved
      // Try to get the text and fall back to legacy copy
      try {
        const text = await asyncFn();
        const success = await copyToClipboard(text);
        return { success, text };
      } catch (_innerErr) {
        return { success: false, text: '' };
      }
    }
  }

  // Fallback: run async first, then try legacy copy
  try {
    const text = await asyncFn();
    const success = await copyToClipboard(text);
    return { success, text };
  } catch (_err) {
    return { success: false, text: '' };
  }
}
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
