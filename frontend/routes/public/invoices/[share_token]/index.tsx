import { Handlers, PageProps } from "$fresh/server.ts";

type Data = { shareToken: string; error?: string };

export const handler: Handlers<Data> = {
  GET(_req, ctx) {
    const { share_token } = ctx.params as { share_token: string };
    const target = `/public/invoices/${share_token}/html`;
    return new Response(null, {
      status: 307,
      headers: { Location: target, "X-Robots-Tag": "noindex" },
    });
  },
};

export default function PublicInvoicePage(props: PageProps<Data>) {
  const token = props.data.shareToken;
  const htmlUrl = `/public/invoices/${token}/html`;
  const pdfUrl = `/public/invoices/${token}/pdf`;
  const ublUrl = `/public/invoices/${token}/ubl.xml`;
  const xmlUblUrl = `/public/invoices/${token}/xml?profile=ubl21`;
  const xmlFxUrl = `/public/invoices/${token}/xml?profile=facturx22`;
  return (
    <div class="container mx-auto p-4">
      <div class="flex items-center justify-between mb-3">
        <h1 class="text-2xl font-semibold">Invoice</h1>
        <div class="flex gap-2">
          <a class="btn btn-sm btn-primary" href={pdfUrl}>
            <i data-lucide="download" class="w-4 h-4"></i>
            Download PDF
          </a>
          <a class="btn btn-sm btn-outline" href={ublUrl}>
            <i data-lucide="file-text" class="w-4 h-4"></i>
            Download UBL XML
          </a>
          <div class="dropdown dropdown-end">
            <div tabIndex={0} role="button" class="btn btn-sm btn-outline flex gap-1">
              <i data-lucide="file-text" class="w-4 h-4"></i>
              XML
              <i data-lucide="chevron-down" class="w-3 h-3"></i>
            </div>
            <ul tabIndex={0} class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-2 w-56 p-2 shadow">
              <li><a href={xmlUblUrl}>UBL 2.1 (PEPPOL)</a></li>
              <li><a href={xmlFxUrl}>Factur‑X / ZUGFeRD 2.2</a></li>
            </ul>
          </div>
          <a class="btn btn-sm btn-ghost" href={htmlUrl} target="_blank">
            <i data-lucide="external-link" class="w-4 h-4"></i>
            Open HTML
          </a>
        </div>
      </div>
      {props.data.error && (
        <div class="alert alert-error mb-3">
          <span>{props.data.error}</span>
        </div>
      )}
  <div class="bg-base-100 border border-base-300 rounded-box overflow-hidden">
        <iframe
          src={htmlUrl}
          class="w-full"
          style="height: calc(100vh - 200px);"
        />
      </div>
    </div>
  );
}
