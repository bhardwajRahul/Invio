import { Hono } from "hono";
import { getInvoiceByShareToken } from "../controllers/invoices.ts";
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

  const pdfBuffer = await generatePDF(invoice);
  
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${shareToken}.pdf"`,
    },
  });
});

export { publicRoutes };