// Generator for Factur-X / ZUGFeRD 2.2 (EN 16931) using UN/CEFACT CII syntax
// Scope: minimal yet standards-aligned subset for common exchange.
import { BusinessSettings, InvoiceWithDetails } from "../types/index.ts";

type Maybe<T> = T | undefined | null;

function xmlEscape(v: Maybe<string | number | boolean>): string {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fmtDateYYYYMMDD(d?: Date): string | undefined {
  if (!d) return undefined;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function decimals(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function safeCurrency(biz?: BusinessSettings, invCurrency?: string): string {
  return (invCurrency || biz?.currency || "EUR").toUpperCase();
}

function splitAddress(addr?: string): { street?: string; city?: string; postal?: string; country?: string } {
  if (!addr) return {};
  const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
  const out: { street?: string; city?: string; postal?: string; country?: string } = {};
  if (parts.length > 0) out.street = parts[0];
  const part1 = parts[1] || "";
  if (part1 && !/[0-9]/.test(part1)) out.city = part1;
  const tail = parts.slice(out.city ? 2 : 1).join(" ");
  if (tail) {
    const tokens = tail.split(/\s+/).filter(Boolean);
    for (let i = tokens.length - 1; i >= 0; i--) {
      const t = tokens[i];
      if (/[0-9]/.test(t)) { out.postal = t.replace(/[^A-Za-z0-9\-]/g, ""); break; }
    }
    if (!out.city && tokens.length > 0) {
      const pIdx = out.postal ? tokens.lastIndexOf(out.postal) : -1;
      const pre = pIdx > 0 ? tokens.slice(0, pIdx).join(" ") : tokens.join(" ");
      if (pre && !/[0-9]/.test(pre)) out.city = pre;
    }
  }
  const last = parts[parts.length - 1] || "";
  const cc = last.trim().toUpperCase();
  if (/^[A-Z]{2,3}$/.test(cc)) out.country = cc.length === 3 ? cc.slice(0, 2) : cc;
  return out;
}

function taxCategoryId(rate: number): string { return rate > 0 ? "S" : "Z"; }

function isLikelyVatId(v?: string): boolean {
  if (!v) return false;
  const s = v.trim();
  if (s.length < 3) return false;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return false; // looks like timestamp
  return /^[A-Za-z0-9][A-Za-z0-9\-\./ ]{1,30}$/.test(s);
}

export interface FacturXOptions {
  sellerCountryCode?: string;
  buyerCountryCode?: string;
  profileUrn?: string; // e.g., urn:factur-x.eu:2p2:en16931 | ...:basic | ...:basicwl | ...:extended
  orderReferenceId?: string; // optional
}

export function generateFacturX22XML(
  invoice: InvoiceWithDetails,
  business: BusinessSettings,
  opts: FacturXOptions = {},
): string {
  const currency = safeCurrency(business, invoice.currency);
  const issue = fmtDateYYYYMMDD(invoice.issueDate) || fmtDateYYYYMMDD(new Date()) || "";
  const profileUrn = (opts.profileUrn?.trim()) || "urn:factur-x.eu:2p2:en16931";

  // Parties
  const sellerAddr = splitAddress(business.companyAddress);
  if (!sellerAddr.country && business.companyCountryCode) sellerAddr.country = business.companyCountryCode.toUpperCase();
  if (!sellerAddr.country && opts.sellerCountryCode) sellerAddr.country = opts.sellerCountryCode.toUpperCase();
  const buyerAddr = splitAddress(invoice.customer.address);
  if (!buyerAddr.country && invoice.customer.countryCode) buyerAddr.country = invoice.customer.countryCode.toUpperCase();
  if (!buyerAddr.country && opts.buyerCountryCode) buyerAddr.country = opts.buyerCountryCode.toUpperCase();

  // Tax summary: prefer normalized invoice.taxes if provided
  const taxes = (invoice.taxes && invoice.taxes.length > 0)
    ? invoice.taxes.map((t) => ({ percent: Number(t.percent) || 0, taxable: Number(t.taxableAmount) || 0, amount: Number(t.taxAmount) || 0 }))
    : ((invoice.taxAmount || 0) > 0 ? [{
      percent: Number(invoice.taxRate) || 0,
      taxable: Math.max(0, (invoice.subtotal || 0) - (invoice.discountAmount || 0)),
      amount: Number(invoice.taxAmount) || 0,
    }] : []);

  const docContext = `
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${xmlEscape(profileUrn)}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>`;

  const docHeader = `
  <rsm:ExchangedDocument>
    <ram:ID>${xmlEscape(invoice.invoiceNumber)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${issue}</udt:DateTimeString></ram:IssueDateTime>
    ${invoice.notes ? `<ram:IncludedNote><ram:Content>${xmlEscape(invoice.notes)}</ram:Content></ram:IncludedNote>` : ""}
  </rsm:ExchangedDocument>`;

  const sellerParty = `
    <ram:SellerTradeParty>
      ${isLikelyVatId(business.companyTaxId) ? `<ram:ID>${xmlEscape(business.companyTaxId!)}</ram:ID>` : ""}
      <ram:Name>${xmlEscape(business.companyName)}</ram:Name>
      ${isLikelyVatId(business.companyTaxId) ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${xmlEscape(business.companyTaxId!)}</ram:ID></ram:SpecifiedTaxRegistration>` : ""}
      <ram:PostalTradeAddress>
        ${sellerAddr.postal ? `<ram:PostcodeCode>${xmlEscape(sellerAddr.postal)}</ram:PostcodeCode>` : ""}
        ${sellerAddr.street ? `<ram:LineOne>${xmlEscape(sellerAddr.street)}</ram:LineOne>` : ""}
        ${sellerAddr.city ? `<ram:CityName>${xmlEscape(sellerAddr.city)}</ram:CityName>` : ""}
        <ram:CountryID>${xmlEscape(sellerAddr.country || "DE")}</ram:CountryID>
      </ram:PostalTradeAddress>
      ${business.companyEmail ? `<ram:URIUniversalCommunication><ram:URIID>${xmlEscape(business.companyEmail)}</ram:URIID></ram:URIUniversalCommunication>` : ""}
    </ram:SellerTradeParty>`;

  const buyer = invoice.customer;
  // Prefer explicit city/postalCode fields if present, fallback to parsed address
  const buyerCity = buyer.city || buyerAddr.city;
  const buyerPostal = buyer.postalCode || buyerAddr.postal;
  const buyerParty = `
    <ram:BuyerTradeParty>
      ${isLikelyVatId(buyer.taxId) ? `<ram:ID>${xmlEscape(buyer.taxId!)}</ram:ID>` : ""}
      <ram:Name>${xmlEscape(buyer.name)}</ram:Name>
      ${isLikelyVatId(buyer.taxId) ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID=\"VA\">${xmlEscape(buyer.taxId!)}</ram:ID></ram:SpecifiedTaxRegistration>` : ""}
      <ram:PostalTradeAddress>
        ${buyerPostal ? `<ram:PostcodeCode>${xmlEscape(buyerPostal)}</ram:PostcodeCode>` : ""}
        ${buyerAddr.street ? `<ram:LineOne>${xmlEscape(buyerAddr.street)}</ram:LineOne>` : ""}
        ${buyerCity ? `<ram:CityName>${xmlEscape(buyerCity)}</ram:CityName>` : ""}
        <ram:CountryID>${xmlEscape(buyerAddr.country || "DE")}</ram:CountryID>
      </ram:PostalTradeAddress>
      ${buyer.email ? `<ram:URIUniversalCommunication><ram:URIID>${xmlEscape(buyer.email)}</ram:URIID></ram:URIUniversalCommunication>` : ""}
    </ram:BuyerTradeParty>`;

  const headerAgreement = `
  <ram:ApplicableHeaderTradeAgreement>
    ${sellerParty}
    ${buyerParty}
    ${invoice.customer.reference ? `<ram:BuyerReference>${xmlEscape(invoice.customer.reference)}</ram:BuyerReference>` : ""}
    ${opts.orderReferenceId ? `<ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>${xmlEscape(opts.orderReferenceId)}</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>` : ""}
  </ram:ApplicableHeaderTradeAgreement>`;

  const paymentTerms = business.paymentTerms || invoice.paymentTerms;
  const headerTaxes = (taxes.length > 0 ? taxes : [{ percent: 0, taxable: Math.max(0, (invoice.subtotal || 0) - (invoice.discountAmount || 0)), amount: 0 }]);

  const headerSettlement = `
  <ram:ApplicableHeaderTradeSettlement>
    <ram:InvoiceCurrencyCode>${xmlEscape(currency)}</ram:InvoiceCurrencyCode>
    <ram:PaymentReference>${xmlEscape(invoice.invoiceNumber)}</ram:PaymentReference>
    ${paymentTerms ? `<ram:SpecifiedTradePaymentTerms><ram:Description>${xmlEscape(paymentTerms)}</ram:Description></ram:SpecifiedTradePaymentTerms>` : ""}
    ${business.bankAccount ? `
    <ram:SpecifiedTradePaymentMeans>
      <ram:TypeCode>58</ram:TypeCode>
      <ram:PayeePartyCreditorFinancialAccount>
        <ram:IBANID>${xmlEscape(business.bankAccount)}</ram:IBANID>
      </ram:PayeePartyCreditorFinancialAccount>
    </ram:SpecifiedTradePaymentMeans>` : ""}
    ${headerTaxes.map((t) => `
    <ram:ApplicableTradeTax>
      <ram:TypeCode>VAT</ram:TypeCode>
      <ram:CategoryCode>${taxCategoryId(t.percent)}</ram:CategoryCode>
      <ram:RateApplicablePercent>${decimals(t.percent)}</ram:RateApplicablePercent>
      <ram:BasisAmount currencyID="${xmlEscape(currency)}">${decimals(t.taxable)}</ram:BasisAmount>
      <ram:CalculatedAmount currencyID="${xmlEscape(currency)}">${decimals(t.amount)}</ram:CalculatedAmount>
    </ram:ApplicableTradeTax>`).join("")}
    <ram:SpecifiedTradeSettlementMonetarySummation>
      <ram:LineTotalAmount currencyID="${xmlEscape(currency)}">${decimals(invoice.subtotal)}</ram:LineTotalAmount>
      <ram:TaxBasisTotalAmount currencyID="${xmlEscape(currency)}">${decimals(Math.max(0, invoice.subtotal - invoice.discountAmount))}</ram:TaxBasisTotalAmount>
      <ram:TaxTotalAmount currencyID="${xmlEscape(currency)}">${decimals(invoice.taxAmount)}</ram:TaxTotalAmount>
      <ram:GrandTotalAmount currencyID="${xmlEscape(currency)}">${decimals(invoice.total)}</ram:GrandTotalAmount>
      <ram:DuePayableAmount currencyID="${xmlEscape(currency)}">${decimals(invoice.total)}</ram:DuePayableAmount>
    </ram:SpecifiedTradeSettlementMonetarySummation>
  </ram:ApplicableHeaderTradeSettlement>`;

  const linesXml = invoice.items.map((it, idx) => {
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.unitPrice) || 0;
    const lineTotal = Number(it.lineTotal) || (qty * unit);
    const lineRate = (it.taxes && it.taxes.length > 0) ? Number(it.taxes[0].percent) || 0 : (Number(invoice.taxRate) || 0);
    return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>${idx + 1}</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>${xmlEscape(it.description)}</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:GrossPriceProductTradePrice><ram:ChargeAmount currencyID="${xmlEscape(currency)}">${decimals(unit)}</ram:ChargeAmount></ram:GrossPriceProductTradePrice>
        <ram:NetPriceProductTradePrice><ram:ChargeAmount currencyID="${xmlEscape(currency)}">${decimals(unit)}</ram:ChargeAmount></ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${decimals(qty)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${taxCategoryId(lineRate)}</ram:CategoryCode>
          <ram:RateApplicablePercent>${decimals(lineRate)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount currencyID="${xmlEscape(currency)}">${decimals(lineTotal)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
  }).join("");

  const trx = `
  <rsm:SupplyChainTradeTransaction>
    ${headerAgreement}
    <ram:ApplicableHeaderTradeDelivery />
    ${headerSettlement}
    ${linesXml}
  </rsm:SupplyChainTradeTransaction>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  ${docContext}
  ${docHeader}
  ${trx}
</rsm:CrossIndustryInvoice>`;

  return xml;
}
