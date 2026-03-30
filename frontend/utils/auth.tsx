import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { ComponentChildren } from "preact";

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  isAdmin: boolean;
  isActive: boolean;
  permissions: Array<{ resource: string; action: string }>;
}

const AuthUserContext = createContext<AuthUser | null>(null);

// Module-level storage for SSR (workaround for Fresh 2.x two-pass rendering
// which breaks useContext — the page renders before _app.tsx's Provider exists)
let ssrAuthUser: AuthUser | null = null;

export function setSSRAuthUser(user: AuthUser | null) {
  ssrAuthUser = user;
}

export function AuthUserProvider(
  props: { value: AuthUser | null; children: ComponentChildren },
) {
  // Also set the module-level variable for SSR
  ssrAuthUser = props.value;
  return (
    <AuthUserContext.Provider value={props.value}>
      {props.children}
    </AuthUserContext.Provider>
  );
}

/** Get the current authenticated user, or null if not logged in. */
export function useAuthUser(): AuthUser | null {
  // Always call useContext to satisfy hooks rules (must be called every render)
  const contextUser = useContext(AuthUserContext);
  // On the client, useContext works normally
  if (typeof document !== "undefined") {
    return contextUser;
  }
  // Server-side: use the module-level variable (workaround for Fresh 2.x)
  return ssrAuthUser;
}

/** Check if the current user has a specific permission. Admins always return true. */
export function useHasPermission(resource: string, action: string): boolean {
  const user = useAuthUser();
  if (!user) return false;
  if (user.isAdmin) return true;
  return user.permissions.some(
    (p) => p.resource === resource && p.action === action,
  );
}
