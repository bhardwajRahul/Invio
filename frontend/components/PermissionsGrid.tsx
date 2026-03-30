/**
 * Server-rendered permissions grid.
 *
 * Each permission gets its own checkbox with name="perm.{resource}.{action}".
 * Checked checkboxes are included in the form submission by the browser (value "on").
 * The POST handler collects all "perm.*" entries to build the permissions array.
 *
 * This component does NOT require client-side hydration, so it works identically
 * in dev mode, built mode, with or without JavaScript.
 */
type Permission = { resource: string; action: string };

interface Props {
  resourceActions: Record<string, string[]>;
  currentPermissions: Permission[];
}

//Pretty-print a resource name
function formatResource(r: string): string {
  return r
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Pretty-print an action name
function formatAction(a: string): string {
  return a.charAt(0).toUpperCase() + a.slice(1);
}

export default function PermissionsGrid(props: Props) {
  const { resourceActions = {}, currentPermissions = [] } = props;

  // Build a Set for fast lookup
  const permSet = new Set(
    currentPermissions.map((p) => `${p.resource}:${p.action}`),
  );

  // Collect all unique actions across all resources (column headers)
  const allActions = Array.from(
    new Set(Object.values(resourceActions).flat()),
  );

  return (
    <div id="permissions-grid">
      {/* Permissions grid */}
      <div class="overflow-x-auto border border-base-300 rounded-lg">
        <table class="table table-sm table-pin-rows">
          <thead>
            <tr>
              <th class="bg-base-200">Resource</th>
              {allActions.map((action) => (
                <th key={action} class="bg-base-200 text-center">
                  {formatAction(action)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(resourceActions).map(([resource, actions]) => (
              <tr key={resource}>
                <td class="font-medium">{formatResource(resource)}</td>
                {allActions.map((action) => {
                  const available = actions.includes(action);
                  const key = `${resource}:${action}`;
                  const name = `perm.${resource}.${action}`;
                  if (!available) {
                    return (
                      <td key={action} class="text-center">
                        <span class="text-base-content/20">—</span>
                      </td>
                    );
                  }
                  return (
                    <td key={action} class="text-center">
                      <input
                        type="checkbox"
                        class="checkbox checkbox-sm checkbox-primary"
                        name={name}
                        checked={permSet.has(key)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
