import { Handlers, PageProps } from "$fresh/server.ts";
import { Layout } from "../../../components/Layout.tsx";
import {
  backendGet,
  backendPut,
  getAuthHeaderFromCookie,
} from "../../../utils/backend.ts";

type Customer = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  countryCode?: string;
};
type Data = { authed: boolean; customer?: Customer; error?: string };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const auth = getAuthHeaderFromCookie(
      req.headers.get("cookie") || undefined,
    );
    if (!auth) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }
    const { id } = ctx.params as { id: string };
    try {
      const customer = await backendGet(
        `/api/v1/customers/${id}`,
        auth,
      ) as Customer;
      return ctx.render({ authed: true, customer });
    } catch (e) {
      return ctx.render({ authed: true, error: String(e) });
    }
  },
  async POST(req, ctx) {
    const auth = getAuthHeaderFromCookie(
      req.headers.get("cookie") || undefined,
    );
    if (!auth) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }
    const { id } = ctx.params as { id: string };
    const form = await req.formData();
    const payload = {
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      address: String(form.get("address") || ""),
        taxId: String(form.get("taxId") || ""),
        countryCode: String(form.get("countryCode") || ""),
    };
    if (!payload.name) return new Response("Name is required", { status: 400 });
    try {
      await backendPut(`/api/v1/customers/${id}`, auth, payload);
      return new Response(null, {
        status: 303,
        headers: { Location: `/customers/${id}` },
      });
    } catch (e) {
      return new Response(String(e), { status: 500 });
    }
  },
};

export default function EditCustomerPage(props: PageProps<Data>) {
  const demoMode = ((props.data as unknown) as { settings?: Record<string, unknown> }).settings?.demoMode === "true";
  const c = props.data.customer;
  return (
    <Layout authed={props.data.authed} demoMode={demoMode} path={new URL(props.url).pathname}>
      <h1 class="text-2xl font-semibold mb-4">Edit Customer</h1>
      {props.data.error && (
        <div class="alert alert-error mb-3">
          <span>{props.data.error}</span>
        </div>
      )}
      {c && (
        <form
          method="post"
          class="space-y-3 max-w-xl bg-base-100 border p-4 rounded-box"
          data-writable
        >
          <label class="form-control">
            <div class="label">
              <span class="label-text">Name</span>
            </div>
            <input
              name="name"
              value={c.name || ""}
              class="input input-bordered w-full"
              data-writable
            />
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label class="form-control">
              <div class="label">
                <span class="label-text">Email</span>
              </div>
              <input
                type="email"
                name="email"
                value={c.email || ""}
                class="input input-bordered w-full"
                data-writable
              />
            </label>
            <label class="form-control">
              <div class="label">
                <span class="label-text">Phone</span>
              </div>
              <input
                name="phone"
                value={c.phone || ""}
                class="input input-bordered w-full"
                data-writable
              />
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
            >
              {c.address || ""}
            </textarea>
          </label>
          <label class="form-control">
            <div class="label">
              <span class="label-text">Tax ID</span>
            </div>
            <input
              name="taxId"
              value={c.taxId || ""}
              class="input input-bordered w-full"
              data-writable
            />
          </label>
          <label class="form-control">
            <div class="label">
              <span class="label-text">Country Code (ISO alpha-2)</span>
            </div>
            <input
              name="countryCode"
              value={c.countryCode || ""}
              class="input input-bordered w-full"
              maxlength={2}
              placeholder="e.g. US, NL, DE"
              data-writable
            />
          </label>
          <div class="pt-2">
            <button type="submit" class="btn btn-primary" data-writable>
              <i data-lucide="save" class="w-4 h-4"></i>
              Save
            </button>
          </div>
        </form>
      )}
    </Layout>
  );
}
