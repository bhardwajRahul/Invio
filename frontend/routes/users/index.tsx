import { PageProps } from "fresh";
import { Layout } from "../../components/Layout.tsx";
import { LuUserPlus, LuPencil, LuShield } from "../../components/icons.tsx";
import { backendGet, getAuthHeaderFromCookie } from "../../utils/backend.ts";
import { useTranslations } from "../../i18n/context.tsx";
import { Handlers } from "fresh/compat";

type User = {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
};
type Data = { authed: boolean; isAdmin: boolean; users?: User[]; error?: string };

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
      const users = await backendGet("/api/v1/users", auth) as User[];
      return { data: { authed: true, isAdmin: true, users } };
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
};

export default function UsersIndex(props: PageProps<Data>) {
  const list = props.data.users ?? [];
  const { t } = useTranslations();
  return (
    <Layout authed={props.data.authed} isAdmin={props.data.isAdmin} path={new URL(props.url).pathname}>
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
        <h1 class="text-2xl font-semibold">{t("User Management")}</h1>
        <a
          href="/users/new"
          class="btn btn-sm btn-primary w-full sm:w-auto"
        >
          <LuUserPlus size={16} />
          {t("New User")}
        </a>
      </div>
      {props.data.error && (
        <div class="alert alert-error mb-3">
          <span>{props.data.error}</span>
        </div>
      )}
      {list.length === 0 && !props.data.error && (
        <p class="text-gray-500">{t("No users found.")}</p>
      )}
      {list.length > 0 && (
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>{t("Username")}</th>
                <th class="hidden sm:table-cell">{t("Display Name")}</th>
                <th class="hidden md:table-cell">{t("Email")}</th>
                <th>{t("Role")}</th>
                <th>{t("Status")}</th>
                <th class="text-right">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((user) => (
                <tr key={user.id}>
                  <td>
                    <a href={`/users/${user.id}`} class="link link-primary font-medium">
                      {user.username}
                    </a>
                  </td>
                  <td class="hidden sm:table-cell">
                    {user.displayName || "—"}
                  </td>
                  <td class="hidden md:table-cell">
                    {user.email || "—"}
                  </td>
                  <td>
                    {user.isAdmin ? (
                      <span class="badge badge-primary gap-1">
                        <LuShield size={12} />
                        Admin
                      </span>
                    ) : (
                      <span class="badge badge-ghost">User</span>
                    )}
                  </td>
                  <td>
                    {user.isActive ? (
                      <span class="badge badge-success badge-sm">Active</span>
                    ) : (
                      <span class="badge badge-error badge-sm">Disabled</span>
                    )}
                  </td>
                  <td class="text-right">
                    <a
                      href={`/users/${user.id}`}
                      class="btn btn-ghost btn-xs"
                      title={t("Edit")}
                    >
                      <LuPencil size={14} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
