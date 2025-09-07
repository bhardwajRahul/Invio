// @ts-nocheck: route handlers use Hono context without typings to keep edits minimal
import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import {
  createInvoice,
  deleteInvoice,
  duplicateInvoice,
  getInvoiceById,
  getInvoices,
  publishInvoice,
  unpublishInvoice,
  updateInvoice,
} from "../controllers/invoices.ts";
import {
  createTemplate,
  deleteTemplate,
  getTemplateById,
  getTemplates,
  loadTemplateFromFile,
  renderTemplate,
  setDefaultTemplate,
  installTemplateFromManifest,
} from "../controllers/templates.ts";
import {
  deleteSetting,
  getSetting,
  getSettings,
  setSetting,
  updateSettings,
} from "../controllers/settings.ts";
import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomers,
  updateCustomer,
} from "../controllers/customers.ts";
import { buildInvoiceHTML, generatePDF } from "../utils/pdf.ts";

const adminRoutes = new Hono();

// Basic auth middleware for admin routes
const ADMIN_USER = Deno.env.get("ADMIN_USER") || "admin";
const ADMIN_PASS = Deno.env.get("ADMIN_PASS") || "supersecret";
// Demo mode: when true, backend becomes read-only for mutating admin endpoints
const DEMO_MODE = (Deno.env.get("DEMO_MODE") || "").toLowerCase() === "true";

adminRoutes.use(
  "/invoices/*",
  basicAuth({
    username: ADMIN_USER,
    password: ADMIN_PASS,
  }),
);

adminRoutes.use(
  "/customers/*",
  basicAuth({
    username: ADMIN_USER,
    password: ADMIN_PASS,
  }),
);

adminRoutes.use(
  "/templates/*",
  basicAuth({
    username: ADMIN_USER,
    password: ADMIN_PASS,
  }),
);

// Public dev-only endpoints (no auth) to serve a test manifest and HTML
adminRoutes.get("/dev/templates/simple/manifest.yaml", (_c) => {
  const text = Deno.readTextFileSync(
    "./static/dev-templates/simple/manifest.yaml",
  );
  return new Response(text, {
    headers: { "Content-Type": "text/yaml; charset=utf-8" },
  });
});

adminRoutes.get("/dev/templates/simple/index.html", (_c) => {
  const text = Deno.readTextFileSync(
    "./static/dev-templates/simple/index.html",
  );
  return new Response(text, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});

adminRoutes.use(
  "/settings/*",
  basicAuth({
    username: ADMIN_USER,
    password: ADMIN_PASS,
  }),
);

// Protect admin alias routes as well
adminRoutes.use(
  "/admin/*",
  basicAuth({
    username: ADMIN_USER,
    password: ADMIN_PASS,
  }),
);

// Invoice routes
adminRoutes.post("/invoices", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot create invoices" }, 403);
  const data = await c.req.json();
  const invoice = createInvoice(data);
  return c.json(invoice);
});

adminRoutes.get("/invoices", (c) => {
  const invoices = getInvoices();
  // Enrich with customer name and snake_case issue_date for UI compatibility
  const list = invoices.map((inv) => {
    let customerName: string | undefined = undefined;
    try {
      const customer = getCustomerById(inv.customerId);
      customerName = customer?.name;
    } catch (_e) { /* ignore */ }
    const issue_date = inv.issueDate
      ? new Date(inv.issueDate).toISOString().slice(0, 10)
      : undefined;
    return {
      ...inv,
      customer: customerName ? { name: customerName } : undefined,
      issue_date,
    } as unknown;
  });
  return c.json(list);
});

adminRoutes.get("/invoices/:id", (c) => {
  const id = c.req.param("id");
  const invoice = getInvoiceById(id);
  if (!invoice) {
    return c.json({ error: "Invoice not found" }, 404);
  }
  return c.json(invoice);
});

adminRoutes.put("/invoices/:id", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot update invoices" }, 403);
  const id = c.req.param("id");
  const data = await c.req.json();
  const invoice = await updateInvoice(id, data);
  return c.json(invoice);
});

adminRoutes.delete("/invoices/:id", (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot delete invoices" }, 403);
  const id = c.req.param("id");
  deleteInvoice(id);
  return c.json({ success: true });
});

adminRoutes.post("/invoices/:id/publish", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot publish invoices" }, 403);
  const id = c.req.param("id");
  const result = await publishInvoice(id);
  return c.json(result);
});

adminRoutes.post("/invoices/:id/unpublish", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot unpublish invoices" }, 403);
  const id = c.req.param("id");
  const result = await unpublishInvoice(id);
  return c.json(result);
});

adminRoutes.post("/invoices/:id/duplicate", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot duplicate invoices" }, 403);
  const id = c.req.param("id");
  const copy = await duplicateInvoice(id);
  if (!copy) return c.json({ error: "Invoice not found" }, 404);
  return c.json(copy);
});

// Template routes
adminRoutes.get("/templates", async (c) => {
  let templates = await getTemplates();
  // Overlay the default from settings if present to avoid stale display
  try {
    const settings = await getSettings();
    const map = settings.reduce((acc: Record<string, string>, s) => {
      acc[s.key] = s.value as string;
      return acc;
    }, {} as Record<string, string>);
    const current = map.templateId;
    if (current) {
      templates = templates.map((t) => ({ ...t, isDefault: t.id === current }));
    }
  } catch { /* ignore */ }
  return c.json(templates);
});

adminRoutes.post("/templates", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot create templates" }, 403);
  const data = await c.req.json();
  const template = await createTemplate(data);
  return c.json(template);
});

// Install a template from a remote manifest URL (YAML or JSON)
adminRoutes.post("/templates/install-from-manifest", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot install templates" }, 403);
  try {
    const { url } = await c.req.json();
    if (!url || typeof url !== "string") {
      return c.json({ error: "Missing 'url'" }, 400);
    }
    const t = await installTemplateFromManifest(url);
    return c.json(t);
  } catch (e) {
    return c.json({ error: String(e) }, 400);
  }
});

// Delete a template (disallow removing built-in app templates)
adminRoutes.delete("/templates/:id", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot delete templates" }, 403);
  const id = c.req.param("id");
  // Built-in templates are protected
  const builtin = new Set(["professional-modern", "minimalist-clean"]);
  if (builtin.has(id)) {
    return c.json({ error: "Cannot delete built-in templates" }, 400);
  }

  // If this template is currently selected in settings, reset to minimalist-clean
  try {
    const current = await getSetting("templateId");
    if (current === id) {
      await setSetting("templateId", "minimalist-clean");
    }
  } catch (_e) {
    // non-fatal
  }

  try {
    await deleteTemplate(id);
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// Get template by ID
adminRoutes.get("/templates/:id", (c) => {
  const id = c.req.param("id");
  const template = getTemplateById(id);
  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }
  return c.json(template);
});

// Preview template with sample data
adminRoutes.post("/templates/:id/preview", async (c) => {
  const id = c.req.param("id");
  const data = await c.req.json();

  const template = getTemplateById(id);
  if (!template) {
    return c.json({ error: "Template not found" }, 404);
  }

  // Add sample data if not provided
  const sampleData = {
    companyName: "Sample Company Inc",
    companyAddress: "123 Business St, City, State 12345",
    companyEmail: "contact@sample.com",
    companyPhone: "+1-555-123-4567",
    companyTaxId: "TAX123456",
    invoiceNumber: "INV-2025-001",
    issueDate: "2025-08-26",
    dueDate: "2025-09-25",
    currency: "USD",
    status: "draft",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    customerAddress: "456 Client Ave, City, State 54321",
    highlightColor: data.highlightColor || "#2563eb",
    highlightColorLight: data.highlightColorLight || "#dbeafe",
    subtotal: 2500.00,
    discountAmount: 250.00,
    discountPercentage: 10,
    taxRate: 8.5,
    taxAmount: 191.25,
    total: 2441.25,
    hasDiscount: true,
    hasTax: true,

    items: [
      {
        description: "Website Development",
        quantity: 1,
        unitPrice: 2500.00,
        lineTotal: 2500.00,
        notes: "Custom responsive website with modern design",
      },
    ],
    notes: "Thank you for your business! Payment is due within 30 days.",
    paymentTerms: "Net 30 days",
    paymentMethods: "Bank Transfer, Credit Card",
    bankAccount: "Account: 123-456-789, Routing: 987-654-321",
    ...data,
  };

  try {
    const renderedHtml = renderTemplate(template.html, sampleData);
    return new Response(renderedHtml, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error) {
    return c.json({
      error: "Failed to render template",
      details: String(error),
    }, 500);
  }
});

// Load template from file
adminRoutes.post("/templates/load-from-file", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot load templates from file" }, 403);
  try {
    const { filePath, name, isDefault, highlightColor } = await c.req.json();

    const html = await loadTemplateFromFile(filePath);
    const template = await createTemplate({
      name,
      html,
      isDefault: isDefault || false,
    });

    return c.json({
      ...template,
      highlightColor: highlightColor || "#2563eb",
      message: "Template loaded successfully from file",
    });
  } catch (error) {
    return c.json({
      error: "Failed to load template from file",
      details: String(error),
    }, 500);
  }
});

// Settings routes
adminRoutes.get("/settings", async (c) => {
  const settings = await getSettings();
  const map = settings.reduce((acc: Record<string, string>, s) => {
    acc[s.key] = s.value as string;
    return acc;
  }, {} as Record<string, string>);
  // Provide normalized aliases expected by the frontend
  if (map.companyEmail && !map.email) map.email = map.companyEmail;
  if (map.companyPhone && !map.phone) map.phone = map.companyPhone;
  if (map.companyTaxId && !map.taxId) map.taxId = map.companyTaxId;
  // Unify logo fields: prefer single 'logo'; hide legacy 'logoUrl'
  if (map.logoUrl && !map.logo) map.logo = map.logoUrl;
  if (map.logoUrl) delete map.logoUrl;
  // Expose demo mode to frontend UI
  (map as Record<string, unknown>).demoMode = DEMO_MODE ? "true" : "false";
  return c.json(map);
});

adminRoutes.put("/settings", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot update settings" }, 403);
  const data = await c.req.json();
  // Normalize legacy logoUrl to logo
  if (typeof data.logoUrl === "string" && !data.logo) {
    data.logo = data.logoUrl;
    delete data.logoUrl;
  }
  const settings = await updateSettings(data);
  try {
    if ("logoUrl" in data) deleteSetting("logoUrl");
  } catch (_e) { /* ignore legacy cleanup errors */ }
  // If default template changed, reflect in templates table
  if (typeof data.templateId === "string" && data.templateId) {
    try {
      setDefaultTemplate(String(data.templateId));
    } catch { /* ignore */ }
  }
  return c.json(settings);
});

// Partial update (PATCH) to merge provided keys only
adminRoutes.patch("/settings", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot update settings" }, 403);
  const data = await c.req.json();
  // Normalize legacy logoUrl to logo
  if (typeof data.logoUrl === "string" && !data.logo) {
    data.logo = data.logoUrl;
    delete data.logoUrl;
  }
  const settings = await updateSettings(data);
  if (typeof data.templateId === "string" && data.templateId) {
    try {
      setDefaultTemplate(String(data.templateId));
    } catch { /* ignore */ }
  }
  try {
    if ("logoUrl" in data) deleteSetting("logoUrl");
  } catch (_e) { /* ignore legacy cleanup errors */ }
  return c.json(settings);
});

// Optional admin-prefixed aliases for clarity/documentation parity
adminRoutes.get("/admin/settings", async (c) => {
  const settings = await getSettings();
  const map = settings.reduce((acc: Record<string, string>, s) => {
    acc[s.key] = s.value as string;
    return acc;
  }, {} as Record<string, string>);
  if (map.companyEmail && !map.email) map.email = map.companyEmail;
  if (map.companyPhone && !map.phone) map.phone = map.companyPhone;
  if (map.companyTaxId && !map.taxId) map.taxId = map.companyTaxId;
  if (map.logoUrl && !map.logo) map.logo = map.logoUrl;
  if (map.logoUrl) delete map.logoUrl;
  // Expose demo mode to frontend UI for admin-prefixed route as well
  (map as Record<string, unknown>).demoMode = DEMO_MODE ? "true" : "false";
  return c.json(map);
});

adminRoutes.put("/admin/settings", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot update settings" }, 403);
  const data = await c.req.json();
  if (typeof data.logoUrl === "string" && !data.logo) {
    data.logo = data.logoUrl;
    delete data.logoUrl;
  }
  const settings = await updateSettings(data);
  try {
    if ("logoUrl" in data) deleteSetting("logoUrl");
  } catch (_e) { /* ignore legacy cleanup errors */ }
  return c.json(settings);
});

adminRoutes.patch("/admin/settings", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot update settings" }, 403);
  const data = await c.req.json();
  if (typeof data.logoUrl === "string" && !data.logo) {
    data.logo = data.logoUrl;
    delete data.logoUrl;
  }
  const settings = await updateSettings(data);
  try {
    if ("logoUrl" in data) deleteSetting("logoUrl");
  } catch (_e) { /* ignore legacy cleanup errors */ }
  return c.json(settings);
});

// Customer routes
adminRoutes.get("/customers", async (c) => {
  const customers = await getCustomers();
  return c.json(customers);
});

adminRoutes.get("/customers/:id", async (c) => {
  const id = c.req.param("id");
  const customer = await getCustomerById(id);
  if (!customer) {
    return c.json({ error: "Customer not found" }, 404);
  }
  return c.json(customer);
});

adminRoutes.post("/customers", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot create customers" }, 403);
  const data = await c.req.json();
  const customer = await createCustomer(data);
  return c.json(customer);
});

adminRoutes.put("/customers/:id", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot update customers" }, 403);
  const id = c.req.param("id");
  const data = await c.req.json();
  const customer = await updateCustomer(id, data);
  return c.json(customer);
});

adminRoutes.delete("/customers/:id", async (c) => {
  if (DEMO_MODE) return c.json({ error: "Read-only demo mode: cannot delete customers" }, 403);
  const id = c.req.param("id");
  await deleteCustomer(id);
  return c.json({ success: true });
});


// Authenticated HTML/PDF generation for invoices by ID (no share token required)
adminRoutes.get("/invoices/:id/html", async (c) => {
  const id = c.req.param("id");
  const invoice = getInvoiceById(id);
  if (!invoice) {
    return c.json({ message: "Invoice not found" }, 404);
  }

  // Settings map
  const settings = await getSettings();
  const settingsMap = settings.reduce((acc: Record<string, string>, s) => {
    acc[s.key] = s.value as string;
    return acc;
  }, {} as Record<string, string>);
  if (!settingsMap.logo && settingsMap.logoUrl) {
    settingsMap.logo = settingsMap.logoUrl;
  }

  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
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
    },
  });
});

adminRoutes.get("/invoices/:id/pdf", async (c) => {
  const id = c.req.param("id");
  const invoice = getInvoiceById(id);
  if (!invoice) {
    return c.json({ message: "Invoice not found" }, 404);
  }

  // Settings map
  const settings = await getSettings();
  const settingsMap = settings.reduce((acc: Record<string, string>, s) => {
    acc[s.key] = s.value as string;
    return acc;
  }, {} as Record<string, string>);
  if (!settingsMap.logo && settingsMap.logoUrl) {
    settingsMap.logo = settingsMap.logoUrl;
  }

  const businessSettings = {
    companyName: settingsMap.companyName || "Your Company",
    companyAddress: settingsMap.companyAddress || "",
    companyEmail: settingsMap.companyEmail || "",
    companyPhone: settingsMap.companyPhone || "",
    companyTaxId: settingsMap.companyTaxId || "",
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

  const pdfBuffer = await generatePDF(
    invoice,
    businessSettings,
    selectedTemplateId,
    highlight,
  );
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${
        invoice.invoiceNumber || id
      }.pdf"`,
    },
  });
});

export { adminRoutes };
