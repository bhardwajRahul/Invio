import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../components/Layout.tsx";
import { backendPost, getAuthHeaderFromCookie } from "../../utils/backend.ts";

type Data = { authed: boolean; error?: string };

export const handler: Handlers<Data> = {
  GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(
      req.headers.get("cookie") || undefined,
    );
    if (!auth) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }
    return ctx.render({ authed: true });
  },
  async POST(req) {
    const auth = getAuthHeaderFromCookie(
      req.headers.get("cookie") || undefined,
    );
    if (!auth) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }
    const form = await req.formData();
    const name = String(form.get("name") || "");
    const email = String(form.get("email") || "");
    const phone = String(form.get("phone") || "");
    const address = String(form.get("address") || "");
  const taxId = String(form.get("taxId") || "");
  const countryCode = String(form.get("countryCode") || "");

    if (!name) return new Response("Name is required", { status: 400 });

    try {
      const created = await backendPost("/api/v1/customers", auth, {
        name,
        email,
        phone,
        address,
        taxId,
        countryCode,
      }) as { id: string };
      return new Response(null, {
        status: 303,
        headers: { Location: `/customers/${created.id}` },
      });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  },
};

export default function NewCustomerPage(props: PageProps<Data>) {
  const demoMode = ((props.data as unknown) as { settings?: Record<string, unknown> }).settings?.demoMode === "true";
  return (
    <Layout authed={props.data.authed} demoMode={demoMode} path={new URL(props.url).pathname}>
      <h1 class="text-2xl font-semibold mb-4">Create Customer</h1>
      {props.data.error && (
        <div class="alert alert-error mb-3">
          <span>{props.data.error}</span>
        </div>
      )}
      <form
        method="post"
        class="space-y-3 max-w-xl bg-base-100 border p-4 rounded-box"
        data-writable
      >
        <label class="form-control">
          <div class="label">
            <span class="label-text">Name</span>
          </div>
          <input name="name" class="input input-bordered w-full" required data-writable />
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label class="form-control">
            <div class="label">
              <span class="label-text">Email</span>
            </div>
            <input
              type="email"
              name="email"
              class="input input-bordered w-full"
              data-writable
            />
          </label>
          <label class="form-control">
            <div class="label">
              <span class="label-text">Phone</span>
            </div>
            <input name="phone" class="input input-bordered w-full" data-writable />
          </label>
        </div>
        <label class="form-control">
          <div class="label">
            <span class="label-text">Address</span>
          </div>
          <textarea
            name="address"
            class="textarea textarea-bordered"
            rows={3}
            data-writable
          />
        </label>
        <label class="form-control">
          <div class="label">
            <span class="label-text">Tax ID</span>
          </div>
          <input name="taxId" class="input input-bordered w-full" data-writable />
        </label>
        <label class="form-control">
          <div class="label">
            <span class="label-text">Country Code (ISO alpha-2)</span>
          </div>
          <input name="countryCode" class="input input-bordered w-full" maxlength={2} placeholder="e.g. US, NL, DE" data-writable />
        </label>
        <div class="pt-2">
          <button type="submit" class="btn btn-primary" data-writable>
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            Create Customer
          </button>
        </div>
      </form>
    </Layout>
  );
}
