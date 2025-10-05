// @ts-nocheck: simplify handlers without explicit typings
import { Hono } from "hono";
import { getInvoiceByShareToken } from "../controllers/invoices.ts";
import { getSettings } from "../controllers/settings.ts";
import { buildInvoiceHTML, generatePDF } from "../utils/pdf.ts";
import { generateUBLInvoiceXML } from "../utils/ubl.ts"; // legacy direct import (will be removed after deprecation window)
import { generateInvoiceXML, listXMLProfiles } from "../utils/xmlProfiles.ts";

const publicRoutes = new Hono();

// Expose a lightweight public endpoint so unauthenticated clients can
// detect whether the backend is running in demo (read-only) mode.
const DEMO_MODE = (Deno.env.get("DEMO_MODE") || "").toLowerCase() === "true";
publicRoutes.get("/demo-mode", (c) => {
  return c.json({ demoMode: DEMO_MODE });
});

// Serve stored template files (fonts, html) for installed templates
publicRoutes.get("/_template-assets/:id/:version/*", async (c) => {
  const { id, version } = c.req.param();
  const rest = c.req.param("*");
  const path = `./data/templates/${id}/${version}/${rest}`;
  try {
    const bytes = await Deno.readFile(path);
    return new Response(bytes);
  } catch {
    return c.notFound();
  }
});

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
  if (!settingsMap.logo && settingsMap.logoUrl) {
    settingsMap.logo = settingsMap.logoUrl as string;
  }

  // Construct BusinessSettings with sane defaults; unified single 'logo' field
  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
    currency: settingsMap.currency || "USD",
    logo: settingsMap.logo,
    // pass-through layout controls
    // brandLayout removed; always treating as logo-left in rendering
    paymentMethods: settingsMap.paymentMethods || "Bank Transfer",
    bankAccount: settingsMap.bankAccount || "",
    paymentTerms: settingsMap.paymentTerms || "Due in 30 days",
    defaultNotes: settingsMap.defaultNotes || "",
  };

  // Use template/highlight from settings only (no query overrides)
  const highlight = settingsMap.highlight ?? undefined;
  let selectedTemplateId: string | undefined = settingsMap.templateId
    ?.toLowerCase();
  if (
    selectedTemplateId === "professional" ||
    selectedTemplateId === "professional-modern"
  ) {
    selectedTemplateId = "professional-modern";
  } else if (
    selectedTemplateId === "minimalist" ||
    selectedTemplateId === "minimalist-clean"
  ) {
    selectedTemplateId = "minimalist-clean";
  }

  try {
    const embedXml = String(settingsMap.embedXmlInPdf || "false").toLowerCase() === "true";
    const xmlProfileId = settingsMap.xmlProfileId || "ubl21";
    const pdfBuffer = await generatePDF(
      invoice,
      businessSettings,
      selectedTemplateId,
      highlight,
      { embedXml, embedXmlProfileId: xmlProfileId },
    );
    return new Response(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${
          invoice.invoiceNumber || shareToken
        }.pdf"`,
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("/public/invoices/:share_token/pdf failed:", msg);
    return c.json({ error: "Failed to generate PDF", details: msg }, 500);
  }
});

// Return invoice as HTML (same options as PDF, but no PDF generation)
publicRoutes.get("/public/invoices/:share_token/html", async (c) => {
  const shareToken = c.req.param("share_token");
  const invoice = await getInvoiceByShareToken(shareToken);
  if (!invoice) {
    return c.json({ message: "Invoice not found" }, 404);
  }

  const settings = getSettings();
  const settingsMap = settings.reduce((acc: Record<string, string>, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);
  if (!settingsMap.logo && settingsMap.logoUrl) {
    settingsMap.logo = settingsMap.logoUrl as string;
  }

  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
    companyCountryCode: settingsMap.companyCountryCode ||
      settingsMap.countryCode || "",
    currency: settingsMap.currency || "USD",
    logo: settingsMap.logo,
    // brandLayout removed; always treating as logo-left in rendering
    paymentMethods: settingsMap.paymentMethods || "Bank Transfer",
    bankAccount: settingsMap.bankAccount || "",
    paymentTerms: settingsMap.paymentTerms || "Due in 30 days",
    defaultNotes: settingsMap.defaultNotes || "",
  };

  // Use template/highlight from settings only (no query overrides)
  const highlight = settingsMap.highlight ?? undefined;
  let selectedTemplateId: string | undefined = settingsMap.templateId
    ?.toLowerCase();
  if (
    selectedTemplateId === "professional" ||
    selectedTemplateId === "professional-modern"
  ) selectedTemplateId = "professional-modern";
  else if (
    selectedTemplateId === "minimalist" ||
    selectedTemplateId === "minimalist-clean"
  ) selectedTemplateId = "minimalist-clean";

  const html = buildInvoiceHTML(
    invoice,
    businessSettings,
    selectedTemplateId,
    highlight,
  );
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
});

// Return invoice as UBL (PEPPOL BIS Billing 3.0) XML
publicRoutes.get("/public/invoices/:share_token/ubl.xml", async (c) => {
  const shareToken = c.req.param("share_token");
  const invoice = await getInvoiceByShareToken(shareToken);
  if (!invoice) {
    return c.json({ message: "Invoice not found" }, 404);
  }

  const settings = getSettings();
  const settingsMap = settings.reduce((acc: Record<string, string>, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);

  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
    currency: settingsMap.currency || "USD",
    logo: settingsMap.logo,
    paymentMethods: settingsMap.paymentMethods || "Bank Transfer",
    bankAccount: settingsMap.bankAccount || "",
    paymentTerms: settingsMap.paymentTerms || "Due in 30 days",
    defaultNotes: settingsMap.defaultNotes || "",
  };

  const xml = generateUBLInvoiceXML(invoice, businessSettings, {
    sellerEndpointId: settingsMap.peppolSellerEndpointId,
    sellerEndpointSchemeId: settingsMap.peppolSellerEndpointSchemeId,
    buyerEndpointId: settingsMap.peppolBuyerEndpointId,
    buyerEndpointSchemeId: settingsMap.peppolBuyerEndpointSchemeId,
    sellerCountryCode: settingsMap.companyCountryCode,
    buyerCountryCode: invoice.customer.countryCode,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoice-${
        invoice.invoiceNumber || shareToken
      }.xml"`,
      "X-Robots-Tag": "noindex",
    },
  });
});

// Generic XML export endpoint selecting a profile (built-in only for now)
// Query param: ?profile=ubl21 (default) or stub-generic
publicRoutes.get("/public/invoices/:share_token/xml", async (c) => {
  const shareToken = c.req.param("share_token");
  const invoice = await getInvoiceByShareToken(shareToken);
  if (!invoice) return c.json({ message: "Invoice not found" }, 404);

  const settings = getSettings();
  const settingsMap = settings.reduce((acc: Record<string, string>, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);

  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
    currency: settingsMap.currency || "USD",
    logo: settingsMap.logo,
    paymentMethods: settingsMap.paymentMethods || "Bank Transfer",
    bankAccount: settingsMap.bankAccount || "",
    paymentTerms: settingsMap.paymentTerms || "Due in 30 days",
    defaultNotes: settingsMap.defaultNotes || "",
    companyCountryCode: settingsMap.companyCountryCode || "",
  };

  const url = new URL(c.req.url);
  const profileParam = url.searchParams.get("profile") || settingsMap.xmlProfileId || undefined;
  const { xml, profile } = generateInvoiceXML(profileParam, invoice, businessSettings, {
    sellerEndpointId: settingsMap.peppolSellerEndpointId,
    sellerEndpointSchemeId: settingsMap.peppolSellerEndpointSchemeId,
    buyerEndpointId: settingsMap.peppolBuyerEndpointId,
    buyerEndpointSchemeId: settingsMap.peppolBuyerEndpointSchemeId,
    sellerCountryCode: settingsMap.companyCountryCode,
    buyerCountryCode: invoice.customer.countryCode,
  });

  return new Response(xml, {
    headers: {
      "Content-Type": `${profile.mediaType}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber || shareToken}.${profile.fileExtension}"`,
      "X-Robots-Tag": "noindex",
    },
  });
});

// List available built-in XML profiles (public; could also require auth, but contents are non-sensitive)
publicRoutes.get("/public/xml-profiles", (c) => {
  const profiles = listXMLProfiles().map((p) => ({
    id: p.id,
    name: p.name,
    mediaType: p.mediaType,
    fileExtension: p.fileExtension,
    experimental: !!p.experimental,
    builtIn: true,
  }));
  return c.json(profiles);
});

export { publicRoutes };
