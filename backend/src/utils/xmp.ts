export function generateZugferdXMP(
  fileName: string,
  conformanceLevel = "BASIC",
  version = "1.0",
): string {
  // Minimal XMP template for ZUGFeRD / Factur-X
  // See: https://github.com/zugferd/zugferd-community/blob/master/ZUGFeRD-2.0/XMP%20Sample/ZUGFeRD-2.0-XMP.xml
  
  return `<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:fx="urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#">
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:DocumentFileName>${fileName}</fx:DocumentFileName>
      <fx:Version>${version}</fx:Version>
      <fx:ConformanceLevel>${conformanceLevel}</fx:ConformanceLevel>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}
