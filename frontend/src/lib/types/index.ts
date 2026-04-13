export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  isAdmin: boolean;
  isActive: boolean;
  permissions: Array<{ resource: string; action: string }>;
}

export function hasPermission(
  user: AuthUser | null,
  resource: string,
  action: string,
): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  return user.permissions.some(
    (p) => p.resource === resource && p.action === action,
  );
}
