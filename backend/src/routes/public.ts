import { Hono } from "hono";
import { getInvoiceByShareToken } from "../controllers/invoices.ts";
import { getSettings } from "../controllers/settings.ts";
import { generatePDF, buildInvoiceHTML } from "../utils/pdf.ts";

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

  // Settings map
  const settings = getSettings();
  const settingsMap = settings.reduce((acc: Record<string, string>, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);

  // Construct BusinessSettings with sane defaults; support logoUrl fallback
  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
    currency: settingsMap.currency || "USD",
    logo: settingsMap.logo || settingsMap.logoUrl,
  // pass-through layout controls
  brandLayout: settingsMap.brandLayout,
    paymentMethods: settingsMap.paymentMethods || "Bank Transfer",
    bankAccount: settingsMap.bankAccount || "",
    paymentTerms: settingsMap.paymentTerms || "Due in 30 days",
    defaultNotes: settingsMap.defaultNotes || "",
  };

  // Template/highlight from query
  const queryTemplate = c.req.query("template") ?? c.req.query("templateId") ?? undefined;
  const highlight = c.req.query("highlight") ?? undefined;
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

// Return invoice as HTML (same options as PDF, but no PDF generation)
publicRoutes.get("/public/invoices/:share_token/html", async (c) => {
  const shareToken = c.req.param("share_token");
  const invoice = await getInvoiceByShareToken(shareToken);
  if (!invoice) {
    return c.json({ message: "Invoice not found" }, 404);
  }

  const settings = getSettings();
  const settingsMap = settings.reduce((acc: Record<string, string>, s) => { acc[s.key] = s.value; return acc; }, {} as Record<string, string>);

  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
    currency: settingsMap.currency || "USD",
    logo: settingsMap.logo || settingsMap.logoUrl,
    brandLayout: settingsMap.brandLayout,
    paymentMethods: settingsMap.paymentMethods || "Bank Transfer",
    bankAccount: settingsMap.bankAccount || "",
    paymentTerms: settingsMap.paymentTerms || "Due in 30 days",
    defaultNotes: settingsMap.defaultNotes || "",
  };

  const queryTemplate = c.req.query("template") ?? c.req.query("templateId") ?? undefined;
  const highlight = c.req.query("highlight") ?? undefined;
  let selectedTemplateId: string | undefined = queryTemplate?.toLowerCase();
  if (selectedTemplateId === "professional" || selectedTemplateId === "professional-modern") selectedTemplateId = "professional-modern";
  else if (selectedTemplateId === "minimalist" || selectedTemplateId === "minimalist-clean") selectedTemplateId = "minimalist-clean";

  const html = buildInvoiceHTML(invoice, businessSettings, selectedTemplateId, highlight);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});

export { publicRoutes };