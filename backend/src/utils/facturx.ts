// Generator for Factur-X / ZUGFeRD 2.2 BASIC profile
// Perfect for uncluttered, self-hosted invoicing without the bloat
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

function taxCategoryId(rate: number): string { 
  return rate > 0 ? "S" : "Z"; 
}

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
  orderReferenceId?: string; // optional
}

export function generateFacturX22XML(
  invoice: InvoiceWithDetails,
  business: BusinessSettings,
  opts: FacturXOptions = {},
): string {
  const currency = safeCurrency(business, invoice.currency);
  const issue = fmtDateYYYYMMDD(invoice.issueDate) || fmtDateYYYYMMDD(new Date()) || "";
  
  // BASIC profile - minimal yet compliant
  const profileUrn = "urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic";

  // Tax summary
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

  // BASIC: Simplified seller party - only essential elements
  const sellerParty = `
    <ram:SellerTradeParty>
      <ram:Name>${xmlEscape(business.companyName)}</ram:Name>
      <ram:PostalTradeAddress>
        <ram:CountryID>${xmlEscape(business.companyCountryCode || opts.sellerCountryCode || "DE")}</ram:CountryID>
      </ram:PostalTradeAddress>
      ${isLikelyVatId(business.companyTaxId) ? `
      <ram:SpecifiedTaxRegistration>
        <ram:ID schemeID="VA">${xmlEscape((business.companyCountryCode || opts.sellerCountryCode || "DE") + business.companyTaxId!)}</ram:ID>
      </ram:SpecifiedTaxRegistration>` : ""}
    </ram:SellerTradeParty>`;

  // BASIC: Simplified buyer party - only essential elements
  const buyer = invoice.customer;
  const buyerParty = `
    <ram:BuyerTradeParty>
      <ram:Name>${xmlEscape(buyer.name)}</ram:Name>
      <ram:PostalTradeAddress>
        <ram:CountryID>${xmlEscape(buyer.countryCode || opts.buyerCountryCode || "DE")}</ram:CountryID>
      </ram:PostalTradeAddress>
      ${isLikelyVatId(buyer.taxId) ? `
      <ram:SpecifiedTaxRegistration>
        <ram:ID schemeID="VA">${xmlEscape((buyer.countryCode || opts.buyerCountryCode || "DE") + buyer.taxId!)}</ram:ID>
      </ram:SpecifiedTaxRegistration>` : ""}
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

  // BASIC: Simplified settlement with correct element order
  const headerSettlement = `
  <ram:ApplicableHeaderTradeSettlement>
    <ram:InvoiceCurrencyCode>${xmlEscape(currency)}</ram:InvoiceCurrencyCode>
    ${business.bankAccount ? `
    <ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:TypeCode>58</ram:TypeCode>
      <ram:PayeePartyCreditorFinancialAccount>
        <ram:IBANID>${xmlEscape(business.bankAccount)}</ram:IBANID>
      </ram:PayeePartyCreditorFinancialAccount>
    </ram:SpecifiedTradeSettlementPaymentMeans>` : ""}
    ${headerTaxes.map((t) => `
    <ram:ApplicableTradeTax>
      <ram:CalculatedAmount>${decimals(t.amount)}</ram:CalculatedAmount>
      <ram:TypeCode>VAT</ram:TypeCode>
      <ram:BasisAmount>${decimals(t.taxable)}</ram:BasisAmount>
      <ram:CategoryCode>${taxCategoryId(t.percent)}</ram:CategoryCode>
      <ram:RateApplicablePercent>${decimals(t.percent)}</ram:RateApplicablePercent>
    </ram:ApplicableTradeTax>`).join("")}
    ${paymentTerms ? `<ram:SpecifiedTradePaymentTerms><ram:Description>${xmlEscape(paymentTerms)}</ram:Description></ram:SpecifiedTradePaymentTerms>` : ""}
    <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
      <ram:LineTotalAmount>${decimals(invoice.subtotal)}</ram:LineTotalAmount>
      <ram:TaxBasisTotalAmount>${decimals(Math.max(0, invoice.subtotal - invoice.discountAmount))}</ram:TaxBasisTotalAmount>
      <ram:TaxTotalAmount currencyID="${xmlEscape(currency)}">${decimals(invoice.taxAmount)}</ram:TaxTotalAmount>
      <ram:GrandTotalAmount>${decimals(invoice.total)}</ram:GrandTotalAmount>
      <ram:DuePayableAmount>${decimals(invoice.total)}</ram:DuePayableAmount>
    </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
  </ram:ApplicableHeaderTradeSettlement>`;

  // BASIC: Essential line items only
  const linesXml = invoice.items.map((it, idx) => {
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.unitPrice) || 0;
    const lineTotal = Number(it.lineTotal) || (qty * unit);
    const lineRate = (it.taxes && it.taxes.length > 0) ? Number(it.taxes[0].percent) || 0 : (Number(invoice.taxRate) || 0);
    
    return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${idx + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${xmlEscape(it.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${decimals(unit)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
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
          <ram:LineTotalAmount>${decimals(lineTotal)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
  }).join("");

  // Correct element order for BASIC
  const trx = `
  <rsm:SupplyChainTradeTransaction>
    ${linesXml}
    ${headerAgreement}
    <ram:ApplicableHeaderTradeDelivery />
    ${headerSettlement}
  </rsm:SupplyChainTradeTransaction>`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
  ${docContext}
  ${docHeader}
  ${trx}
</rsm:CrossIndustryInvoice>`;

  return xml;
}