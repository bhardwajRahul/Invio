import { Router } from "elysia";
import { createInvoice, getInvoices, getInvoiceById, updateInvoice, deleteInvoice, publishInvoice } from "../controllers/invoices.ts";
import { getTemplates, createTemplate } from "../controllers/templates.ts";
import { updateSettings } from "../controllers/settings.ts";
import { authenticate } from "../middleware/auth.ts";

const adminRouter = Router();

adminRouter
  .use(authenticate) // Protect all admin routes with authentication middleware
  .post("/api/v1/invoices", createInvoice)
  .get("/api/v1/invoices", getInvoices)
  .get("/api/v1/invoices/:id", getInvoiceById)
  .put("/api/v1/invoices/:id", updateInvoice)
  .delete("/api/v1/invoices/:id", deleteInvoice)
  .post("/api/v1/invoices/:id/publish", publishInvoice)
  .get("/api/v1/templates", getTemplates)
  .post("/api/v1/templates", createTemplate)
  .put("/api/v1/settings", updateSettings);

export default adminRouter;