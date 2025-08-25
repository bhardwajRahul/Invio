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
import { getTemplates, createTemplate } from "../controllers/templates.ts";
import { updateSettings, getSettings } from "../controllers/settings.ts";
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from "../controllers/customers.ts";

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

// Invoice routes
adminRoutes.post("/invoices", async (c) => {
  const data = await c.req.json();
  const invoice = await createInvoice(data);
  return c.json(invoice);
});

adminRoutes.get("/invoices", async (c) => {
  const invoices = await getInvoices();
  return c.json(invoices);
});

adminRoutes.get("/invoices/:id", async (c) => {
  const id = c.req.param("id");
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    return c.json({ error: "Invoice not found" }, 404);
  }
  return c.json(invoice);
});

adminRoutes.put("/invoices/:id", async (c) => {
  const id = c.req.param("id");
  const data = await c.req.json();
  const invoice = await updateInvoice(id, data);
  return c.json(invoice);
});

adminRoutes.delete("/invoices/:id", async (c) => {
  const id = c.req.param("id");
  await deleteInvoice(id);
  return c.json({ success: true });
});

adminRoutes.post("/invoices/:id/publish", async (c) => {
  const id = c.req.param("id");
  const result = await publishInvoice(id);
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

// Settings routes
adminRoutes.get("/settings", async (c) => {
  const settings = await getSettings();
  return c.json(settings);
});

adminRoutes.put("/settings", async (c) => {
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