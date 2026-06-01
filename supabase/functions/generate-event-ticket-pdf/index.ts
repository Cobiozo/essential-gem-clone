// Edge function: generate-event-ticket-pdf
// Generates a PDF ticket from event_ticket_templates configuration (or a sensible default).
// Embeds QR code pointing to /ticket/{code}.
// Stores PDF in event-tickets/tickets/{orderId}/{attendeeId}.pdf and updates DB.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";
import QRCode from "npm:qrcode@1.5.4";

const FONT_REGULAR_URL = "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf";
const FONT_BOLD_URL = "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf";

let cachedRegular: Uint8Array | null = null;
let cachedBold: Uint8Array | null = null;
async function loadFont(url: string, cache: "r" | "b"): Promise<Uint8Array> {
  if (cache === "r" && cachedRegular) return cachedRegular;
  if (cache === "b" && cachedBold) return cachedBold;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (cache === "r") cachedRegular = bytes; else cachedBold = bytes;
  return bytes;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://purelife.lovable.app";

interface FieldDef {
  key: string;          // firstName | lastName | ticketCode | qr | eventTitle | eventDate | eventLocation | seatNumber | ticketName
  x: number;            // px @ template DPI
  y: number;            // px (top-left origin)
  width?: number;
  height?: number;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  color?: string;       // hex
  textAlign?: "left" | "center" | "right";
}

interface TemplateRow {
  background_url: string | null;
  page_format: string;
  orientation: string;
  width_px: number;
  height_px: number;
  fields: FieldDef[];
}

const DEFAULT_FIELDS: FieldDef[] = [
  { key: "eventTitle",   x: 60,  y: 60,  fontSize: 28, fontWeight: "bold", color: "#111111" },
  { key: "eventDate",    x: 60,  y: 110, fontSize: 14, color: "#444444" },
  { key: "eventLocation",x: 60,  y: 135, fontSize: 14, color: "#444444" },
  { key: "firstName",    x: 60,  y: 320, fontSize: 22, fontWeight: "bold", color: "#000000" },
  { key: "lastName",     x: 60,  y: 360, fontSize: 22, fontWeight: "bold", color: "#000000" },
  { key: "ticketName",   x: 60,  y: 410, fontSize: 14, color: "#555555" },
  { key: "ticketCode",   x: 60,  y: 440, fontSize: 12, color: "#888888" },
  { key: "qr",           x: 950, y: 320, width: 220, height: 220 },
];

function hexToRgb(hex?: string): { r: number; g: number; b: number } {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const num = parseInt(full, 16);
  return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 };
}

function pageSize(format: string, orientation: string): { width: number; height: number } {
  // Returns size in PDF points (1pt = 1/72 inch)
  const sizes: Record<string, [number, number]> = {
    A4: [595.28, 841.89],
    A5: [419.53, 595.28],
    Letter: [612, 792],
    "ticket-105x148": [297.64, 419.53],
  };
  const [w, h] = sizes[format] || sizes.A5;
  return orientation === "landscape" ? { width: h, height: w } : { width: w, height: h };
}

function formatPlDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pl-PL", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Warsaw" });
  } catch {
    return iso;
  }
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { orderId, attendeeId, preview, eventId } = await req.json();

    // ----- PREVIEW MODE -----
    if (preview) {
      if (!eventId) {
        return new Response(JSON.stringify({ error: "eventId required for preview" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: event } = await supabase
        .from("paid_events").select("title, event_date, location").eq("id", eventId).single();
      const { data: template } = await supabase
        .from("event_ticket_templates").select("*").eq("event_id", eventId).maybeSingle();
      const pdfBytes = await renderTicket({
        firstName: "Jan",
        lastName: "Kowalski",
        email: "jan.kowalski@example.com",
        phone: "+48 123 456 789",
        ticketCode: "PODGLĄD-XXXX",
        ticketName: "Bilet testowy",
        seatNumber: "1",
        orderNumber: "PODGLĄD",
        eventTitle: event?.title || "Wydarzenie",
        eventDate: formatPlDate(event?.event_date || null),
        eventEndDate: "",
        eventLocation: event?.location || "",
        qrUrl: `${APP_URL}/ticket/PREVIEW-XXXX`,
        template: (template as TemplateRow | null),
      });
      return new Response(pdfBytes, {
        headers: { ...corsHeaders, "Content-Type": "application/pdf", "Content-Disposition": "inline; filename=ticket-preview.pdf" },
      });
    }

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load order + event + ticket + attendees
    const { data: order, error: oErr } = await supabase
      .from("paid_event_orders")
      .select(`*, paid_events ( id, title, event_date, event_end_date, location, slug ), paid_event_tickets ( name )`)
      .eq("id", orderId).single();
    if (oErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: attendees } = await supabase
      .from("paid_event_order_attendees")
      .select("*").eq("order_id", orderId).order("seat_index", { ascending: true });

    const { data: template } = await supabase
      .from("event_ticket_templates").select("*").eq("event_id", order.event_id).maybeSingle();

    const targets = attendeeId
      ? (attendees || []).filter((a) => a.id === attendeeId)
      : (attendees || []);
    if (targets.length === 0) {
      // No attendees rows — generate one ticket from buyer info
      targets.push({
        id: null,
        seat_index: 1,
        first_name: order.first_name,
        last_name: order.last_name,
        email: order.email,
        ticket_code: order.ticket_code,
      } as any);
    }

    const results: Array<{ attendeeId: string | null; url: string }> = [];
    for (const a of targets) {
      const code = a.ticket_code || order.ticket_code;
      const pdfBytes = await renderTicket({
        firstName: a.first_name || "",
        lastName: a.last_name || "",
        email: a.email || order.email || "",
        phone: order.phone || "",
        ticketCode: code,
        ticketName: (order as any).paid_event_tickets?.name || "",
        seatNumber: String(a.seat_index || 1),
        orderNumber: (order as any).order_number || String(order.id).slice(0, 8).toUpperCase(),
        eventTitle: (order as any).paid_events?.title || "",
        eventDate: formatPlDate((order as any).paid_events?.event_date || null),
        eventEndDate: formatPlDate((order as any).paid_events?.event_end_date || null),
        eventLocation: (order as any).paid_events?.location || "",
        qrUrl: `${APP_URL}/ticket/${code}`,
        template: (template as TemplateRow | null),
      });
      const path = `tickets/${orderId}/${a.id || "buyer"}.pdf`;
      const { error: upErr } = await supabase.storage.from("event-tickets")
        .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true });
      if (upErr) {
        console.error("[generate-event-ticket-pdf] upload failed:", upErr);
        continue;
      }
      const { data: pub } = supabase.storage.from("event-tickets").getPublicUrl(path);
      const url = pub.publicUrl;
      if (a.id) {
        await supabase.from("paid_event_order_attendees").update({ ticket_pdf_url: url }).eq("id", a.id);
      }
      results.push({ attendeeId: a.id || null, url });
    }

    if (results.length > 0) {
      await supabase.from("paid_event_orders")
        .update({ ticket_pdf_url: results[0].url, ticket_generated_at: new Date().toISOString() })
        .eq("id", orderId);
    }

    return new Response(JSON.stringify({ success: true, tickets: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-event-ticket-pdf] error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function renderTicket(args: {
  firstName: string;
  lastName: string;
  ticketCode: string;
  ticketName: string;
  seatNumber: string;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  qrUrl: string;
  template: TemplateRow | null;
}): Promise<Uint8Array> {
  const tpl = args.template;
  const tplW = tpl?.width_px || 1240;
  const tplH = tpl?.height_px || 874;
  const fields = (tpl?.fields && Array.isArray(tpl.fields) && tpl.fields.length > 0)
    ? tpl.fields
    : DEFAULT_FIELDS;

  // When a custom background is uploaded, the PDF page mirrors that image's
  // aspect ratio exactly (no A4/A5 letterboxing). Otherwise fall back to the
  // chosen paper format.
  let pageW: number, pageH: number;
  if (tpl?.background_url) {
    // 1 px @ 96 DPI = 0.75 pt — preserves the canvas proportions
    pageW = tplW * 0.75;
    pageH = tplH * 0.75;
  } else {
    const format = tpl?.page_format || "A5";
    const orientation = tpl?.orientation || "landscape";
    const sz = pageSize(format, orientation);
    pageW = sz.width; pageH = sz.height;
  }

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit as any);
  const page = pdf.addPage([pageW, pageH]);
  const [regBytes, boldBytes] = await Promise.all([
    loadFont(FONT_REGULAR_URL, "r"),
    loadFont(FONT_BOLD_URL, "b"),
  ]);
  const fontRegular = await pdf.embedFont(regBytes, { subset: true });
  const fontBold = await pdf.embedFont(boldBytes, { subset: true });

  // Background
  if (tpl?.background_url) {
    try {
      const bgBytes = await fetchBytes(tpl.background_url);
      // Strip query string before sniffing extension (cache busters etc.)
      const cleanUrl = tpl.background_url.split("?")[0].toLowerCase();
      const isPng = cleanUrl.endsWith(".png");
      let img;
      try {
        img = isPng ? await pdf.embedPng(bgBytes) : await pdf.embedJpg(bgBytes);
      } catch {
        // Fallback: try the opposite codec if extension was misleading
        img = isPng ? await pdf.embedJpg(bgBytes) : await pdf.embedPng(bgBytes);
      }
      page.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
    } catch (e) {
      console.warn("[generate-event-ticket-pdf] bg load failed:", (e as Error).message);
    }
  }

  // Scale factor px -> pt
  const sx = pageW / tplW;
  const sy = pageH / tplH;

  const valueFor = (key: string): string => {
    switch (key) {
      case "firstName":     return args.firstName;
      case "lastName":      return args.lastName;
      case "ticketCode":    return args.ticketCode;
      case "ticketName":    return args.ticketName;
      case "seatNumber":    return `Miejsce ${args.seatNumber}`;
      case "eventTitle":    return args.eventTitle;
      case "eventDate":     return args.eventDate;
      case "eventLocation": return args.eventLocation;
      default:              return "";
    }
  };

  // QR rendering (single instance)
  for (const f of fields) {
    if (f.key === "qr") {
      const qrPngData = await QRCode.toBuffer(args.qrUrl, {
        errorCorrectionLevel: "M",
        type: "png",
        margin: 1,
        width: 512,
      });
      const qrImg = await pdf.embedPng(new Uint8Array(qrPngData));
      const w = (f.width || 220) * sx;
      const h = (f.height || 220) * sy;
      const x = f.x * sx;
      const y = pageH - (f.y * sy) - h; // PDF origin is bottom-left
      page.drawImage(qrImg, { x, y, width: w, height: h });
      continue;
    }

    const text = valueFor(f.key);
    if (!text) continue;
    const fontSize = (f.fontSize || 14) * Math.min(sx, sy);
    const font = f.fontWeight === "bold" ? fontBold : fontRegular;
    const color = hexToRgb(f.color);
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    let xpt = f.x * sx;
    if (f.textAlign === "center" && f.width) xpt += ((f.width * sx) - textWidth) / 2;
    else if (f.textAlign === "right" && f.width) xpt += (f.width * sx) - textWidth;
    const ypt = pageH - (f.y * sy) - fontSize;

    page.drawText(text, { x: xpt, y: ypt, size: fontSize, font, color: rgb(color.r, color.g, color.b) });
  }

  return await pdf.save();
}
