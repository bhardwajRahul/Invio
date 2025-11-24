import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PDFDocument, PDFName } from "pdf-lib";


import { embedXmlAttachment } from "./pdf.ts";
import { getXMLProfile } from "./xmlProfiles.ts";

Deno.test("embedXmlAttachment injects ZUGFeRD XML and XMP metadata", async () => {
  // Create a dummy PDF
  const doc = await PDFDocument.create();
  doc.addPage();
  const pdfBytes = await doc.save();

  const profile = getXMLProfile("facturx22");
  const xmlBytes = new TextEncoder().encode("<xml>dummy</xml>");

  const resultBytes = await embedXmlAttachment(
    pdfBytes,
    xmlBytes,
    "invoice.xml",
    profile.mediaType,
    "ZUGFeRD Invoice",
    "en-US",
    profile
  );

  assertExists(resultBytes);
  const pdfDoc = await PDFDocument.load(resultBytes);

  // Check for EmbeddedFiles
  const names = pdfDoc.catalog.get(PDFName.of("Names"));
  assertExists(names);
  
  // Check for Metadata
  const metadata = pdfDoc.catalog.get(PDFName.of("Metadata"));
  assertExists(metadata);
});
