import { Router } from "elysia";
import { getInvoiceByShareToken } from "../controllers/invoices.ts";
import { generatePDF } from "../utils/pdf.ts";

const publicRouter = Router();

publicRouter.get("/api/v1/public/invoices/:share_token", async (ctx) => {
  const { share_token } = ctx.params;
  const invoice = await getInvoiceByShareToken(share_token);
  
  if (!invoice) {
    return ctx.response.status(404).send({ message: "Invoice not found" });
  }

  return ctx.response.send(invoice);
});

publicRouter.get("/api/v1/public/invoices/:share_token/pdf", async (ctx) => {
  const { share_token } = ctx.params;
  const invoice = await getInvoiceByShareToken(share_token);
  
  if (!invoice) {
    return ctx.response.status(404).send({ message: "Invoice not found" });
  }

  const pdfBuffer = await generatePDF(invoice);
  ctx.response.headers.set("Content-Type", "application/pdf");
  ctx.response.headers.set("Content-Disposition", `attachment; filename="invoice-${share_token}.pdf"`);
  ctx.response.body = pdfBuffer;
});

export default publicRouter;