import { AppProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";

export default function App({ Component }: AppProps) {
  return (
  <html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invio</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    {/* Early theme init to prevent FOUC */}
    <script src="/app-init.js"></script>
        {/* Tailwind CDN for utilities */}
        <script src="https://cdn.tailwindcss.com"></script>
        {/* daisyUI precompiled CSS */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.min.css"
        />
        {/* Inter font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <style>
          {`html{font-family:Inter,ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,\"Noto Sans\",\"Liberation Sans\",sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",\"Segoe UI Symbol\",\"Noto Color Emoji\"}
          /* Theme-aware brand logo color */
          html[data-theme='light'] .brand-logo{color:#17184b !important; opacity:1 !important}
          html[data-theme='dark'] .brand-logo{color:#d6b4fc !important; opacity:1 !important}
          html[data-theme='light'] .brand-logo svg{stroke:#17184b !important}
          html[data-theme='dark'] .brand-logo svg{stroke:#d6b4fc !important}
          `}
        </style>
      </Head>
      <body class="min-h-screen bg-base-200 text-base-content">
        <Component />
      </body>
    </html>
  );
}
