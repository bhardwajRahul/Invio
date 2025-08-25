import { PDFDocument, rgb } from "pdf-lib";
import { Invoice } from "../types/index.ts";

export async function generateInvoicePDF(invoiceData: Invoice, _templateHTML?: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);

    // Set the font and color
    const fontSize = 12;
    page.drawText("Invoice", {
        x: 50,
        y: 350,
        size: fontSize,
        color: rgb(0, 0, 0),
    });

    // Add invoice details
    page.drawText(`Invoice ID: ${invoiceData.id}`, { x: 50, y: 320, size: fontSize });
    page.drawText(`Customer ID: ${invoiceData.customerId}`, { x: 50, y: 300, size: fontSize });
    page.drawText(`Total: $${invoiceData.total}`, { x: 50, y: 280, size: fontSize });
    page.drawText(`Status: ${invoiceData.status}`, { x: 50, y: 260, size: fontSize });
    page.drawText(`Issue Date: ${invoiceData.issueDate.toDateString()}`, { x: 50, y: 240, size: fontSize });

    // Serialize the PDF document to bytes
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

export async function renderTemplateToPDF(_templateHTML: string, _data: Record<string, unknown>): Promise<Uint8Array> {
    // This function can be expanded to render HTML templates to PDF
    // For now, it will just return an empty PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);

    page.drawText("Template Rendering Not Implemented", {
        x: 50,
        y: 200,
        size: 12,
        color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

// Alias for backward compatibility
export const generatePDF = generateInvoicePDF;