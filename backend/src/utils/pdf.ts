import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";
import { TemplateContext, InvoiceWithDetails, BusinessSettings } from "../types/index.ts";
import { getTemplateById, renderTemplate as renderTpl } from "../controllers/templates.ts";
// pdf-lib fallback remains available for environments without wkhtmltopdf

export async function generateInvoicePDF(
  invoiceData: InvoiceWithDetails, 
  businessSettings?: BusinessSettings,
  templateId?: string,
  customHighlightColor?: string
): Promise<Uint8Array> {
  // Try to inline remote logo to a data URL for robust wkhtmltopdf rendering
  const inlined = await inlineLogoIfPossible(businessSettings);
  // Prefer wkhtmltopdf using selected template; fallback to pdf-lib styles
  const html = buildHTML(invoiceData, inlined, templateId, customHighlightColor);
  const wk = await tryWkhtmlToPdf(html);
  if (wk) return wk;
  // Fallback
  return await generateStyledPDF(invoiceData, inlined, customHighlightColor, templateId);
}

// Inline remote logo images into data URLs so external fetch/CAs don't block rendering
type WithLogo = BusinessSettings & { logo?: string; logoUrl?: string };

async function inlineLogoIfPossible<T extends BusinessSettings | undefined>(settings: T): Promise<T> {
  try {
    if (!settings) return settings;
  const s = settings as unknown as WithLogo;
    const src = s.logo || s.logoUrl;
    if (!src || src.startsWith("data:")) return settings;
    if (!(src.startsWith("http://") || src.startsWith("https://"))) return settings;
    const res = await fetch(src);
    if (!res.ok) return settings;
    const ab = await res.arrayBuffer();
    const mime = res.headers.get("content-type") || inferMimeFromUrl(src) || "image/png";
    const b64 = arrayBufferToBase64(ab);
    const dataUrl = `data:${mime};base64,${b64}`;
  (settings as unknown as WithLogo).logo = dataUrl;
    return settings;
  } catch (_e) {
    return settings;
  }
}

function inferMimeFromUrl(url: string): string | undefined {
  const u = url.toLowerCase();
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  if (u.endsWith('.gif')) return 'image/gif';
  if (u.endsWith('.svg')) return 'image/svg+xml';
  return undefined;
}

function arrayBufferToBase64(ab: ArrayBuffer): string {
  const bytes = new Uint8Array(ab);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk) as unknown as number[]);
  }
  // btoa expects Latin-1; this is fine for binary constructed above
  return btoa(binary);
}

function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return rgb(0.15, 0.39, 0.92); // Default blue
  }
  
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  
  return rgb(r, g, b);
}

function normalizeHex(hex?: string): string | undefined {
  if (!hex) return undefined;
  const h = hex.trim();
  if (/^#?[0-9a-fA-F]{6}$/.test(h)) return h.startsWith('#') ? h : `#${h}`;
  return undefined;
}

function lighten(hex: string, amount = 0.85): string {
  const n = normalizeHex(hex) ?? "#2563eb";
  const m = n.replace('#', '');
  const r = parseInt(m.slice(0,2), 16);
  const g = parseInt(m.slice(2,4), 16);
  const b = parseInt(m.slice(4,6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const rr = mix(r).toString(16).padStart(2, '0');
  const gg = mix(g).toString(16).padStart(2, '0');
  const bb = mix(b).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

async function generateStyledPDF(
  invoiceData: InvoiceWithDetails, 
  businessSettings?: BusinessSettings,
  customHighlightColor?: string,
  templateId?: string
): Promise<Uint8Array> {
  // Generate different PDF styles based on template ID
  const highlightRgb = customHighlightColor ? hexToRgb(customHighlightColor) : rgb(0.15, 0.39, 0.92);
  
  console.log(`PDF Generation - Template ID: ${templateId}`);
  
  if (templateId === 'professional-modern' || templateId?.toLowerCase().includes('professional')) {
    console.log('Generating Professional PDF');
    return await generateProfessionalPDF(invoiceData, businessSettings, highlightRgb);
  } else if (templateId === 'minimalist-clean' || templateId?.toLowerCase().includes('minimalist')) {
    console.log('Generating Minimalist PDF');
    return await generateMinimalistPDF(invoiceData, businessSettings, highlightRgb);
  } else {
    console.log('Generating Fallback PDF');
    return await generateFallbackPDF(invoiceData, businessSettings, customHighlightColor);
  }
}

// ---- Layout utilities for consistent styling and pagination ----
type DrawContext = {
  pdfDoc: PDFDocument;
  page: PDFPage;
  regularFont: PDFFont;
  boldFont: PDFFont;
  highlight: ReturnType<typeof rgb>;
  margins: { left: number; right: number; top: number; bottom: number };
  cursorY: number;
  contentWidth: number;
};

const A4 = { width: 595, height: 842 } as const;

function createMargins() {
  // 36pt = 0.5in; we aim for ~0.75in (54pt) all around by default
  const left = 50;
  const right = A4.width - 50;
  const top = A4.height - 50;
  const bottom = 60;
  return { left, right, top, bottom };
}

function formatMoney(currency: string, amount: number) {
  return `${currency} ${amount.toFixed(2)}`;
}

function measureWidth(text: string, font: PDFFont, size: number) {
  return font.widthOfTextAtSize(text, size);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const tentative = current ? `${current} ${w}` : w;
    if (measureWidth(tentative, font, size) <= maxWidth) {
      current = tentative;
    } else {
      if (current) lines.push(current);
      // If a single word is too long, hard split
      if (measureWidth(w, font, size) > maxWidth) {
        let chunk = "";
        for (const ch of w.split("")) {
          const tent = chunk + ch;
          if (measureWidth(tent, font, size) <= maxWidth) {
            chunk = tent;
          } else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        if (chunk) lines.push(chunk);
        current = "";
      } else {
        current = w;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function newPage(ctx: DrawContext): void {
  ctx.page = ctx.pdfDoc.addPage([A4.width, A4.height]);
  ctx.cursorY = ctx.margins.top;
}

function ensureSpace(ctx: DrawContext, needed: number): void {
  if (ctx.cursorY - needed < ctx.margins.bottom) {
    newPage(ctx);
  }
}

function drawLabelValue(
  ctx: DrawContext,
  label: string,
  value: string,
  x: number,
  size = 10,
  gap = 60,
  color: ReturnType<typeof rgb> = rgb(0.3, 0.3, 0.3)
) {
  ctx.page.drawText(label, { x, y: ctx.cursorY, size, font: ctx.boldFont, color: ctx.highlight });
  ctx.page.drawText(value, { x: x + gap, y: ctx.cursorY, size, font: ctx.regularFont, color });
  ctx.cursorY -= size + 4;
}

function drawTableHeader(ctx: DrawContext, columns: { title: string; x: number; align?: "left" | "right" }[], fill?: ReturnType<typeof rgb>) {
  const h = 20;
  ensureSpace(ctx, h + 8);
  if (fill) {
    ctx.page.drawRectangle({ x: ctx.margins.left, y: ctx.cursorY - 4, width: ctx.contentWidth, height: h, color: fill });
  }
  for (const col of columns) {
    ctx.page.drawText(col.title.toUpperCase(), {
      x: col.x,
      y: ctx.cursorY + 2,
      size: 9,
      font: ctx.boldFont,
      color: fill ? rgb(1, 1, 1) : ctx.highlight,
    });
  }
  ctx.cursorY -= h + 6;
}

function _drawTableRow(ctx: DrawContext, cells: { text: string; x: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> }[], rowHeight = 18, altFill?: ReturnType<typeof rgb>) {
  ensureSpace(ctx, rowHeight);
  if (altFill) {
    ctx.page.drawRectangle({ x: ctx.margins.left, y: ctx.cursorY - 3, width: ctx.contentWidth, height: rowHeight, color: altFill });
  }
  for (const c of cells) {
    ctx.page.drawText(c.text, { x: c.x, y: ctx.cursorY, size: c.size ?? 9, font: c.font ?? ctx.regularFont, color: c.color ?? rgb(0.2, 0.2, 0.2) });
  }
  ctx.cursorY -= rowHeight;
}

function drawDivider(ctx: DrawContext, color = rgb(0.85, 0.85, 0.85)) {
  ctx.page.drawLine({ start: { x: ctx.margins.left, y: ctx.cursorY }, end: { x: ctx.margins.right, y: ctx.cursorY }, thickness: 0.5, color });
  ctx.cursorY -= 12;
}

// ---- HTML rendering using wkhtmltopdf ----

function formatDate(d?: Date) {
  return d ? new Date(d).toLocaleDateString() : undefined;
}

function buildContext(invoice: InvoiceWithDetails, settings?: BusinessSettings & { logoUrl?: string }, _highlight?: string): TemplateContext & { logoUrl?: string } {
  const currency = invoice.currency || settings?.currency || "USD";
  const toMoney = (n: number) => n.toFixed(2);
  return {
    // Company
    companyName: settings?.companyName || "Your Company",
    companyAddress: settings?.companyAddress || "",
    companyEmail: settings?.companyEmail || "",
    companyPhone: settings?.companyPhone || "",
    companyTaxId: settings?.companyTaxId || "",

    // Invoice
    invoiceNumber: invoice.invoiceNumber,
    issueDate: formatDate(invoice.issueDate)!,
    dueDate: formatDate(invoice.dueDate),
    currency,
    status: invoice.status,

    // Customer
    customerName: invoice.customer.name,
    customerEmail: invoice.customer.email,
    customerPhone: invoice.customer.phone,
    customerAddress: invoice.customer.address,
    customerTaxId: invoice.customer.taxId,

    // Items
    items: invoice.items.map(i => ({
      itemCode: i.itemCode,
      description: i.description,
      quantity: i.quantity,
      unitPrice: toMoney(i.unitPrice),
      lineTotal: toMoney(i.lineTotal),
      notes: i.notes,
    })),

    // Totals
    subtotal: toMoney(invoice.subtotal),
    discountAmount: invoice.discountAmount > 0 ? toMoney(invoice.discountAmount) : undefined,
    discountPercentage: invoice.discountPercentage || undefined,
    taxRate: invoice.taxRate || undefined,
    taxAmount: invoice.taxAmount > 0 ? toMoney(invoice.taxAmount) : undefined,
    total: toMoney(invoice.total),

    // Flags
    hasDiscount: invoice.discountAmount > 0,
    hasTax: invoice.taxAmount > 0,
    showItemCode: invoice.items.some(i => !!i.itemCode),

    // Payment
    paymentTerms: invoice.paymentTerms || settings?.paymentTerms || undefined,
    paymentMethods: settings?.paymentMethods || undefined,
    bankAccount: settings?.bankAccount || undefined,

    // Notes
    notes: invoice.notes || settings?.defaultNotes || undefined,

    // Non-mustache extras
  // Provide logoUrl for both inline HTML and DB templates that expect it
  logoUrl: (settings as unknown as { logo?: string; logoUrl?: string })?.logo || (settings as unknown as { logo?: string; logoUrl?: string })?.logoUrl,
    // Color
    // Provide default highlight if not given
    // We'll inject via CSS vars
  } as TemplateContext & { logoUrl?: string };
}

function buildHTML(invoice: InvoiceWithDetails, settings?: BusinessSettings, templateId?: string, highlight?: string): string {
  const ctx = buildContext(invoice, settings, highlight);
  const hl = normalizeHex(highlight) || "#2563eb";
  const hlLight = lighten(hl, 0.86);

  // If a specific template is requested and exists in DB, render it
  if (templateId) {
    try {
      const t = getTemplateById(templateId);
      if (t && t.html) {
        const html = renderTpl(t.html, { ...ctx, highlightColor: hl, highlightColorLight: hlLight, showItemCode: ctx.showItemCode });
        return html;
      }
    } catch (_e) {
      // Fall back to built-in modern HTML if DB access fails
    }
  }

  // Unified modern template close to the screenshot; wkhtmltopdf will render accurately.
  const baseHtml = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Invoice ${ctx.invoiceNumber}</title>
    <style>
  :root { --hl: ${hl}; --hl-light: ${hlLight}; --ink-1:#111827; --ink-2:#374151; --ink-3:#6b7280; --bd:#e5e7eb; }
      @page { size: A4; margin: 15mm; }
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, Arial, sans-serif; color: var(--ink-1); }
      .topbar { height: 48px; background: var(--hl); color: #fff; display:flex; align-items:center; padding: 0 10px 0 12px; border-radius: 6px 6px 0 0; }
      .brand { display:flex; align-items:center; gap:10px; font-weight: 800; font-size: 18px; letter-spacing: .2px; }
      .brand img { height: 28px; width:auto; object-fit:contain; }
  .wrap { margin-top: 14px; }
  .row { display:flex; justify-content:space-between; align-items:flex-start; gap: 20px; margin-bottom: 12px; }
      .meta { border: 2px solid var(--hl); border-radius: 6px; padding: 10px 12px; min-width: 200px; background:#fff; }
      .meta p { margin: 4px 0; font-size: 12px; color: var(--ink-2); }
      .meta strong { color: var(--ink-1); }
      .title { font-size: 24px; font-weight: 900; color: #fff; margin-left:auto; }
      .billto h3 { color: var(--hl); margin: 0 0 6px 0; font-size: 12px; letter-spacing: .6px; }
      .billto .name { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
      .billto p { margin: 2px 0; color: var(--ink-2); font-size: 12px; white-space: pre-line; }
  .table { margin-top: 20px; width:100%; border-collapse: collapse; }
      .table thead th { background: var(--hl); color:#fff; text-transform: uppercase; letter-spacing: .5px; font-size: 11px; text-align:left; padding: 8px; }
      .table th:last-child, .table td:last-child { text-align: right; }
      .table tbody tr:nth-child(odd) { background: #fafafa; }
      .table td { padding: 10px 8px; border-bottom: 1px solid var(--bd); font-size: 12px; vertical-align: top; }
      .desc { font-weight: 600; color: var(--ink-1); margin-bottom: 2px; }
      .notes { color: var(--ink-3); font-size: 11px; }
  .totals { width: 320px; margin-left:auto; margin-top: 24px; }
      .totals .row { display:flex; justify-content:space-between; margin: 6px 0; font-size: 12px; }
      .totals .row.total { border-top: 2px solid var(--hl); padding-top: 8px; font-weight: 800; color: var(--hl); }
  .payinfo { margin-top: 28px; }
      .payinfo h4 { color: var(--hl); margin: 0 0 6px 0; font-size: 12px; letter-spacing:.6px; }
      .payinfo p { margin: 2px 0; font-size: 12px; color: var(--ink-2); }
    </style>
  </head>
  <body>
    <div class="topbar">
      <div class="brand">
        ${ctx.logoUrl ? `<img src="${ctx.logoUrl}" alt="logo"/>` : ""}
        <div>${ctx.companyName}</div>
      </div>
      <div class="title">INVOICE</div>
    </div>
    <div class="wrap">
      <div class="row">
        <div class="billto">
          <h3>BILL TO:</h3>
          <div class="name">${ctx.customerName}</div>
          ${ctx.customerAddress ? `<p>${ctx.customerAddress}</p>` : ""}
          ${ctx.customerEmail ? `<p>${ctx.customerEmail}</p>` : ""}
          ${ctx.customerPhone ? `<p>${ctx.customerPhone}</p>` : ""}
        </div>
        <div class="meta">
          <p><strong>Invoice #:</strong> ${ctx.invoiceNumber}</p>
          <p><strong>Date:</strong> ${ctx.issueDate}</p>
          ${ctx.dueDate ? `<p><strong>Due:</strong> ${ctx.dueDate}</p>` : ""}
        </div>
      </div>
      <table class="table">
        <thead>
          <tr>
            ${ctx.showItemCode ? `<th style="width:90px;">Code</th>` : ""}
            <th>Description</th>
            <th style="width:60px;">Qty</th>
            <th style="width:90px;">Rate</th>
            <th style="width:110px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${ctx.items.map(i => `
            <tr>
              ${ctx.showItemCode ? `<td>${i.itemCode ?? ""}</td>` : ""}
              <td>
                <div class="desc">${i.description}</div>
                ${i.notes ? `<div class="notes">${i.notes}</div>` : ""}
              </td>
              <td>${i.quantity}</td>
              <td>${ctx.currency} ${i.unitPrice}</td>
              <td><strong>${ctx.currency} ${i.lineTotal}</strong></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="totals">
        <div class="row"><div>Subtotal:</div><div>${ctx.currency} ${ctx.subtotal}</div></div>
        ${ctx.hasDiscount ? `<div class="row"><div>Discount${ctx.discountPercentage ? ` (${ctx.discountPercentage}%)` : ''}:</div><div>-${ctx.currency} ${ctx.discountAmount}</div></div>` : ''}
        ${ctx.hasTax ? `<div class="row"><div>Tax (${ctx.taxRate}%):</div><div>${ctx.currency} ${ctx.taxAmount}</div></div>` : ''}
        <div class="row total"><div>Total:</div><div>${ctx.currency} ${ctx.total}</div></div>
      </div>
      <div class="payinfo">
        <h4>Payment Information</h4>
        ${ctx.paymentTerms ? `<p><strong>Terms:</strong> ${ctx.paymentTerms}</p>` : ''}
        ${ctx.paymentMethods ? `<p><strong>Methods:</strong> ${ctx.paymentMethods}</p>` : ''}
        ${ctx.bankAccount ? `<p><strong>Bank:</strong> ${ctx.bankAccount}</p>` : ''}
      </div>
    </div>
  </body>
  </html>`;

  // Default inline modern template when a DB template isn't specified or found.
  return baseHtml;
}

async function tryWkhtmlToPdf(html: string): Promise<Uint8Array | null> {
  try {
    // Attempt to run wkhtmltopdf; if missing, this will throw
    const cmd = new Deno.Command("wkhtmltopdf", {
      args: [
        "-q",
        "--enable-local-file-access",
        "-s", "A4",
        "--margin-top", "15mm",
        "--margin-bottom", "15mm",
        "--margin-left", "15mm",
        "--margin-right", "15mm",
        "-", "-",
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    const child = cmd.spawn();
    // Write HTML to stdin
    const writer = child.stdin.getWriter();
    const enc = new TextEncoder();
    await writer.write(enc.encode(html));
    await writer.close();
    const { success, stdout, stderr } = await child.output();
    if (!success) {
      console.error("wkhtmltopdf failed:", new TextDecoder().decode(stderr));
      return null;
    }
    return new Uint8Array(stdout);
  } catch (_e) {
    // wkhtmltopdf not installed or disallowed (missing --allow-run)
    return null;
  }
}

async function generateFallbackPDF(
  invoiceData: InvoiceWithDetails, 
  businessSettings?: BusinessSettings,
  customHighlightColor?: string
): Promise<Uint8Array> {
  // Use the existing PDF generation logic with optional custom color
  const highlightRgb = customHighlightColor ? hexToRgb(customHighlightColor) : rgb(0.15, 0.39, 0.92); // Default blue

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size in points (8.27 × 11.69 inches)
  
  // Load fonts
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  let yPosition = 800;
  const leftMargin = 50;
  const rightMargin = 545;
  
  // Header - Company Information with custom color
  if (businessSettings?.companyName) {
    page.drawText(businessSettings.companyName, {
      x: leftMargin,
      y: yPosition,
      size: 20,
      font: boldFont,
      color: highlightRgb,
    });
    yPosition -= 25;
    
    if (businessSettings.companyAddress) {
      page.drawText(businessSettings.companyAddress, {
        x: leftMargin,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 15;
    }
    
    if (businessSettings.companyEmail) {
      page.drawText(businessSettings.companyEmail, {
        x: leftMargin,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 15;
    }
    
    if (businessSettings.companyPhone) {
      page.drawText(businessSettings.companyPhone, {
        x: leftMargin,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 15;
    }
    
    if (businessSettings.companyTaxId) {
      page.drawText(`Tax ID: ${businessSettings.companyTaxId}`, {
        x: leftMargin,
        y: yPosition,
        size: 10,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });
    }
  }
  
  // Invoice Title and Number (Right side)
  page.drawText("INVOICE", {
    x: rightMargin - 100,
    y: 800,
    size: 24,
    font: boldFont,
    color: highlightRgb,
  });
  
  page.drawText(`Invoice #: ${invoiceData.invoiceNumber}`, {
    x: rightMargin - 150,
    y: 770,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  page.drawText(`Date: ${new Date(invoiceData.issueDate).toLocaleDateString()}`, {
    x: rightMargin - 150,
    y: 750,
    size: 10,
    font: regularFont,
    color: rgb(0, 0, 0),
  });
  
  if (invoiceData.dueDate) {
    page.drawText(`Due Date: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, {
      x: rightMargin - 150,
      y: 730,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
  }
  
  page.drawText(`Status: ${invoiceData.status.toUpperCase()}`, {
    x: rightMargin - 150,
    y: 710,
    size: 10,
    font: regularFont,
    color: invoiceData.status === 'paid' ? rgb(0, 0.7, 0) : highlightRgb,
  });
  
  // Bill To Section
  yPosition = 650;
  page.drawText("BILL TO:", {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: highlightRgb,
  });
  yPosition -= 20;
  
  page.drawText(invoiceData.customer.name, {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 15;
  
  if (invoiceData.customer.address) {
    page.drawText(invoiceData.customer.address, {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }
  
  if (invoiceData.customer.email) {
    page.drawText(invoiceData.customer.email, {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }
  
  if (invoiceData.customer.phone) {
    page.drawText(invoiceData.customer.phone, {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }
  
  if (invoiceData.customer.taxId) {
    page.drawText(`Tax ID: ${invoiceData.customer.taxId}`, {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
  }
  
  // Items Table
  yPosition = 530;
  
  // Table Header with custom color
  page.drawRectangle({
    x: leftMargin,
    y: yPosition - 5,
    width: rightMargin - leftMargin,
    height: 25,
    color: highlightRgb,
  });
  
  page.drawText("Description", {
    x: leftMargin + 5,
    y: yPosition + 5,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  page.drawText("Qty", {
    x: leftMargin + 250,
    y: yPosition + 5,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  page.drawText("Unit Price", {
    x: leftMargin + 300,
    y: yPosition + 5,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  page.drawText("Total", {
    x: leftMargin + 400,
    y: yPosition + 5,
    size: 10,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  yPosition -= 30;
  
  // Table Items
  for (const item of invoiceData.items) {
    let description = item.description;
    if (item.itemCode) {
      description = `[${item.itemCode}] ${description}`;
    }
    
    page.drawText(description, {
      x: leftMargin + 5,
      y: yPosition,
      size: 9,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    if (item.notes) {
      page.drawText(item.notes, {
        x: leftMargin + 5,
        y: yPosition - 12,
        size: 8,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    
    page.drawText(item.quantity.toString(), {
      x: leftMargin + 250,
      y: yPosition,
      size: 9,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`${invoiceData.currency} ${item.unitPrice.toFixed(2)}`, {
      x: leftMargin + 300,
      y: yPosition,
      size: 9,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`${invoiceData.currency} ${item.lineTotal.toFixed(2)}`, {
      x: leftMargin + 400,
      y: yPosition,
      size: 9,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= item.notes ? 35 : 25;
  }
  
  // Totals Section
  yPosition -= 20;
  const totalsX = leftMargin + 350;
  
  page.drawText("Subtotal:", {
    x: totalsX,
    y: yPosition,
    size: 10,
    font: regularFont,
    color: rgb(0, 0, 0),
  });
  
  page.drawText(`${invoiceData.currency} ${invoiceData.subtotal.toFixed(2)}`, {
    x: totalsX + 80,
    y: yPosition,
    size: 10,
    font: regularFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 15;
  
  if (invoiceData.discountAmount > 0) {
    const discountText = invoiceData.discountPercentage > 0 
      ? `Discount (${invoiceData.discountPercentage}%):`
      : "Discount:";
    
    page.drawText(discountText, {
      x: totalsX,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`-${invoiceData.currency} ${invoiceData.discountAmount.toFixed(2)}`, {
      x: totalsX + 80,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: rgb(0.7, 0, 0),
    });
    yPosition -= 15;
  }
  
  if (invoiceData.taxAmount > 0) {
    page.drawText(`Tax (${invoiceData.taxRate}%):`, {
      x: totalsX,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    page.drawText(`${invoiceData.currency} ${invoiceData.taxAmount.toFixed(2)}`, {
      x: totalsX + 80,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;
  }
  
  // Total (highlighted with custom color)
  page.drawRectangle({
    x: totalsX - 5,
    y: yPosition - 5,
    width: 150,
    height: 20,
    color: highlightRgb,
  });
  
  page.drawText("TOTAL:", {
    x: totalsX,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  page.drawText(`${invoiceData.currency} ${invoiceData.total.toFixed(2)}`, {
    x: totalsX + 80,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  // Payment Terms and Notes
  yPosition -= 40;
  
  if (invoiceData.paymentTerms) {
    page.drawText("Payment Terms:", {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: highlightRgb,
    });
    
    page.drawText(invoiceData.paymentTerms, {
      x: leftMargin + 100,
      y: yPosition,
      size: 10,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 15;
  }
  
  if (invoiceData.notes) {
    page.drawText("Notes:", {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: highlightRgb,
    });
    yPosition -= 15;
    
    page.drawText(invoiceData.notes, {
      x: leftMargin,
      y: yPosition,
      size: 9,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
  }
  
  // Footer with business info
  if (businessSettings?.paymentMethods || businessSettings?.bankAccount) {
    yPosition = 80;
    
    page.drawText("Payment Information:", {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: boldFont,
      color: highlightRgb,
    });
    yPosition -= 15;
    
    if (businessSettings.paymentMethods) {
      page.drawText(`Methods: ${businessSettings.paymentMethods}`, {
        x: leftMargin,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 12;
    }
    
    if (businessSettings.bankAccount) {
      page.drawText(`Bank: ${businessSettings.bankAccount}`, {
        x: leftMargin,
        y: yPosition,
        size: 9,
        font: regularFont,
        color: rgb(0, 0, 0),
      });
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

export async function renderTemplateToPDF(_templateHTML: string, _data: Record<string, unknown>): Promise<Uint8Array> {
  // This function can be expanded to render HTML templates to PDF
  // For now, it will just return an empty PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size

  page.drawText("Template Rendering Not Implemented", {
    x: 50,
    y: 400,
    size: 12,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

async function generateProfessionalPDF(
  invoiceData: InvoiceWithDetails, 
  businessSettings?: BusinessSettings,
  highlightRgb?: ReturnType<typeof rgb>
): Promise<Uint8Array> {
  const highlight = highlightRgb || rgb(0.15, 0.39, 0.92);

  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const margins = createMargins();
  const contentWidth = margins.right - margins.left;
  // Placeholder page will be created by newPage(ctx) immediately after
  const ctx: DrawContext = { pdfDoc, page: undefined as unknown as PDFPage, regularFont, boldFont, highlight, margins, cursorY: 0, contentWidth };
  newPage(ctx);

  // Header band
  const headerHeight = 48;
  ctx.page.drawRectangle({ x: 0, y: A4.height - headerHeight, width: A4.width, height: headerHeight, color: highlight });
  ctx.page.drawText(businessSettings?.companyName ?? "", { x: margins.left, y: A4.height - headerHeight + 16, size: 18, font: boldFont, color: rgb(1, 1, 1) });
  ctx.page.drawText("INVOICE", { x: margins.right - 100, y: A4.height - headerHeight + 16, size: 20, font: boldFont, color: rgb(1, 1, 1) });

  ctx.cursorY = margins.top - 24;

  // Meta box (right)
  const boxW = 180, boxH = 70, boxX = margins.right - boxW, boxY = ctx.cursorY - boxH + 16;
  ctx.page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, color: rgb(0.95, 0.95, 0.95), borderColor: highlight, borderWidth: 2 });
  ctx.page.drawText(`Invoice #: ${invoiceData.invoiceNumber}`, { x: boxX + 10, y: boxY + boxH - 18, size: 10, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
  ctx.page.drawText(`Date: ${new Date(invoiceData.issueDate).toLocaleDateString()}`, { x: boxX + 10, y: boxY + boxH - 34, size: 9, font: regularFont, color: rgb(0.1, 0.1, 0.1) });
  if (invoiceData.dueDate) {
    ctx.page.drawText(`Due: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, { x: boxX + 10, y: boxY + boxH - 50, size: 9, font: regularFont, color: rgb(0.1, 0.1, 0.1) });
  }

  // Bill to
  ctx.cursorY -= 20;
  ctx.page.drawText("BILL TO:", { x: margins.left, y: ctx.cursorY, size: 11, font: boldFont, color: highlight });
  ctx.cursorY -= 16;
  ctx.page.drawText(invoiceData.customer.name, { x: margins.left, y: ctx.cursorY, size: 12, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
  ctx.cursorY -= 14;
  if (invoiceData.customer.address) {
    const lines = wrapText(invoiceData.customer.address, regularFont, 9, contentWidth * 0.45);
    for (const line of lines) { ctx.page.drawText(line, { x: margins.left, y: ctx.cursorY, size: 9, font: regularFont, color: rgb(0.2,0.2,0.2) }); ctx.cursorY -= 12; }
  }

  ctx.cursorY -= 10;
  drawDivider(ctx);

  // Table
  const cols = [
    { title: "Description", x: margins.left + 6 },
    { title: "Qty", x: margins.left + contentWidth * 0.60 },
    { title: "Rate", x: margins.left + contentWidth * 0.70 },
    { title: "Amount", x: margins.left + contentWidth * 0.83 },
  ];
  drawTableHeader(ctx, cols, highlight);

  let row = 0;
  for (const item of invoiceData.items) {
    const alt = row % 2 === 1 ? rgb(0.98, 0.98, 0.98) : undefined;
    const desc = item.itemCode ? `[${item.itemCode}] ${item.description}` : item.description;
    const descLines = wrapText(desc + (item.notes ? `\n${item.notes}` : ""), regularFont, 9, contentWidth * 0.55);
    const rowHeight = Math.max(18, 12 * descLines.length);
    ensureSpace(ctx, rowHeight + 6);
    if (alt) ctx.page.drawRectangle({ x: margins.left, y: ctx.cursorY - 3, width: contentWidth, height: rowHeight, color: alt });
    // Draw multi-line description
    let dy = 0;
    for (const line of descLines) {
      ctx.page.drawText(line, { x: margins.left + 6, y: ctx.cursorY - dy, size: 9, font: regularFont, color: rgb(0.1,0.1,0.1) });
      dy += 12;
    }
    // Other cells
    ctx.page.drawText(String(item.quantity), { x: margins.left + contentWidth * 0.60, y: ctx.cursorY, size: 9, font: regularFont, color: rgb(0.2,0.2,0.2) });
    ctx.page.drawText(formatMoney(invoiceData.currency, item.unitPrice), { x: margins.left + contentWidth * 0.70, y: ctx.cursorY, size: 9, font: regularFont, color: rgb(0.2,0.2,0.2) });
    ctx.page.drawText(formatMoney(invoiceData.currency, item.lineTotal), { x: margins.left + contentWidth * 0.83, y: ctx.cursorY, size: 9, font: boldFont, color: rgb(0.1,0.1,0.1) });
    ctx.cursorY -= rowHeight;
    row++;
  }

  ctx.cursorY -= 8;
  drawDivider(ctx);

  // Totals
  const totalsX = margins.left + contentWidth * 0.62;
  const line = (label: string, value: string, bold = false) => {
    ensureSpace(ctx, 14);
    ctx.page.drawText(label, { x: totalsX, y: ctx.cursorY, size: 10, font: bold ? boldFont : regularFont, color: rgb(0.15,0.15,0.15) });
    ctx.page.drawText(value, { x: totalsX + 120, y: ctx.cursorY, size: 10, font: bold ? boldFont : regularFont, color: rgb(0.15,0.15,0.15) });
    ctx.cursorY -= 14;
  };
  line("Subtotal:", formatMoney(invoiceData.currency, invoiceData.subtotal));
  if (invoiceData.discountAmount > 0) line("Discount:", `-${formatMoney(invoiceData.currency, invoiceData.discountAmount)}`);
  if (invoiceData.taxAmount > 0) line(`Tax (${invoiceData.taxRate}%):`, formatMoney(invoiceData.currency, invoiceData.taxAmount));

  ensureSpace(ctx, 26);
  // Total band
  ctx.page.drawRectangle({ x: totalsX - 8, y: ctx.cursorY - 4, width: 170, height: 22, color: highlight });
  ctx.page.drawText("TOTAL:", { x: totalsX - 2, y: ctx.cursorY, size: 12, font: boldFont, color: rgb(1,1,1) });
  ctx.page.drawText(formatMoney(invoiceData.currency, invoiceData.total), { x: totalsX + 85, y: ctx.cursorY, size: 12, font: boldFont, color: rgb(1,1,1) });
  ctx.cursorY -= 30;

  // Footer payment details
  if (businessSettings?.paymentMethods || businessSettings?.bankAccount) {
    ensureSpace(ctx, 40);
    ctx.page.drawText("Payment Information", { x: margins.left, y: ctx.cursorY, size: 10, font: boldFont, color: highlight });
    ctx.cursorY -= 14;
    if (businessSettings.paymentMethods) {
      const lines = wrapText(`Methods: ${businessSettings.paymentMethods}`, regularFont, 9, contentWidth);
      for (const l of lines) { ctx.page.drawText(l, { x: margins.left, y: ctx.cursorY, size: 9, font: regularFont, color: rgb(0.2,0.2,0.2) }); ctx.cursorY -= 12; }
    }
    if (businessSettings.bankAccount) {
      const lines = wrapText(`Bank: ${businessSettings.bankAccount}`, regularFont, 9, contentWidth);
      for (const l of lines) { ctx.page.drawText(l, { x: margins.left, y: ctx.cursorY, size: 9, font: regularFont, color: rgb(0.2,0.2,0.2) }); ctx.cursorY -= 12; }
    }
  }

  return await pdfDoc.save();
}

async function generateMinimalistPDF(
  invoiceData: InvoiceWithDetails, 
  businessSettings?: BusinessSettings,
  highlightRgb?: ReturnType<typeof rgb>
): Promise<Uint8Array> {
  const highlight = highlightRgb || rgb(0.05, 0.59, 0.41);

  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const margins = createMargins();
  const contentWidth = margins.right - margins.left;
  const ctx: DrawContext = { pdfDoc, page: undefined as unknown as PDFPage, regularFont, boldFont, highlight, margins, cursorY: 0, contentWidth };
  newPage(ctx);

  // Minimal header: company on left, title on right
  if (businessSettings?.companyName) {
    ctx.page.drawText(businessSettings.companyName, { x: margins.left, y: ctx.cursorY, size: 16, font: regularFont, color: highlight });
  }
  ctx.page.drawText("INVOICE", { x: margins.right - 140, y: ctx.cursorY, size: 28, font: regularFont, color: rgb(0.2,0.2,0.2) });
  ctx.cursorY -= 28;

  // Invoice number and dates
  ctx.page.drawText(`#${invoiceData.invoiceNumber}`, { x: margins.right - 140, y: ctx.cursorY, size: 12, font: regularFont, color: rgb(0.45,0.45,0.45) });
  ctx.cursorY -= 18;
  drawDivider(ctx);
  drawLabelValue(ctx, "Issue Date:", new Date(invoiceData.issueDate).toLocaleDateString(), margins.left, 9, 70, rgb(0.4,0.4,0.4));
  if (invoiceData.dueDate) {
    drawLabelValue(ctx, "Due Date:", new Date(invoiceData.dueDate).toLocaleDateString(), margins.left, 9, 70, rgb(0.4,0.4,0.4));
  }

  // Customer
  ctx.cursorY -= 4;
  ctx.page.drawText("BILLED TO", { x: margins.left, y: ctx.cursorY, size: 9, font: regularFont, color: highlight });
  ctx.cursorY -= 14;
  ctx.page.drawText(invoiceData.customer.name, { x: margins.left, y: ctx.cursorY, size: 12, font: regularFont, color: rgb(0.2,0.2,0.2) });
  ctx.cursorY -= 14;
  const details: string[] = [];
  if (invoiceData.customer.email) details.push(invoiceData.customer.email);
  if (invoiceData.customer.phone) details.push(invoiceData.customer.phone);
  if (invoiceData.customer.address) details.push(invoiceData.customer.address);
  const dLines = wrapText(details.join(" • "), regularFont, 9, contentWidth * 0.7);
  for (const l of dLines) { ctx.page.drawText(l, { x: margins.left, y: ctx.cursorY, size: 9, font: regularFont, color: rgb(0.45,0.45,0.45) }); ctx.cursorY -= 12; }

  ctx.cursorY -= 6;
  drawDivider(ctx);

  // Items header (no fill, minimalist)
  drawTableHeader(ctx, [
    { title: "Description", x: margins.left },
    { title: "Qty", x: margins.left + contentWidth * 0.62 },
    { title: "Rate", x: margins.left + contentWidth * 0.72 },
    { title: "Amount", x: margins.left + contentWidth * 0.85 },
  ], undefined);

  for (const item of invoiceData.items) {
    const desc = item.description + (item.notes ? `\n${item.notes}` : "");
    const descLines = wrapText(desc, regularFont, 9, contentWidth * 0.58);
    const rowHeight = Math.max(18, 12 * descLines.length);
    ensureSpace(ctx, rowHeight + 4);
    // Description multi-line
    let dy = 0;
    for (const line of descLines) {
      ctx.page.drawText(line, { x: margins.left, y: ctx.cursorY - dy, size: 9, font: regularFont, color: rgb(0.2,0.2,0.2) });
      dy += 12;
    }
    // Numbers
    ctx.page.drawText(String(item.quantity), { x: margins.left + contentWidth * 0.62, y: ctx.cursorY, size: 9, font: regularFont, color: rgb(0.4,0.4,0.4) });
    ctx.page.drawText(formatMoney(invoiceData.currency, item.unitPrice), { x: margins.left + contentWidth * 0.72, y: ctx.cursorY, size: 9, font: regularFont, color: rgb(0.4,0.4,0.4) });
    ctx.page.drawText(formatMoney(invoiceData.currency, item.lineTotal), { x: margins.left + contentWidth * 0.85, y: ctx.cursorY, size: 9, font: regularFont, color: rgb(0.2,0.2,0.2) });
    ctx.cursorY -= rowHeight + 6;
  }

  // Totals
  ctx.cursorY -= 4;
  const totalsX = margins.left + contentWidth * 0.68;
  ctx.page.drawLine({ start: { x: totalsX, y: ctx.cursorY + 10 }, end: { x: margins.right, y: ctx.cursorY + 10 }, thickness: 0.5, color: rgb(0.8,0.8,0.8) });
  ctx.page.drawText("Subtotal", { x: totalsX, y: ctx.cursorY, size: 10, font: regularFont, color: rgb(0.45,0.45,0.45) });
  ctx.page.drawText(formatMoney(invoiceData.currency, invoiceData.subtotal), { x: totalsX + 90, y: ctx.cursorY, size: 10, font: regularFont, color: rgb(0.45,0.45,0.45) });
  ctx.cursorY -= 16;
  if (invoiceData.taxAmount > 0) {
    ctx.page.drawText(`Tax (${invoiceData.taxRate}%)`, { x: totalsX, y: ctx.cursorY, size: 10, font: regularFont, color: rgb(0.45,0.45,0.45) });
    ctx.page.drawText(formatMoney(invoiceData.currency, invoiceData.taxAmount), { x: totalsX + 90, y: ctx.cursorY, size: 10, font: regularFont, color: rgb(0.45,0.45,0.45) });
    ctx.cursorY -= 18;
  }
  ctx.page.drawLine({ start: { x: totalsX, y: ctx.cursorY + 10 }, end: { x: margins.right, y: ctx.cursorY + 10 }, thickness: 1, color: highlight });
  ctx.page.drawText("Total", { x: totalsX, y: ctx.cursorY, size: 14, font: regularFont, color: highlight });
  ctx.page.drawText(formatMoney(invoiceData.currency, invoiceData.total), { x: totalsX + 90, y: ctx.cursorY, size: 14, font: regularFont, color: highlight });
  ctx.cursorY -= 26;

  return await pdfDoc.save();
}

// Alias for backward compatibility
export const generatePDF = generateInvoicePDF;
