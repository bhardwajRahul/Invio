import { Hono } from "hono";
import { basicAuth } from "hono/basic-auth";
import { 
  createInvoice, 
  getInvoices, 
  getInvoiceById, 
  updateInvoice, 
  deleteInvoice, 
  publishInvoice 
} from "../controllers/invoices.ts";
import { getTemplates, createTemplate, getTemplateById, renderTemplate, loadTemplateFromFile } from "../controllers/templates.ts";
import { updateSettings, getSettings } from "../controllers/settings.ts";
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from "../controllers/customers.ts";
import { generatePDF, buildInvoiceHTML } from "../utils/pdf.ts";

const adminRoutes = new Hono();

// Basic auth middleware for admin routes
const ADMIN_USER = Deno.env.get("ADMIN_USER") || "admin";
const ADMIN_PASS = Deno.env.get("ADMIN_PASS") || "supersecret";

adminRoutes.use("/invoices/*", basicAuth({
  username: ADMIN_USER,
  password: ADMIN_PASS,
}));

adminRoutes.use("/customers/*", basicAuth({
  username: ADMIN_USER,
  password: ADMIN_PASS,
}));

adminRoutes.use("/templates/*", basicAuth({
  username: ADMIN_USER,
  password: ADMIN_PASS,
}));

adminRoutes.use("/settings/*", basicAuth({
  username: ADMIN_USER,
  password: ADMIN_PASS,
}));

// Protect admin alias routes as well
adminRoutes.use("/admin/*", basicAuth({
  username: ADMIN_USER,
  password: ADMIN_PASS,
}));

// Invoice routes
adminRoutes.post("/invoices", async (c) => {
  const data = await c.req.json();
  const invoice = createInvoice(data);
  return c.json(invoice);
});

adminRoutes.get("/invoices", (c) => {
  const invoices = getInvoices();
  return c.json(invoices);
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
  const id = c.req.param("id");
  const data = await c.req.json();
  const invoice = updateInvoice(id, data);
  return c.json(invoice);
});

adminRoutes.delete("/invoices/:id", (c) => {
  const id = c.req.param("id");
  deleteInvoice(id);
  return c.json({ success: true });
});

adminRoutes.post("/invoices/:id/publish", (c) => {
  const id = c.req.param("id");
  const result = publishInvoice(id);
  return c.json(result);
});

// Template routes
adminRoutes.get("/templates", async (c) => {
  const templates = await getTemplates();
  return c.json(templates);
});

adminRoutes.post("/templates", async (c) => {
  const data = await c.req.json();
  const template = await createTemplate(data);
  return c.json(template);
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
        notes: "Custom responsive website with modern design"
      }
    ],
    notes: "Thank you for your business! Payment is due within 30 days.",
    paymentTerms: "Net 30 days",
    paymentMethods: "Bank Transfer, Credit Card",
    bankAccount: "Account: 123-456-789, Routing: 987-654-321",
    ...data
  };
  
  try {
    const renderedHtml = renderTemplate(template.html, sampleData);
    return new Response(renderedHtml, {
      headers: { "Content-Type": "text/html" }
    });
  } catch (error) {
    return c.json({ error: "Failed to render template", details: String(error) }, 500);
  }
});

// Load template from file
adminRoutes.post("/templates/load-from-file", async (c) => {
  try {
    const { filePath, name, isDefault, highlightColor } = await c.req.json();
    
    const html = await loadTemplateFromFile(filePath);
    const template = await createTemplate({
      name,
      html,
      isDefault: isDefault || false
    });
    
    return c.json({ 
      ...template, 
      highlightColor: highlightColor || "#2563eb",
      message: "Template loaded successfully from file" 
    });
  } catch (error) {
    return c.json({ error: "Failed to load template from file", details: String(error) }, 500);
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
  return c.json(map);
});

adminRoutes.put("/settings", async (c) => {
  const data = await c.req.json();
  const settings = await updateSettings(data);
  return c.json(settings);
});

// Partial update (PATCH) to merge provided keys only
adminRoutes.patch("/settings", async (c) => {
  const data = await c.req.json();
  const settings = await updateSettings(data);
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
  return c.json(map);
});

adminRoutes.put("/admin/settings", async (c) => {
  const data = await c.req.json();
  const settings = await updateSettings(data);
  return c.json(settings);
});

adminRoutes.patch("/admin/settings", async (c) => {
  const data = await c.req.json();
  const settings = await updateSettings(data);
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
  const data = await c.req.json();
  const customer = await createCustomer(data);
  return c.json(customer);
});

adminRoutes.put("/customers/:id", async (c) => {
  const id = c.req.param("id");
  const data = await c.req.json();
  const customer = await updateCustomer(id, data);
  return c.json(customer);
});

adminRoutes.delete("/customers/:id", async (c) => {
  const id = c.req.param("id");
  await deleteCustomer(id);
  return c.json({ success: true });
});

export { adminRoutes };

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

  // Template/highlight from query
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

  // Template/highlight from query
  const queryTemplate = c.req.query("template") ?? c.req.query("templateId") ?? undefined;
  const highlight = c.req.query("highlight") ?? undefined;
  let selectedTemplateId: string | undefined = queryTemplate?.toLowerCase();
  if (selectedTemplateId === "professional" || selectedTemplateId === "professional-modern") selectedTemplateId = "professional-modern";
  else if (selectedTemplateId === "minimalist" || selectedTemplateId === "minimalist-clean") selectedTemplateId = "minimalist-clean";

  const pdfBuffer = await generatePDF(invoice, businessSettings, selectedTemplateId, highlight);
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber || id}.pdf"`,
    },
  });
});