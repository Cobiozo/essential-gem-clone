import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import QRCode from "https://esm.sh/qrcode@1.5.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Canvas dimensions used by Fabric.js editor
const CANVAS_WIDTH = 842;
const CANVAS_HEIGHT = 595;

// ── Partner variable resolver (port of src/lib/partnerVariables.ts) ──
interface PartnerProfile {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  city?: string | null;
  country?: string | null;
  specialization?: string | null;
  profile_description?: string | null;
  eq_id?: string | null;
  avatar_url?: string | null;
}

function resolvePartnerVariables(text: string, p: PartnerProfile): string {
  if (!text || typeof text !== "string") return text;
  const map: Record<string, string> = {
    "{{imie}}": p.first_name || "",
    "{{nazwisko}}": p.last_name || "",
    "{{imie_nazwisko}}": `${p.first_name || ""} ${p.last_name || ""}`.trim(),
    "{{email}}": p.email || "",
    "{{telefon}}": p.phone_number || "",
    "{{miasto}}": p.city || "",
    "{{kraj}}": p.country || "",
    "{{specjalizacja}}": p.specialization || "",
    "{{opis}}": p.profile_description || "",
    "{{eq_id}}": p.eq_id || "",
    "{{avatar_url}}": p.avatar_url || "",
  };
  let result = text;
  for (const [key, val] of Object.entries(map)) {
    result = result.split(key).join(val);
  }
  return result;
}

// ── Hex color → pdf-lib rgb ──
function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return rgb(r, g, b);
}

// ── Fetch font bytes (cached per invocation) ──
let _cachedFontBytes: Uint8Array | null = null;
async function getUnicodeFontBytes(): Promise<Uint8Array | null> {
  if (_cachedFontBytes) return _cachedFontBytes;
  try {
    const resp = await fetch(
      "https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-ext-400-normal.woff"
    );
    if (!resp.ok) return null;
    _cachedFontBytes = new Uint8Array(await resp.arrayBuffer());
    return _cachedFontBytes;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partner_user_id, first_name, last_name, email, phone_number, message, form_name, form_cta_key } = await req.json();

    // Validation
    if (!partner_user_id || typeof partner_user_id !== "string") {
      return new Response(JSON.stringify({ error: "partner_user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!first_name || typeof first_name !== "string" || first_name.trim().length === 0 || first_name.length > 100) {
      return new Response(JSON.stringify({ error: "Valid first_name is required (max 100 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitize = (val: unknown, maxLen = 200): string | null => {
      if (!val || typeof val !== "string") return null;
      return val.trim().slice(0, maxLen) || null;
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify partner_user_id exists
    const { data: partnerProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", partner_user_id)
      .single();

    if (!partnerProfile) {
      return new Response(JSON.stringify({ error: "Partner not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notesArr: string[] = [];
    if (message && typeof message === "string" && message.trim()) {
      notesArr.push(message.trim().slice(0, 1000));
    }

    const { error } = await supabase.from("team_contacts").insert({
      user_id: partner_user_id,
      first_name: first_name.trim().slice(0, 100),
      last_name: sanitize(last_name, 100) || "",
      email: email.trim().slice(0, 255),
      phone_number: sanitize(phone_number, 30),
      role: "client",
      contact_type: "private",
      contact_source: "Strona partnerska",
      contact_reason: (typeof form_name === "string" && form_name.trim()) ? form_name.trim().slice(0, 200) : "Formularz kontaktowy",
      notes: notesArr.length > 0 ? notesArr.join("\n") : null,
      added_at: new Date().toISOString().split("T")[0],
      is_active: true,
    });

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to save lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== POST-SUBMIT ACTIONS =====
    if (form_cta_key && typeof form_cta_key === "string") {
      try {
        const { data: formDef } = await supabase
          .from("partner_page_forms")
          .select("post_submit_actions")
          .eq("cta_key", form_cta_key)
          .eq("is_active", true)
          .maybeSingle();

        const actions = (formDef?.post_submit_actions as any[]) || [];

        for (const action of actions) {
          if (action?.type === "send_email_with_file" && action?.bp_file_id) {
            await handleSendEmailWithFile(supabase, action.bp_file_id, email.trim(), first_name.trim(), partner_user_id);
          }
        }
      } catch (actionErr) {
        console.error("Post-submit action error:", actionErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Main handler for send_email_with_file action ──
async function handleSendEmailWithFile(
  supabase: any,
  bpFileId: string,
  recipientEmail: string,
  recipientFirstName: string,
  partnerUserId: string,
) {
  console.log(`[post-action] Sending personalized PDF for BP file ${bpFileId} to ${recipientEmail}`);

  // 1. Fetch BP file record
  const { data: bpFile, error: bpErr } = await supabase
    .from("bp_page_files")
    .select("file_name, original_name, file_url, mime_type")
    .eq("id", bpFileId)
    .single();

  if (bpErr || !bpFile) {
    console.error("[post-action] BP file not found:", bpErr);
    return;
  }

  // 2. Fetch partner profile for variable resolution
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, phone_number, city, country, specialization, profile_description, eq_id, avatar_url")
    .eq("user_id", partnerUserId)
    .single();

  const partnerData: PartnerProfile = profile || {};

  // 3. Fetch all mappings for this file
  const { data: mappings } = await supabase
    .from("bp_file_mappings")
    .select("page_index, elements")
    .eq("file_id", bpFileId)
    .order("page_index", { ascending: true });

  // 4. Download the original file
  console.log(`[post-action] Downloading file from: ${bpFile.file_url}`);
  const fileResp = await fetch(bpFile.file_url);
  if (!fileResp.ok) {
    console.error(`[post-action] Failed to download file: ${fileResp.status}`);
    return;
  }
  const fileBytes = new Uint8Array(await fileResp.arrayBuffer());

  // 5. Generate personalized PDF (or fallback to raw file)
  let finalPdfBytes: Uint8Array;
  let finalMimeType: string;
  let finalFileName: string;

  const hasMappings = mappings && mappings.length > 0 && mappings.some((m: any) => {
    const els = m.elements as any[];
    return Array.isArray(els) && els.length > 0;
  });

  if (hasMappings) {
    try {
      finalPdfBytes = await generatePersonalizedPdf(fileBytes, bpFile.mime_type, mappings, partnerData);
      finalMimeType = "application/pdf";
      finalFileName = (bpFile.original_name || bpFile.file_name).replace(/\.[^.]+$/, "") + ".pdf";
      console.log(`[post-action] Personalized PDF generated, size: ${finalPdfBytes.length} bytes`);
    } catch (genErr) {
      console.error("[post-action] PDF generation failed, sending raw file:", genErr);
      finalPdfBytes = fileBytes;
      finalMimeType = bpFile.mime_type || "application/octet-stream";
      finalFileName = bpFile.original_name || bpFile.file_name;
    }
  } else {
    console.log("[post-action] No mappings found, sending raw file");
    finalPdfBytes = fileBytes;
    finalMimeType = bpFile.mime_type || "application/octet-stream";
    finalFileName = bpFile.original_name || bpFile.file_name;
  }

  // 6. Convert to base64
  let binary = "";
  for (let i = 0; i < finalPdfBytes.length; i++) {
    binary += String.fromCharCode(finalPdfBytes[i]);
  }
  const fileBase64 = btoa(binary);

  // 7. Build email HTML
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Cześć ${recipientFirstName || ''}!</h2>
      <p style="color: #555; line-height: 1.6;">
        Dziękujemy za wypełnienie formularza. W załączniku znajdziesz poradnik/e-book, który dla Ciebie przygotowaliśmy.
      </p>
      <p style="color: #555; line-height: 1.6;">
        Jeśli masz pytania, nie wahaj się z nami skontaktować.
      </p>
      <p style="color: #555; line-height: 1.6; margin-top: 30px;">
        Pozdrawiamy,<br/>
        <strong>Zespół Pure Life</strong>
      </p>
    </div>
  `;

  // 8. Send email with attachment
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const sendResp = await fetch(`${supabaseUrl}/functions/v1/send-single-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      skip_template: true,
      recipient_email: recipientEmail,
      subject: "Twój darmowy poradnik od Pure Life",
      html_body: htmlBody,
      attachments: [
        {
          filename: finalFileName,
          content_base64: fileBase64,
          content_type: finalMimeType,
        },
      ],
    }),
  });

  const sendResult = await sendResp.json();
  console.log(`[post-action] Email send result:`, sendResult);
}

// ── Generate personalized PDF with mapping overlays ──
async function generatePersonalizedPdf(
  originalBytes: Uint8Array,
  mimeType: string | null,
  mappings: any[],
  profile: PartnerProfile,
): Promise<Uint8Array> {
  const isPdf = mimeType === "application/pdf";
  let pdfDoc: any;

  if (isPdf) {
    pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
  } else {
    // Image file (JPG/PNG) → create new PDF with image as background
    pdfDoc = await PDFDocument.create();
    const isJpeg = mimeType === "image/jpeg" || mimeType === "image/jpg";
    const embedFn = isJpeg ? pdfDoc.embedJpg.bind(pdfDoc) : pdfDoc.embedPng.bind(pdfDoc);
    const img = await embedFn(originalBytes);
    
    // A4 landscape dimensions in points
    const pageWidth = 842;
    const pageHeight = 595;
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(img, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  }

  // Embed font for Unicode support (Polish characters)
  let font: any;
  try {
    const fontBytes = await getUnicodeFontBytes();
    if (fontBytes) {
      font = await pdfDoc.embedFont(fontBytes);
      console.log("[post-action] Embedded Roboto font for Unicode support");
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      console.log("[post-action] Fallback to Helvetica (no Unicode)");
    }
  } catch {
    font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    console.log("[post-action] Fallback to Helvetica after font error");
  }

  // Process each mapping
  for (const mapping of mappings) {
    const pageIndex = mapping.page_index || 0;
    if (pageIndex >= pdfDoc.getPageCount()) continue;

    const page = pdfDoc.getPage(pageIndex);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const elements = (mapping.elements as any[]) || [];

    for (const el of elements) {
      try {
        if (el.type === "text") {
          await drawTextElement(page, el, profile, font, pageWidth, pageHeight);
        } else if (el.type === "image" && el.src) {
          await drawImageElement(pdfDoc, page, el, pageWidth, pageHeight);
        } else if (el.type === "qr_code" && el.qrContent) {
          await drawQrElement(pdfDoc, page, el, profile, pageWidth, pageHeight);
        }
      } catch (elErr) {
        console.error(`[post-action] Error drawing element ${el.id}:`, elErr);
      }
    }
  }

  return pdfDoc.save();
}

// ── Draw text element ──
function drawTextElement(
  page: any,
  el: any,
  profile: PartnerProfile,
  font: any,
  pageWidth: number,
  pageHeight: number,
) {
  const resolvedText = resolvePartnerVariables(el.content || "", profile);
  if (!resolvedText.trim()) return;

  const fontSize = el.fontSize || 24;
  const color = el.color ? hexToRgb(el.color) : rgb(0, 0, 0);

  // Scale from canvas coords to PDF coords
  const scaleX = pageWidth / CANVAS_WIDTH;
  const scaleY = pageHeight / CANVAS_HEIGHT;
  const scaledFontSize = fontSize * scaleY;

  const elWidth = (el.width || 300) * scaleX;
  let x = (el.x || 0) * scaleX;
  // Canvas Y is from top, PDF Y is from bottom
  const y = pageHeight - (el.y || 0) * scaleY - scaledFontSize;

  // Handle text alignment
  const align = el.align || "left";
  if (align === "center" || align === "right") {
    try {
      const textWidth = font.widthOfTextAtSize(resolvedText, scaledFontSize);
      if (align === "center") {
        x = x + (elWidth - textWidth) / 2;
      } else {
        x = x + elWidth - textWidth;
      }
    } catch {
      // If width calculation fails, use left alignment
    }
  }

  // Split multiline text
  const lines = resolvedText.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    try {
      page.drawText(line, {
        x,
        y: y - i * scaledFontSize * 1.2,
        size: scaledFontSize,
        font,
        color,
      });
    } catch (drawErr) {
      // Some characters might not be in the font — try stripping unsupported chars
      console.error(`[post-action] drawText error for line "${line}":`, drawErr);
    }
  }
}

// ── Detect image format from magic bytes ──
function detectImageFormat(bytes: Uint8Array): 'png' | 'jpeg' | 'webp' | null {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'png';
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xD8) return 'jpeg';
  if (bytes.length >= 4 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'webp';
  return null;
}

// ── Draw image element ──
async function drawImageElement(
  pdfDoc: any,
  page: any,
  el: any,
  pageWidth: number,
  pageHeight: number,
) {
  try {
    let imgBytes: Uint8Array;
    let format: 'png' | 'jpeg' | 'webp' | null;

    const imgResp = await fetch(el.src);
    if (!imgResp.ok) {
      console.error(`[post-action] Failed to fetch image: ${el.src}`);
      return;
    }

    imgBytes = new Uint8Array(await imgResp.arrayBuffer());
    format = detectImageFormat(imgBytes);

    // If WebP, convert to PNG via wsrv.nl proxy or Supabase transform
    if (format === 'webp') {
      console.log(`[post-action] WebP detected for ${el.src}, converting to PNG...`);
      let pngUrl: string;

      if (el.src.includes('/object/public/') || el.src.includes('/storage/v1/')) {
        // Supabase Storage: use render/image transform endpoint
        pngUrl = el.src.replace('/object/public/', '/render/image/public/');
        pngUrl += (pngUrl.includes('?') ? '&' : '?') + 'format=png&width=1600';
      } else {
        // External URL: use wsrv.nl proxy
        pngUrl = `https://wsrv.nl/?url=${encodeURIComponent(el.src)}&output=png`;
      }

      const pngResp = await fetch(pngUrl);
      if (pngResp.ok) {
        imgBytes = new Uint8Array(await pngResp.arrayBuffer());
        format = detectImageFormat(imgBytes);
        console.log(`[post-action] Converted format: ${format}`);
      } else {
        console.error(`[post-action] WebP conversion failed (status ${pngResp.status}), trying wsrv.nl fallback...`);
        // Fallback to wsrv.nl if Supabase transform failed
        const fallbackUrl = `https://wsrv.nl/?url=${encodeURIComponent(el.src)}&output=png`;
        const fallbackResp = await fetch(fallbackUrl);
        if (fallbackResp.ok) {
          imgBytes = new Uint8Array(await fallbackResp.arrayBuffer());
          format = detectImageFormat(imgBytes);
          console.log(`[post-action] Fallback converted format: ${format}`);
        } else {
          console.error(`[post-action] All WebP conversion attempts failed for ${el.src}. Skipping.`);
          return;
        }
      }
    }

    if (!format || format === 'webp') {
      console.warn(`[post-action] Unsupported image format for ${el.src} (magic bytes: ${imgBytes[0]?.toString(16)}, ${imgBytes[1]?.toString(16)}). Skipping.`);
      return;
    }

    let img: any;
    if (format === 'png') {
      img = await pdfDoc.embedPng(imgBytes);
    } else {
      img = await pdfDoc.embedJpg(imgBytes);
    }

    const scaleX = pageWidth / CANVAS_WIDTH;
    const scaleY = pageHeight / CANVAS_HEIGHT;
    const w = (el.width || 200) * scaleX;
    const h = (el.height || 200) * scaleY;
    const x = (el.x || 0) * scaleX;
    const y = pageHeight - (el.y || 0) * scaleY - h;

    page.drawImage(img, { x, y, width: w, height: h });
  } catch (imgErr) {
    console.error(`[post-action] Error embedding image ${el.src}:`, imgErr);
  }
}

// ── Draw QR code element ──
async function drawQrElement(
  pdfDoc: any,
  page: any,
  el: any,
  profile: PartnerProfile,
  pageWidth: number,
  pageHeight: number,
) {
  const resolvedContent = resolvePartnerVariables(el.qrContent || "", profile);
  if (!resolvedContent.trim()) return;

  try {
    // Use external QR API to get a PNG (avoids Canvas dependency in Deno)
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&format=png&data=${encodeURIComponent(resolvedContent)}`;
    const qrResp = await fetch(qrApiUrl);
    if (!qrResp.ok) {
      console.error(`[post-action] QR API failed for: ${resolvedContent}`);
      return;
    }

    const qrBytes = new Uint8Array(await qrResp.arrayBuffer());
    const qrImg = await pdfDoc.embedPng(qrBytes);

    const scaleX = pageWidth / CANVAS_WIDTH;
    const scaleY = pageHeight / CANVAS_HEIGHT;
    const w = (el.width || 150) * scaleX;
    const h = (el.height || 150) * scaleY;
    const x = (el.x || 0) * scaleX;
    const y = pageHeight - (el.y || 0) * scaleY - h;

    page.drawImage(qrImg, { x, y, width: w, height: h });
  } catch (qrErr) {
    console.error(`[post-action] Error generating QR for "${resolvedContent}":`, qrErr);
  }
}
