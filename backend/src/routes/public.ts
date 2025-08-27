import { Hono } from "hono";
import { getInvoiceByShareToken } from "../controllers/invoices.ts";
import { getSettings } from "../controllers/settings.ts";
import { generatePDF } from "../utils/pdf.ts";

const publicRoutes = new Hono();

publicRoutes.get("/public/invoices/:share_token", async (c) => {
  const shareToken = c.req.param("share_token");
  const invoice = await getInvoiceByShareToken(shareToken);
  
  if (!invoice) {
    return c.json({ message: "Invoice not found" }, 404);
  }

  return c.json(invoice);
});

publicRoutes.get("/public/invoices/:share_token/pdf", async (c) => {
  const shareToken = c.req.param("share_token");
  const invoice = await getInvoiceByShareToken(shareToken);
  
  if (!invoice) {
    return c.json({ message: "Invoice not found" }, 404);
  }

  // Get business settings for the PDF
  const settings = getSettings();
  const settingsMap = settings.reduce((acc: Record<string, string>, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});

  // Construct BusinessSettings with defaults
  const businessSettings = {
    companyName: settingsMap.companyName || 'Your Company',
    companyAddress: settingsMap.companyAddress || '',
    companyEmail: settingsMap.companyEmail || '',
    companyPhone: settingsMap.companyPhone || '',
    companyTaxId: settingsMap.companyTaxId || '',
    currency: settingsMap.currency || 'USD',
  // Prefer explicit logo, but fall back to legacy/new key 'logoUrl'
  logo: settingsMap.logo || settingsMap.logoUrl,
    paymentMethods: settingsMap.paymentMethods || 'Bank Transfer',
    bankAccount: settingsMap.bankAccount || '',
    paymentTerms: settingsMap.paymentTerms || 'Due in 30 days',
    defaultNotes: settingsMap.defaultNotes || ''
  };

  // Read optional template/highlight from query string
  const queryTemplate = c.req.query("templateId") ?? c.req.query("template") ?? undefined;
  const highlight = c.req.query("highlight") ?? undefined;

  // Normalize common short names to built-in IDs
  let selectedTemplateId: string | undefined = queryTemplate?.toLowerCase();
  if (selectedTemplateId === "professional" || selectedTemplateId === "professional-modern") {
    selectedTemplateId = "professional-modern";
  } else if (selectedTemplateId === "minimalist" || selectedTemplateId === "minimalist-clean") {
    selectedTemplateId = "minimalist-clean";
  }

  const pdfBuffer = await generatePDF(invoice, businessSettings, selectedTemplateId, highlight);
  
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber || shareToken}.pdf"`,
    },
  });
});

export { publicRoutes };