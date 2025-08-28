import { AppProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";

export default function App({ Component }: AppProps) {
  return (
  <html>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Invio Admin</title>
      </Head>
      <body class="min-h-screen bg-gray-50 text-gray-900">
        <Component />
      </body>
    </html>
  );
}
