import { ComponentChildren } from "preact";

export function Layout(props: { children: ComponentChildren; authed?: boolean }) {
  return (
    <div>
      <nav class="bg-white border-b border-gray-200">
        <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" class="font-bold">Invio</a>
          <div class="space-x-4 text-sm">
            <a href="/dashboard">Dashboard</a>
            <a href="/invoices">Invoices</a>
            <a href="/customers">Customers</a>
            <a href="/templates">Templates</a>
            <a href="/settings">Settings</a>
          </div>
          <div>
            {props.authed ? (
              <a href="/logout" class="text-sm">Logout</a>
            ) : (
              <a href="/login" class="text-sm">Login</a>
            )}
          </div>
        </div>
      </nav>
      <main class="max-w-5xl mx-auto p-4">
        {props.children}
      </main>
    </div>
  );
}
