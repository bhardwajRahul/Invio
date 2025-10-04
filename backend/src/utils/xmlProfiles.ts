// Built-in XML export profile registry.
// Initial scope: only built-in (no dynamic installs). Designed to be easily
// extended later with manifest-installed profiles.

import { BusinessSettings, InvoiceWithDetails } from "../types/index.ts";
import { generateUBLInvoiceXML } from "./ubl.ts";
import { generateFacturX22XML } from "./facturx.ts";

export interface XMLProfileGenerateOptions {
  // Optional PEPPOL / endpoint IDs etc. Pass ed through to UBL generator where relevant.
  sellerEndpointId?: string;
  sellerEndpointSchemeId?: string;
  buyerEndpointId?: string;
  buyerEndpointSchemeId?: string;
  sellerCountryCode?: string;
  buyerCountryCode?: string;
}

export interface XMLProfile {
  id: string;              // stable identifier (e.g. "ubl21")
  name: string;            // human readable
  mediaType: string;       // e.g. application/xml
  fileExtension: string;   // e.g. xml
  experimental?: boolean;  // mark stubs for UI (optional)
  generate: (
    invoice: InvoiceWithDetails,
    business: BusinessSettings,
    opts?: XMLProfileGenerateOptions,
  ) => string;
}

// Built-in providers map. Keep keys lowercase.
const PROFILES: Record<string, XMLProfile> = {
  "ubl21": {
    id: "ubl21",
    name: "UBL 2.1 (PEPPOL BIS Billing 3.0)",
    mediaType: "application/xml",
    fileExtension: "xml",
    generate: (invoice, business, opts) =>
      generateUBLInvoiceXML(invoice, business, {
        sellerEndpointId: opts?.sellerEndpointId,
        sellerEndpointSchemeId: opts?.sellerEndpointSchemeId,
        buyerEndpointId: opts?.buyerEndpointId,
        buyerEndpointSchemeId: opts?.buyerEndpointSchemeId,
        sellerCountryCode: opts?.sellerCountryCode,
        buyerCountryCode: opts?.buyerCountryCode,
      }),
  },
  "facturx22": {
    id: "facturx22",
    name: "Factur-X / ZUGFeRD 2.2 (EN 16931)",
    mediaType: "application/xml",
    fileExtension: "xml",
    generate: (invoice, business, opts) =>
      generateFacturX22XML(invoice, business, {
        sellerCountryCode: opts?.sellerCountryCode,
        buyerCountryCode: opts?.buyerCountryCode,
      }),
  },
};

export function listXMLProfiles(): XMLProfile[] {
  return Object.values(PROFILES);
}

export function getXMLProfile(id?: string | null): XMLProfile {
  if (!id) return PROFILES["ubl21"]; // default
  const key = id.toLowerCase();
  return PROFILES[key] || PROFILES["ubl21"]; // fallback
}

export function generateInvoiceXML(
  profileId: string | undefined,
  invoice: InvoiceWithDetails,
  business: BusinessSettings,
  opts?: XMLProfileGenerateOptions,
): { xml: string; profile: XMLProfile } {
  const profile = getXMLProfile(profileId);
  const xml = profile.generate(invoice, business, opts);
  return { xml, profile };
}
