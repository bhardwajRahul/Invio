import { PageProps } from "fresh";
import { Layout } from "../../components/Layout.tsx";
import {
  backendGet,
  backendPost,
  getAuthHeaderFromCookie,
} from "../../utils/backend.ts";
import { useTranslations } from "../../i18n/context.tsx";
import { Handlers } from "fresh/compat";
import PermissionsGrid from "../../components/PermissionsGrid.tsx";
import PermissionsToggle from "../../islands/PermissionsEditor.tsx";

type ResourceActions = Record<string, string[]>;
type Data = {
  authed: boolean;
  isAdmin: boolean;
  resourceActions?: ResourceActions;
  error?: string;
  formData?: Record<string, string>;
};

export const handler: Handlers<Data> = {
  async GET(ctx) {
    const req = ctx.req;
    const auth = getAuthHeaderFromCookie(
      req.headers.get("cookie") || undefined,
    );
    if (!auth) {
      return new Response(null, {
        status: 303,
        headers: { Location: "/login" },
      });
    }
    try {
      const schema = await backendGet(
        "/api/v1/users/permissions-schema",
        auth,
      ) as { resourceActions: ResourceActions };
      return {
        data: {
          authed: true,
          isAdmin: true,
          resourceActions: schema.resourceActions,
        },
      };
    } catch (e) {
      const msg = String(e);
      if (/403|Forbidden/i.test(msg)) {
        return new Response(null, {
          status: 303,
          headers: { Location: "/dashboard" },
        });
      }
      return { data: { authed: true, isAdmin: true, error: msg } };
    }
  },

  async POST(ctx) {
    const req = ctx.req;
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
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    const email = String(form.get("email") || "").trim();
    const displayName = String(form.get("displayName") || "").trim();
    const isAdmin = form.get("isAdmin") === "on";

    // Collect permissions from individual checkboxes (name="perm.{resource}.{action}")
    const permissions: Array<{ resource: string; action: string }> = [];
    for (const [key, _val] of form.entries()) {
      if (key.startsWith("perm.")) {
        const rest = key.substring(5);
        const dotIdx = rest.lastIndexOf(".");
        if (dotIdx > 0) {
          permissions.push({
            resource: rest.substring(0, dotIdx),
            action: rest.substring(dotIdx + 1),
          });
        }
      }
    }

    try {
      await backendPost("/api/v1/users", auth, {
        username,
        password,
        email: email || undefined,
        displayName: displayName || undefined,
        isAdmin,
        permissions,
      });
      return new Response(null, {
        status: 303,
        headers: { Location: "/users" },
      });
    } catch (e) {
      // Re-fetch schema for the form
      let resourceActions: ResourceActions = {};
      try {
        const schema = await backendGet(
          "/api/v1/users/permissions-schema",
          auth,
        ) as { resourceActions: ResourceActions };
        resourceActions = schema.resourceActions;
      } catch {
        // ignore
      }

      return {
        data: {
          authed: true,
          isAdmin: true,
          resourceActions,
          error: String(e),
          formData: { username, email, displayName },
        },
      };
    }
  },
};

export default function NewUser(props: PageProps<Data>) {
  const { t } = useTranslations();
  const resourceActions = props.data.resourceActions ?? {};
  const fd = props.data.formData ?? {};

  return (
    <Layout authed={props.data.authed} isAdmin={props.data.isAdmin} path={new URL(props.url).pathname}>
      <h1 class="text-2xl font-semibold mb-4">{t("New User")}</h1>

      {props.data.error && (
        <div class="alert alert-error mb-3">
          <span>{props.data.error}</span>
        </div>
      )}

      <form method="post" class="space-y-4 max-w-2xl">
        {/* Username */}
        <div class="form-control">
          <label class="label" for="username">
            <span class="label-text">{t("Username")} *</span>
          </label>
          <input
            type="text"
            id="username"
            name="username"
            class="input input-bordered w-full"
            required
            value={fd.username || ""}
            autocomplete="off"
          />
        </div>

        {/* Password */}
        <div class="form-control">
          <label class="label" for="password">
            <span class="label-text">{t("Password")} *</span>
          </label>
          <input
            type="password"
            id="password"
            name="password"
            class="input input-bordered w-full"
            required
            minLength={8}
            autocomplete="new-password"
          />
          <label class="label">
            <span class="label-text-alt">{t("Minimum 8 characters")}</span>
          </label>
        </div>

        {/* Email */}
        <div class="form-control">
          <label class="label" for="email">
            <span class="label-text">{t("Email")}</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            class="input input-bordered w-full"
            value={fd.email || ""}
          />
        </div>

        {/* Display Name */}
        <div class="form-control">
          <label class="label" for="displayName">
            <span class="label-text">{t("Display Name")}</span>
          </label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            class="input input-bordered w-full"
            value={fd.displayName || ""}
          />
        </div>

        {/* Admin toggle */}
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              name="isAdmin"
              class="toggle toggle-primary"
            />
            <span class="label-text">{t("Administrator")}</span>
          </label>
          <label class="label">
            <span class="label-text-alt">
              {t("Administrators have full access to all features.")}
            </span>
          </label>
        </div>

        {/* Permissions */}
        <div class="form-control">
          <label class="label">
            <span class="label-text font-medium">{t("Permissions")}</span>
          </label>
          <p class="text-sm text-base-content/60 mb-2">
            {t("Select which resources and actions this user can access. Admins bypass these checks.")}
          </p>
          <PermissionsToggle />
          <PermissionsGrid
            resourceActions={resourceActions}
            currentPermissions={[]}
          />
        </div>

        {/* Submit */}
        <div class="flex gap-2">
          <button type="submit" class="btn btn-primary">
            {t("Create User")}
          </button>
          <a href="/users" class="btn btn-ghost">
            {t("Cancel")}
          </a>
        </div>
      </form>
    </Layout>
  );
}
