import { Handlers, PageProps } from "$fresh/server.ts";

type Data = { shareToken: string; error?: string };

export const handler: Handlers<Data> = {
  GET(req, ctx) {
    const { share_token } = ctx.params as { share_token: string };
    const qs = new URL(req.url).search;
    const target = `/public/invoices/${share_token}/html${qs || ""}`;
  return new Response(null, { status: 307, headers: { Location: target, "X-Robots-Tag": "noindex" } });
  },
};

export default function PublicInvoicePage(props: PageProps<Data>) {
  const token = props.data.shareToken;
  const htmlUrl = `/public/invoices/${token}/html`;
  const pdfUrl = `/public/invoices/${token}/pdf`;
  return (
    <div class="container mx-auto p-4">
      <div class="flex items-center justify-between mb-3">
        <h1 class="text-2xl font-semibold">Invoice</h1>
        <div class="flex gap-2">
          <a class="btn btn-sm btn-primary" href={pdfUrl}>
            <i data-lucide="download" class="w-4 h-4"></i>
            Download PDF
          </a>
          <a class="btn btn-sm btn-ghost" href={htmlUrl} target="_blank">
            <i data-lucide="external-link" class="w-4 h-4"></i>
            Open HTML
          </a>
        </div>
      </div>
      {props.data.error && (
        <div class="alert alert-error mb-3"><span>{props.data.error}</span></div>
      )}
      <div class="bg-base-100 border rounded-box overflow-hidden">
        <iframe src={htmlUrl} class="w-full" style="height: calc(100vh - 200px);" />
      </div>
    </div>
  );
}
