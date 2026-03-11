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
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0.01';
    textArea.style.fontSize = '16px'; // Prevent iOS zoom
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);

    // iOS-specific selection
    const range = document.createRange();
    const selection = window.getSelection();
    
    textArea.contentEditable = 'true';
    textArea.readOnly = false;
    
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (success) return true;
  } catch (_err) {
    // Fall through to method 3
  }

  // Method 3: contentEditable div fallback (in-app browsers, WKWebView)
  try {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.textContent = text;
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.opacity = '0.01';
    div.style.whiteSpace = 'pre';
    div.style.fontSize = '16px';
    document.body.appendChild(div);

    const range = document.createRange();
    range.selectNodeContents(div);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const success = document.execCommand('copy');
    document.body.removeChild(div);
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
  // CRITICAL: clipboard.write() must be called synchronously in the user-gesture
  // call stack. The ClipboardItem resolves the content asynchronously via Promise.
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      const textPromise = asyncFn();
      const blobPromise = textPromise.then(t => new Blob([t], { type: 'text/plain' }));
      const item = new ClipboardItem({ 'text/plain': blobPromise });
      // Call write() IMMEDIATELY — before any await — to preserve transient activation
      const writePromise = navigator.clipboard.write([item]);
      const text = await textPromise;
      await writePromise;
      return { success: true, text };
    } catch (_err) {
      // ClipboardItem approach failed — try fallback below
      // But we need the text, so re-run is unavoidable only if textPromise also threw
    }
  }

  // Fallback: run async first, then try legacy copy
  // NOTE: This will likely fail on iOS Safari due to lost gesture context,
  // but works on desktop and Android Chrome.
  try {
    const text = await asyncFn();
    const success = await copyToClipboard(text);
    return { success, text };
  } catch (_err) {
    return { success: false, text: '' };
  }
}
