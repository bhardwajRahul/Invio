import { PageProps } from "fresh";
import { Layout } from "../../components/Layout.tsx";
import { LuTrash2, LuSave } from "../../components/icons.tsx";
import {
  backendGet,
  backendPut,
  backendDelete,
  getAuthHeaderFromCookie,
} from "../../utils/backend.ts";
import { useTranslations } from "../../i18n/context.tsx";
import { Handlers } from "fresh/compat";
import PermissionsGrid from "../../components/PermissionsGrid.tsx";
import PermissionsToggle from "../../islands/PermissionsEditor.tsx";

type Permission = { resource: string; action: string };
type User = {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  isAdmin: boolean;
  isActive: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
};
type ResourceActions = Record<string, string[]>;
type Data = {
  authed: boolean;
  isAdmin: boolean;
  user?: User;
  resourceActions?: ResourceActions;
  error?: string;
  success?: string;
};

export const handler: Handlers<Data> = {
  async GET(ctx) {
    const req = ctx.req;
    const id = ctx.params.id;
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
      const [user, schema] = await Promise.all([
        backendGet(`/api/v1/users/${id}`, auth) as Promise<User>,
        backendGet("/api/v1/users/permissions-schema", auth) as Promise<{
          resourceActions: ResourceActions;
        }>,
      ]);
      return {
        data: {
          authed: true,
          isAdmin: true,
          user,
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
      if (/404|not found/i.test(msg)) {
        return new Response(null, {
          status: 303,
          headers: { Location: "/users" },
        });
      }
      return { data: { authed: true, isAdmin: true, error: msg } };
    }
  },

  async POST(ctx) {
    const req = ctx.req;
    const id = ctx.params.id;
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
    const intent = String(form.get("intent") || "save");

    if (intent === "delete") {
      try {
        await backendDelete(`/api/v1/users/${id}`, auth);
        return new Response(null, {
          status: 303,
          headers: { Location: "/users" },
        });
      } catch (e) {
        // Re-fetch user for the form
        let user: User | undefined;
        let resourceActions: ResourceActions = {};
        try {
          const [u, s] = await Promise.all([
            backendGet(`/api/v1/users/${id}`, auth) as Promise<User>,
            backendGet("/api/v1/users/permissions-schema", auth) as Promise<{
              resourceActions: ResourceActions;
            }>,
          ]);
          user = u;
          resourceActions = s.resourceActions;
        } catch {
          // ignore
        }
        return {
          data: {
            authed: true,
            isAdmin: true,
            user,
            resourceActions,
            error: String(e),
          },
        };
      }
    }

    // Save
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    const email = String(form.get("email") || "").trim();
    const displayName = String(form.get("displayName") || "").trim();
    const isAdmin = form.get("isAdmin") === "on";
    const isActive = form.get("isActive") === "on";

    // Collect permissions from individual checkboxes (name="perm.{resource}.{action}")
    const permissions: Permission[] = [];
    for (const [key, _val] of form.entries()) {
      if (key.startsWith("perm.")) {
        // key = "perm.invoices.create" → resource="invoices", action="create"
        const rest = key.substring(5); // after "perm."
        const dotIdx = rest.lastIndexOf(".");
        if (dotIdx > 0) {
          permissions.push({
            resource: rest.substring(0, dotIdx),
            action: rest.substring(dotIdx + 1),
          });
        }
      }
    }

    const body: Record<string, unknown> = {
      username,
      email: email || undefined,
      displayName: displayName || undefined,
      isAdmin,
      isActive,
      permissions,
    };
    if (password.length > 0) {
      body.password = password;
    }

    try {
      await backendPut(`/api/v1/users/${id}`, auth, body);
      return new Response(null, {
        status: 303,
        headers: { Location: `/users/${id}?saved=1` },
      });
    } catch (e) {
      // Re-fetch user for the form
      let user: User | undefined;
      let resourceActions: ResourceActions = {};
      try {
        const [u, s] = await Promise.all([
          backendGet(`/api/v1/users/${id}`, auth) as Promise<User>,
          backendGet("/api/v1/users/permissions-schema", auth) as Promise<{
            resourceActions: ResourceActions;
          }>,
        ]);
        user = u;
        resourceActions = s.resourceActions;
      } catch {
        // ignore
      }
      return {
        data: {
          authed: true,
          isAdmin: true,
          user,
          resourceActions,
          error: String(e),
        },
      };
    }
  },
};

export default function EditUser(props: PageProps<Data>) {
  const { t } = useTranslations();
  const user = props.data.user;
  const resourceActions = props.data.resourceActions ?? {};
  const url = new URL(props.url);
  const saved = url.searchParams.get("saved") === "1";

  if (!user) {
    return (
      <Layout authed={props.data.authed} isAdmin={props.data.isAdmin} path={url.pathname}>
        <div class="alert alert-error">
          <span>{props.data.error || t("User not found")}</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout authed={props.data.authed} isAdmin={props.data.isAdmin} path={url.pathname}>
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <h1 class="text-2xl font-semibold">
          {t("Edit User")}: {user.username}
        </h1>
      </div>

      {saved && (
        <div class="alert alert-success mb-3">
          <span>{t("User saved successfully.")}</span>
        </div>
      )}

      {props.data.error && (
        <div class="alert alert-error mb-3">
          <span>{props.data.error}</span>
        </div>
      )}

      <form method="post" class="space-y-4 max-w-2xl">
        <input type="hidden" name="intent" value="save" />

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
            value={user.username}
            autocomplete="off"
          />
        </div>

        {/* Password (optional on edit) */}
        <div class="form-control">
          <label class="label" for="password">
            <span class="label-text">{t("New Password")}</span>
          </label>
          <input
            type="password"
            id="password"
            name="password"
            class="input input-bordered w-full"
            minLength={8}
            placeholder={t("Leave blank to keep current password")}
            autocomplete="new-password"
          />
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
            value={user.email || ""}
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
            value={user.displayName || ""}
          />
        </div>

        {/* Admin toggle */}
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              name="isAdmin"
              class="toggle toggle-primary"
              checked={user.isAdmin}
            />
            <span class="label-text">{t("Administrator")}</span>
          </label>
        </div>

        {/* Active toggle */}
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              name="isActive"
              class="toggle toggle-success"
              checked={user.isActive}
            />
            <span class="label-text">{t("Active")}</span>
          </label>
          <label class="label">
            <span class="label-text-alt">
              {t("Disabled users cannot log in.")}
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
            currentPermissions={user.permissions}
          />
        </div>

        {/* Submit */}
        <div class="flex gap-2">-
          <button type="submit" class="btn btn-primary">
            <LuSave size={16} />
            {t("Save")}
          </button>
          <a href="/users" class="btn btn-ghost">
            {t("Cancel")}
          </a>
        </div>
      </form>

      {/* Delete form */}
      <div class="divider my-8"></div>
      <form method="post" data-confirm={t("Are you sure you want to delete this user? This action cannot be undone.")}>
        <input type="hidden" name="intent" value="delete" />
        <button type="submit" class="btn btn-error btn-outline">
          <LuTrash2 size={16} />
          {t("Delete User")}
        </button>
      </form>
    </Layout>
  );
}
