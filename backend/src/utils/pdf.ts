import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
// Use Puppeteer (headless Chrome) for HTML -> PDF rendering instead of wkhtmltopdf
import puppeteer from "puppeteer-core";
import { generateInvoiceXML } from "./xmlProfiles.ts";
import {
  BusinessSettings,
  InvoiceWithDetails,
  TemplateContext,
} from "../types/index.ts";
import {
  getTemplateById,
  renderTemplate as renderTpl,
} from "../controllers/templates.ts";
// pdf-lib fallback remains available for environments without wkhtmltopdf

// ---- Basic color helpers ----
function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return rgb(0.15, 0.39, 0.92); // Default blue
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  return rgb(r, g, b);
}

function normalizeHex(hex?: string): string | undefined {
  if (!hex) return undefined;
  const h = hex.trim();
  if (/^#?[0-9a-fA-F]{6}$/.test(h)) return h.startsWith("#") ? h : `#${h}`;
  return undefined;
}

function lighten(hex: string, amount = 0.85): string {
  const n = normalizeHex(hex) ?? "#2563eb";
  const m = n.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const rr = mix(r).toString(16).padStart(2, "0");
  const gg = mix(g).toString(16).padStart(2, "0");
  const bb = mix(b).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}`;
}

function formatDate(d?: Date, format: string = "YYYY-MM-DD") {
  if (!d) return undefined;
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  if (format === "DD.MM.YYYY") {
    return `${day}.${month}.${year}`;
  }
  // Default to YYYY-MM-DD
  return `${year}-${month}-${day}`;
}

function toMoney(n: number): string {
  return n.toFixed(2);
}

// Support a single stored 'logo' setting; 'logoUrl' here is a derived, inlined data URL for rendering robustness
type WithLogo = BusinessSettings & {
  logo?: string;
  logoUrl?: string;
  brandLayout?: string;
};

// ---- pdf-lib helper primitives (used by fallback/professional/minimalist fallbacks) ----
const A4 = { width: 595, height: 842 };

type Margins = { left: number; right: number; top: number; bottom: number };
type DrawContext = {
  pdfDoc: PDFDocument;
  page: PDFPage;
  regularFont: PDFFont;
  boldFont: PDFFont;
  highlight: ReturnType<typeof rgb>;
  margins: Margins;
  cursorY: number;
  contentWidth: number;
};

function createMargins(): Margins {
  const left = 50;
  const right = A4.width - 50;
  const top = A4.height - 50;
  const bottom = 50;
  return { left, right, top, bottom };
}

function newPage(ctx: DrawContext) {
  const page = ctx.pdfDoc.addPage([A4.width, A4.height]);
  ctx.page = page;
  ctx.cursorY = createMargins().top;
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  const paragraphs = String(text ?? "").split(/\r?\n/);
  for (const p of paragraphs) {
    const words = p.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      const width = font.widthOfTextAtSize(test, fontSize);
      if (width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

function drawDivider(ctx: DrawContext) {
  ctx.page.drawLine({
    start: { x: ctx.margins.left, y: ctx.cursorY },
    end: { x: ctx.margins.right, y: ctx.cursorY },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  });
  ctx.cursorY -= 8;
}

function ensureSpace(ctx: DrawContext, neededHeight: number) {
  if (ctx.cursorY - neededHeight < ctx.margins.bottom) {
    newPage(ctx);
    ctx.cursorY -= 20;
  }
}

function drawTableHeader(
  ctx: DrawContext,
  cols: Array<{ title: string; x: number }>,
  fill?: ReturnType<typeof rgb>,
) {
  const y = ctx.cursorY;
  const h = 18;
  if (fill) {
    ctx.page.drawRectangle({
      x: ctx.margins.left,
      y: y - 4,
      width: ctx.contentWidth,
      height: h,
      color: fill,
    });
  }
  for (const c of cols) {
    ctx.page.drawText(c.title, {
      x: c.x + 2,
      y,
      size: 10,
      font: ctx.boldFont,
      color: fill ? rgb(1, 1, 1) : rgb(0.3, 0.3, 0.3),
    });
  }
  ctx.cursorY -= h + 6;
}

function drawLabelValue(
  ctx: DrawContext,
  label: string,
  value: string,
  x: number,
  size = 9,
  labelWidth = 70,
  color = rgb(0.4, 0.4, 0.4),
) {
  ensureSpace(ctx, 14);
  ctx.page.drawText(label, {
    x,
    y: ctx.cursorY,
    size,
    font: ctx.regularFont,
    color,
  });
  ctx.page.drawText(value, {
    x: x + labelWidth,
    y: ctx.cursorY,
    size,
    font: ctx.regularFont,
    color: rgb(0.15, 0.15, 0.15),
  });
  ctx.cursorY -= 14;
}

function formatMoney(code: string, amount: number): string {
  return `${code} ${amount.toFixed(2)}`;
}

async function inlineLogoIfPossible(
  settings?: BusinessSettings,
): Promise<BusinessSettings | undefined> {
  if (!settings?.logo) return settings;
  const url = settings.logo.trim();
  if (url.startsWith("data:")) {
    return { ...settings, logoUrl: url } as unknown as BusinessSettings;
  }

  const toDataUrl = (bytes: Uint8Array, mime = "image/png") => {
    const base64 = btoa(String.fromCharCode(...bytes));
    return `data:${mime};base64,${base64}`;
  };

  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const res = await fetch(url);
      if (!res.ok) return settings;
      const buf = new Uint8Array(await res.arrayBuffer());
      const mime = res.headers.get("content-type") ?? "image/png";
      return {
        ...settings,
        logoUrl: toDataUrl(buf, mime),
      } as unknown as BusinessSettings;
    }
    // Attempt local file read
    const file = await Deno.readFile(url);
    let mime = "image/png";
    if (url.endsWith(".jpg") || url.endsWith(".jpeg")) mime = "image/jpeg";
    if (url.endsWith(".svg")) mime = "image/svg+xml";
    return {
      ...settings,
      logoUrl: toDataUrl(file, mime),
    } as unknown as BusinessSettings;
  } catch (_e) {
    return settings; // keep original
  }
}

function buildContext(
  invoice: InvoiceWithDetails,
  settings?: BusinessSettings & { logoUrl?: string; brandLayout?: string },
  _highlight?: string,
  dateFormat?: string,
): TemplateContext & { logoUrl?: string; brandLogoLeft?: boolean } {
  const currency = invoice.currency || settings?.currency || "USD";
  // Build tax summary from normalized taxes if present
  let taxSummary = (invoice.taxes && invoice.taxes.length > 0)
    ? invoice.taxes.map((t) => ({
      label: `VAT ${t.percent}%`,
      percent: t.percent,
      taxable: toMoney(t.taxableAmount),
      amount: toMoney(t.taxAmount),
    }))
    : undefined;
  // Fallback: synthesize a single-row summary from invoice-level taxRate
  if ((!taxSummary || taxSummary.length === 0) && (invoice.taxAmount > 0)) {
    const percent = invoice.taxRate || 0;
    const taxableBase = Math.max(
      0,
      (invoice.subtotal || 0) - (invoice.discountAmount || 0),
    );
    taxSummary = [{
      label: `VAT ${percent}%`,
      percent,
      taxable: toMoney(taxableBase),
      amount: toMoney(invoice.taxAmount),
    }];
  }
  return {
    // Company
    companyName: settings?.companyName || "Your Company",
    companyAddress: settings?.companyAddress || "",
    companyEmail: settings?.companyEmail || "",
    companyPhone: settings?.companyPhone || "",
    companyTaxId: settings?.companyTaxId || "",

    // Invoice
    invoiceNumber: invoice.invoiceNumber,
    issueDate: formatDate(invoice.issueDate, dateFormat)!,
    dueDate: formatDate(invoice.dueDate, dateFormat),
    currency,
    status: invoice.status,

    // Customer
    customerName: invoice.customer.name,
    customerEmail: invoice.customer.email,
    customerPhone: invoice.customer.phone,
    customerAddress: invoice.customer.address,
    customerTaxId: invoice.customer.taxId,

    // Items
    items: invoice.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: toMoney(i.unitPrice),
      lineTotal: toMoney(i.lineTotal),
      notes: i.notes,
    })),

    // Totals
    subtotal: toMoney(invoice.subtotal),
    discountAmount: invoice.discountAmount > 0
      ? toMoney(invoice.discountAmount)
      : undefined,
    discountPercentage: invoice.discountPercentage || undefined,
    taxRate: invoice.taxRate || undefined,
    taxAmount: invoice.taxAmount > 0 ? toMoney(invoice.taxAmount) : undefined,
    total: toMoney(invoice.total),
    taxSummary,
    hasTaxSummary: Boolean(taxSummary && taxSummary.length > 0),
    // Net subtotal (taxable base after discount, before tax) for convenience
    netSubtotal: toMoney(
      Math.max(0, (invoice.subtotal || 0) - (invoice.discountAmount || 0)),
    ),

    // Flags
    hasDiscount: invoice.discountAmount > 0,
    hasTax: invoice.taxAmount > 0,

    // Payment
    paymentTerms: invoice.paymentTerms || settings?.paymentTerms || undefined,
    paymentMethods: settings?.paymentMethods || undefined,
    bankAccount: settings?.bankAccount || undefined,

    // Notes
    notes: invoice.notes || settings?.defaultNotes || undefined,

    // Non-mustache extras consumed by templates
    // Prefer inlined data URL if available; otherwise pass through the provided logo value
    logoUrl: (settings as WithLogo | undefined)?.logoUrl ||
      (settings as WithLogo | undefined)?.logo,
    // Permanently use logo-left layout
    brandLogoLeft: true,
  } as TemplateContext & { logoUrl?: string; brandLogoLeft?: boolean };
}

export async function generateInvoicePDF(
  invoiceData: InvoiceWithDetails,
  businessSettings?: BusinessSettings,
  templateId?: string,
  customHighlightColor?: string,
  opts?: { embedXmlProfileId?: string; embedXml?: boolean; xmlOptions?: Record<string, unknown>; dateFormat?: string },
): Promise<Uint8Array> {
  // Inline remote logo when possible for robust HTML rendering
  const inlined = await inlineLogoIfPossible(businessSettings);
  const html = buildInvoiceHTML(
    invoiceData,
    inlined,
    templateId,
    customHighlightColor,
    opts?.dateFormat,
  );
  // First, attempt Puppeteer-based rendering
  let pdfBytes = await tryPuppeteerPdf(html);
  // Fallback to pdf-lib rendered styles if browser rendering fails
  if (!pdfBytes) {
    pdfBytes = await generateStyledPDF(
      invoiceData,
      inlined,
      customHighlightColor,
      templateId,
      opts?.dateFormat || "YYYY-MM-DD",
    );
  }

  // Optionally embed XML profile as an attachment if requested and we have a PDF (browser or fallback)
  if (pdfBytes && opts?.embedXml) {
    try {
      const profileId = opts.embedXmlProfileId || "ubl21";
      const { xml, profile } = generateInvoiceXML(profileId, invoiceData, inlined || ({} as BusinessSettings));
      const fileName = `invoice-${invoiceData.invoiceNumber || invoiceData.id}.${profile.fileExtension}`;
      const viaPdfcpu = await tryPdfcpuAttach(pdfBytes, new TextEncoder().encode(xml), fileName);
      if (viaPdfcpu) {
        pdfBytes = viaPdfcpu;
      } else {
        // Fallback: embed using pdf-lib attach API
        const pdfDoc = await PDFDocument.load(pdfBytes);
        await pdfDoc.attach(xml, fileName, {
          mimeType: profile.mediaType || "application/xml",
          description: `${profile.name} export embedded by Invio`,
          creationDate: new Date(),
          modificationDate: new Date(),
        });
        pdfBytes = await pdfDoc.save();
      }
      // Ensure visible metadata hints via standard Info fields
      try {
        const doc2 = await PDFDocument.load(pdfBytes);
        doc2.setSubject(`Embedded XML: ${fileName}`);
        doc2.setKeywords(["Invoice", "Embedded XML", fileName]);
        pdfBytes = await doc2.save();
      } catch { /* ignore */ }
    } catch (_e) {
      // Silently ignore embedding failures to avoid breaking download
    }
  }
  return pdfBytes as Uint8Array;
}

async function tryPdfcpuAttach(
  pdfBytes: Uint8Array,
  xmlBytes: Uint8Array,
  xmlFileName: string,
): Promise<Uint8Array | null> {
  try {
    // Write temp files
    const pdfPath = await Deno.makeTempFile({ prefix: "invio-", suffix: ".pdf" });
    const xmlPath = await Deno.makeTempFile({ prefix: "invio-", suffix: `-${xmlFileName}` });
    await Deno.writeFile(pdfPath, pdfBytes);
    await Deno.writeFile(xmlPath, xmlBytes);

    // Run pdfcpu attachments add in place
    const cmd = new Deno.Command("pdfcpu", {
      args: ["attachments", "add", pdfPath, xmlPath],
      stdout: "piped",
      stderr: "piped",
    });
    const { success, stderr } = await cmd.output();
    if (!success) {
      console.error("pdfcpu attach failed:", new TextDecoder().decode(stderr));
      try { await Deno.remove(pdfPath); } catch { /* ignore */ }
      try { await Deno.remove(xmlPath); } catch { /* ignore */ }
      return null;
    }
    // Add document properties so metadata visibly reflects the embedded XML
    try {
      const propCmd = new Deno.Command("pdfcpu", {
        args: [
          "properties",
          "add",
          pdfPath,
          `EmbeddedXML=true`,
          `EmbeddedXMLNames=${xmlFileName}`,
        ],
        stdout: "piped",
        stderr: "piped",
      });
      const propOut = await propCmd.output();
      if (!propOut.success) {
        console.warn(
          "pdfcpu properties add failed:",
          new TextDecoder().decode(propOut.stderr),
        );
      }
    } catch (e) {
      console.warn("pdfcpu properties add error:", e instanceof Error ? e.message : String(e));
    }
    const updated = await Deno.readFile(pdfPath);
    try { await Deno.remove(pdfPath); } catch { /* ignore */ }
    try { await Deno.remove(xmlPath); } catch { /* ignore */ }
    return updated;
  } catch (_e) {
    return null;
  }
}

export function buildInvoiceHTML(
  invoice: InvoiceWithDetails,
  settings?: BusinessSettings,
  templateId?: string,
  highlight?: string,
  dateFormat?: string,
): string {
  const ctx = buildContext(invoice, settings, highlight, dateFormat);
  const hl = normalizeHex(highlight) || "#2563eb";
  const hlLight = lighten(hl, 0.86);

  // If a specific template is requested and exists in DB, render it
  if (templateId) {
    try {
      const t = getTemplateById(templateId);
      if (t && t.html) {
        const html = renderTpl(t.html, {
          ...ctx,
          highlightColor: hl,
          highlightColorLight: hlLight,
        });
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
            
            <th>Description</th>
            <th style="width:60px;">Qty</th>
            <th style="width:90px;">Rate</th>
            <th style="width:110px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
    ctx.items.map((i) => `
            <tr>
              
              <td>
                <div class="desc">${i.description}</div>
                ${i.notes ? `<div class="notes">${i.notes}</div>` : ""}
              </td>
              <td>${i.quantity}</td>
              <td>${ctx.currency} ${i.unitPrice}</td>
              <td><strong>${ctx.currency} ${i.lineTotal}</strong></td>
            </tr>
          `).join("")
  }
        </tbody>
      </table>
      <div class="totals">
        <div class="row"><div>Subtotal:</div><div>${ctx.currency} ${ctx.subtotal}</div></div>
        ${
    ctx.hasDiscount
      ? `<div class="row"><div>Discount${
        ctx.discountPercentage ? ` (${ctx.discountPercentage}%)` : ""
      }:</div><div>-${ctx.currency} ${ctx.discountAmount}</div></div>`
      : ""
  }
        ${
    ctx.hasTax
      ? `<div class="row"><div>Tax (${ctx.taxRate}%):</div><div>${ctx.currency} ${ctx.taxAmount}</div></div>`
      : ""
  }
        <div class="row total"><div>Total:</div><div>${ctx.currency} ${ctx.total}</div></div>
      </div>
      <div class="payinfo">
        <h4>Payment Information</h4>
        ${
    ctx.paymentTerms ? `<p><strong>Terms:</strong> ${ctx.paymentTerms}</p>` : ""
  }
        ${
    ctx.paymentMethods
      ? `<p><strong>Methods:</strong> ${ctx.paymentMethods}</p>`
      : ""
  }
        ${
    ctx.bankAccount ? `<p><strong>Bank:</strong> ${ctx.bankAccount}</p>` : ""
  }
      </div>
    </div>
  </body>
  </html>`;

  // Default inline modern template when a DB template isn't specified or found.
  return baseHtml;
}

async function tryPuppeteerPdf(html: string): Promise<Uint8Array | null> {
  try {
    // Resolve Chrome executable path (env wins, otherwise common defaults)
    const envPath = Deno.env.get("PUPPETEER_EXECUTABLE_PATH");
    const candidates = [
      envPath,
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    ].filter((p): p is string => !!p);
    let executablePath: string | undefined = undefined;
    for (const p of candidates) {
      try {
        const info = await Deno.stat(p);
        if (info && info.isFile) {
          executablePath = p;
          break;
        }
      } catch (_) { /* not found */ }
    }

    const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--font-render-hinting=medium",
        "--disable-dev-shm-usage",
      ],
    };
    if (!executablePath) {
      // Provide a channel hint if executable path wasn't found
      (launchOptions as unknown as { channel?: string }).channel = "chrome";
    }
    const browser = await puppeteer.launch(launchOptions);
    try {
      const page = await browser.newPage();
      // Prefer CSS @page size in our HTML; use reasonable timeout for assets
      await page.setContent(html, { waitUntil: "networkidle0" });
      const buf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
      });
      return new Uint8Array(buf);
    } finally {
      await browser.close();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Puppeteer PDF render failed:", msg);
    return null;
  }
}

// Select a pdf-lib fallback style when wkhtmltopdf is unavailable
async function generateStyledPDF(
  invoiceData: InvoiceWithDetails,
  businessSettings?: BusinessSettings,
  customHighlightColor?: string,
  templateId?: string,
  dateFormat: string = "YYYY-MM-DD",
): Promise<Uint8Array> {
  const highlight = customHighlightColor
    ? hexToRgb(customHighlightColor)
    : undefined;
  const id = (templateId ?? "minimalist-clean").toLowerCase();
  if (id.includes("minimalist")) {
    return await generateMinimalistPDF(
      invoiceData,
      businessSettings,
      highlight,
      dateFormat,
    );
  }
  return await generateProfessionalPDF(
    invoiceData,
    businessSettings,
    highlight,
    dateFormat,
  );
}

export async function renderTemplateToPDF(
  _templateHTML: string,
  _data: Record<string, unknown>,
): Promise<Uint8Array> {
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
  highlightRgb?: ReturnType<typeof rgb>,
  dateFormat: string = "YYYY-MM-DD",
): Promise<Uint8Array> {
  const highlight = highlightRgb || rgb(0.15, 0.39, 0.92);

  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const margins = createMargins();
  const contentWidth = margins.right - margins.left;
  // Placeholder page will be created by newPage(ctx) immediately after
  const ctx: DrawContext = {
    pdfDoc,
    page: undefined as unknown as PDFPage,
    regularFont,
    boldFont,
    highlight,
    margins,
    cursorY: 0,
    contentWidth,
  };
  newPage(ctx);

  // Header band
  const headerHeight = 48;
  ctx.page.drawRectangle({
    x: 0,
    y: A4.height - headerHeight,
    width: A4.width,
    height: headerHeight,
    color: highlight,
  });
  ctx.page.drawText(businessSettings?.companyName ?? "", {
    x: margins.left,
    y: A4.height - headerHeight + 16,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  ctx.page.drawText("INVOICE", {
    x: margins.right - 100,
    y: A4.height - headerHeight + 16,
    size: 20,
    font: boldFont,
    color: rgb(1, 1, 1),
  });

  ctx.cursorY = margins.top - 24;

  // Meta box (right)
  const boxW = 180,
    boxH = 70,
    boxX = margins.right - boxW,
    boxY = ctx.cursorY - boxH + 16;
  ctx.page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    color: rgb(0.95, 0.95, 0.95),
    borderColor: highlight,
    borderWidth: 2,
  });
  ctx.page.drawText(`Invoice #: ${invoiceData.invoiceNumber}`, {
    x: boxX + 10,
    y: boxY + boxH - 18,
    size: 10,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  ctx.page.drawText(
    `Date: ${formatDate(invoiceData.issueDate, dateFormat)}`,
    {
      x: boxX + 10,
      y: boxY + boxH - 34,
      size: 9,
      font: regularFont,
      color: rgb(0.1, 0.1, 0.1),
    },
  );
  if (invoiceData.dueDate) {
    ctx.page.drawText(
      `Due: ${formatDate(invoiceData.dueDate, dateFormat)}`,
      {
        x: boxX + 10,
        y: boxY + boxH - 50,
        size: 9,
        font: regularFont,
        color: rgb(0.1, 0.1, 0.1),
      },
    );
  }

  // Bill to
  ctx.cursorY -= 20;
  ctx.page.drawText("BILL TO:", {
    x: margins.left,
    y: ctx.cursorY,
    size: 11,
    font: boldFont,
    color: highlight,
  });
  ctx.cursorY -= 16;
  ctx.page.drawText(invoiceData.customer.name, {
    x: margins.left,
    y: ctx.cursorY,
    size: 12,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  ctx.cursorY -= 14;
  if (invoiceData.customer.address) {
    const lines = wrapText(
      invoiceData.customer.address,
      regularFont,
      9,
      contentWidth * 0.45,
    );
    for (const line of lines) {
      ctx.page.drawText(line, {
        x: margins.left,
        y: ctx.cursorY,
        size: 9,
        font: regularFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      ctx.cursorY -= 12;
    }
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
    const desc = item.description;
    const descLines = wrapText(
      desc + (item.notes ? `\n${item.notes}` : ""),
      regularFont,
      9,
      contentWidth * 0.55,
    );
    const rowHeight = Math.max(18, 12 * descLines.length);
    ensureSpace(ctx, rowHeight + 6);
    if (alt) {
      ctx.page.drawRectangle({
        x: margins.left,
        y: ctx.cursorY - 3,
        width: contentWidth,
        height: rowHeight,
        color: alt,
      });
    }
    // Draw multi-line description
    let dy = 0;
    for (const line of descLines) {
      ctx.page.drawText(line, {
        x: margins.left + 6,
        y: ctx.cursorY - dy,
        size: 9,
        font: regularFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      dy += 12;
    }
    // Other cells
    ctx.page.drawText(String(item.quantity), {
      x: margins.left + contentWidth * 0.60,
      y: ctx.cursorY,
      size: 9,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    ctx.page.drawText(formatMoney(invoiceData.currency, item.unitPrice), {
      x: margins.left + contentWidth * 0.70,
      y: ctx.cursorY,
      size: 9,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    ctx.page.drawText(formatMoney(invoiceData.currency, item.lineTotal), {
      x: margins.left + contentWidth * 0.83,
      y: ctx.cursorY,
      size: 9,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    ctx.cursorY -= rowHeight;
    row++;
  }

  ctx.cursorY -= 8;
  drawDivider(ctx);

  // Totals
  const totalsX = margins.left + contentWidth * 0.62;
  const line = (label: string, value: string, bold = false) => {
    ensureSpace(ctx, 14);
    ctx.page.drawText(label, {
      x: totalsX,
      y: ctx.cursorY,
      size: 10,
      font: bold ? boldFont : regularFont,
      color: rgb(0.15, 0.15, 0.15),
    });
    ctx.page.drawText(value, {
      x: totalsX + 120,
      y: ctx.cursorY,
      size: 10,
      font: bold ? boldFont : regularFont,
      color: rgb(0.15, 0.15, 0.15),
    });
    ctx.cursorY -= 14;
  };
  line("Subtotal:", formatMoney(invoiceData.currency, invoiceData.subtotal));
  if (invoiceData.discountAmount > 0) {
    line(
      "Discount:",
      `-${formatMoney(invoiceData.currency, invoiceData.discountAmount)}`,
    );
  }
  if (invoiceData.taxAmount > 0) {
    line(
      `Tax (${invoiceData.taxRate}%):`,
      formatMoney(invoiceData.currency, invoiceData.taxAmount),
    );
  }

  ensureSpace(ctx, 26);
  // Total band
  ctx.page.drawRectangle({
    x: totalsX - 8,
    y: ctx.cursorY - 4,
    width: 170,
    height: 22,
    color: highlight,
  });
  ctx.page.drawText("TOTAL:", {
    x: totalsX - 2,
    y: ctx.cursorY,
    size: 12,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  ctx.page.drawText(formatMoney(invoiceData.currency, invoiceData.total), {
    x: totalsX + 85,
    y: ctx.cursorY,
    size: 12,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  ctx.cursorY -= 30;

  // Footer payment details
  if (businessSettings?.paymentMethods || businessSettings?.bankAccount) {
    ensureSpace(ctx, 40);
    ctx.page.drawText("Payment Information", {
      x: margins.left,
      y: ctx.cursorY,
      size: 10,
      font: boldFont,
      color: highlight,
    });
    ctx.cursorY -= 14;
    if (businessSettings.paymentMethods) {
      const lines = wrapText(
        `Methods: ${businessSettings.paymentMethods}`,
        regularFont,
        9,
        contentWidth,
      );
      for (const l of lines) {
        ctx.page.drawText(l, {
          x: margins.left,
          y: ctx.cursorY,
          size: 9,
          font: regularFont,
          color: rgb(0.2, 0.2, 0.2),
        });
        ctx.cursorY -= 12;
      }
    }
    if (businessSettings.bankAccount) {
      const lines = wrapText(
        `Bank: ${businessSettings.bankAccount}`,
        regularFont,
        9,
        contentWidth,
      );
      for (const l of lines) {
        ctx.page.drawText(l, {
          x: margins.left,
          y: ctx.cursorY,
          size: 9,
          font: regularFont,
          color: rgb(0.2, 0.2, 0.2),
        });
        ctx.cursorY -= 12;
      }
    }
  }

  return await pdfDoc.save();
}

async function generateMinimalistPDF(
  invoiceData: InvoiceWithDetails,
  businessSettings?: BusinessSettings,
  highlightRgb?: ReturnType<typeof rgb>,
  dateFormat: string = "YYYY-MM-DD",
): Promise<Uint8Array> {
  const highlight = highlightRgb || rgb(0.05, 0.59, 0.41);

  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const margins = createMargins();
  const contentWidth = margins.right - margins.left;
  const ctx: DrawContext = {
    pdfDoc,
    page: undefined as unknown as PDFPage,
    regularFont,
    boldFont,
    highlight,
    margins,
    cursorY: 0,
    contentWidth,
  };
  newPage(ctx);

  // Minimal header: company on left, title on right
  if (businessSettings?.companyName) {
    ctx.page.drawText(businessSettings.companyName, {
      x: margins.left,
      y: ctx.cursorY,
      size: 16,
      font: regularFont,
      color: highlight,
    });
  }
  ctx.page.drawText("INVOICE", {
    x: margins.right - 140,
    y: ctx.cursorY,
    size: 28,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  ctx.cursorY -= 28;

  // Invoice number and dates
  ctx.page.drawText(`#${invoiceData.invoiceNumber}`, {
    x: margins.right - 140,
    y: ctx.cursorY,
    size: 12,
    font: regularFont,
    color: rgb(0.45, 0.45, 0.45),
  });
  ctx.cursorY -= 18;
  drawDivider(ctx);
  drawLabelValue(
    ctx,
    "Issue Date:",
    formatDate(invoiceData.issueDate, dateFormat) || "",
    margins.left,
    9,
    70,
    rgb(0.4, 0.4, 0.4),
  );
  if (invoiceData.dueDate) {
    drawLabelValue(
      ctx,
      "Due Date:",
      formatDate(invoiceData.dueDate, dateFormat) || "",
      margins.left,
      9,
      70,
      rgb(0.4, 0.4, 0.4),
    );
  }

  // Customer
  ctx.cursorY -= 4;
  ctx.page.drawText("BILLED TO", {
    x: margins.left,
    y: ctx.cursorY,
    size: 9,
    font: regularFont,
    color: highlight,
  });
  ctx.cursorY -= 14;
  ctx.page.drawText(invoiceData.customer.name, {
    x: margins.left,
    y: ctx.cursorY,
    size: 12,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  ctx.cursorY -= 14;
  const details: string[] = [];
  if (invoiceData.customer.email) details.push(invoiceData.customer.email);
  if (invoiceData.customer.phone) details.push(invoiceData.customer.phone);
  if (invoiceData.customer.address) details.push(invoiceData.customer.address);
  const dLines = wrapText(
    details.join(" • "),
    regularFont,
    9,
    contentWidth * 0.7,
  );
  for (const l of dLines) {
    ctx.page.drawText(l, {
      x: margins.left,
      y: ctx.cursorY,
      size: 9,
      font: regularFont,
      color: rgb(0.45, 0.45, 0.45),
    });
    ctx.cursorY -= 12;
  }

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
      ctx.page.drawText(line, {
        x: margins.left,
        y: ctx.cursorY - dy,
        size: 9,
        font: regularFont,
        color: rgb(0.2, 0.2, 0.2),
      });
      dy += 12;
    }
    // Numbers
    ctx.page.drawText(String(item.quantity), {
      x: margins.left + contentWidth * 0.62,
      y: ctx.cursorY,
      size: 9,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    ctx.page.drawText(formatMoney(invoiceData.currency, item.unitPrice), {
      x: margins.left + contentWidth * 0.72,
      y: ctx.cursorY,
      size: 9,
      font: regularFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    ctx.page.drawText(formatMoney(invoiceData.currency, item.lineTotal), {
      x: margins.left + contentWidth * 0.85,
      y: ctx.cursorY,
      size: 9,
      font: regularFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    ctx.cursorY -= rowHeight + 6;
  }

  // Totals
  ctx.cursorY -= 4;
  const totalsX = margins.left + contentWidth * 0.68;
  ctx.page.drawLine({
    start: { x: totalsX, y: ctx.cursorY + 10 },
    end: { x: margins.right, y: ctx.cursorY + 10 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  ctx.page.drawText("Subtotal", {
    x: totalsX,
    y: ctx.cursorY,
    size: 10,
    font: regularFont,
    color: rgb(0.45, 0.45, 0.45),
  });
  ctx.page.drawText(formatMoney(invoiceData.currency, invoiceData.subtotal), {
    x: totalsX + 90,
    y: ctx.cursorY,
    size: 10,
    font: regularFont,
    color: rgb(0.45, 0.45, 0.45),
  });
  ctx.cursorY -= 16;
  if (invoiceData.taxAmount > 0) {
    ctx.page.drawText(`Tax (${invoiceData.taxRate}%)`, {
      x: totalsX,
      y: ctx.cursorY,
      size: 10,
      font: regularFont,
      color: rgb(0.45, 0.45, 0.45),
    });
    ctx.page.drawText(
      formatMoney(invoiceData.currency, invoiceData.taxAmount),
      {
        x: totalsX + 90,
        y: ctx.cursorY,
        size: 10,
        font: regularFont,
        color: rgb(0.45, 0.45, 0.45),
      },
    );
    ctx.cursorY -= 18;
  }
  ctx.page.drawLine({
    start: { x: totalsX, y: ctx.cursorY + 10 },
    end: { x: margins.right, y: ctx.cursorY + 10 },
    thickness: 1,
    color: highlight,
  });
  ctx.page.drawText("Total", {
    x: totalsX,
    y: ctx.cursorY,
    size: 14,
    font: regularFont,
    color: highlight,
  });
  ctx.page.drawText(formatMoney(invoiceData.currency, invoiceData.total), {
    x: totalsX + 90,
    y: ctx.cursorY,
    size: 14,
    font: regularFont,
    color: highlight,
  });
  ctx.cursorY -= 26;

  return await pdfDoc.save();
}

// Alias for backward compatibility
export const generatePDF = generateInvoicePDF;
