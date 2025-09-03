import { ComponentChildren } from "preact";
import { Breadcrumbs } from "./Breadcrumbs.tsx";

export function Layout(props: { children: ComponentChildren; authed?: boolean; path?: string; wide?: boolean }) {
  return (
  <div class="min-h-screen bg-base-200">
      <div class="navbar bg-base-100 border-b">
  <div class="container mx-auto flex items-center">
          {/* Left: Logo only */}
          <div class="navbar-start flex-1">
            <a href="/" class="btn btn-ghost text-xl">
              <i data-lucide="file-text" class="w-5 h-5 mr-2"></i>
              Invio
            </a>
          </div>
          {/* Right: nav links + auth */}
          <div class="navbar-end gap-2 items-center ml-auto justify-end">
            {props.authed && (
              <ul class="menu menu-horizontal px-1 hidden md:flex">
                <li><a href="/dashboard"><i data-lucide="layout-dashboard" class="w-4 h-4"></i>Dashboard</a></li>
                <li><a href="/invoices"><i data-lucide="receipt-text" class="w-4 h-4"></i>Invoices</a></li>
                <li><a href="/customers"><i data-lucide="users" class="w-4 h-4"></i>Customers</a></li>
                <li><a href="/templates"><i data-lucide="layers" class="w-4 h-4"></i>Templates</a></li>
                <li><a href="/settings"><i data-lucide="settings" class="w-4 h-4"></i>Settings</a></li>
                <li><a href="/logout"><i data-lucide="log-out" class="w-4 h-4"></i>Logout</a></li>
              </ul>
            )}
            {/* Mobile dropdown */}
            {props.authed && (
            <div class="dropdown dropdown-end md:hidden">
              <div tabIndex={0} role="button" class="btn btn-ghost">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
              </div>
              <ul tabIndex={0} class="menu dropdown-content bg-base-100 rounded-box z-[1] mt-2 w-52 p-2 shadow">
                <li><a href="/dashboard"><i data-lucide="layout-dashboard" class="w-4 h-4"></i>Dashboard</a></li>
                <li><a href="/invoices"><i data-lucide="receipt-text" class="w-4 h-4"></i>Invoices</a></li>
                <li><a href="/customers"><i data-lucide="users" class="w-4 h-4"></i>Customers</a></li>
                <li><a href="/templates"><i data-lucide="layers" class="w-4 h-4"></i>Templates</a></li>
                <li><a href="/settings"><i data-lucide="settings" class="w-4 h-4"></i>Settings</a></li>
                <li><a href="/logout"><i data-lucide="log-out" class="w-4 h-4"></i>Logout</a></li>
              </ul>
            </div>
            )}
          </div>
        </div>
      </div>
  <main class={"container mx-auto p-4 " + (props.wide ? "max-w-screen-2xl" : "")}>
        {props.authed && props.path && <Breadcrumbs path={props.path} />}
        {props.children}
      </main>
    </div>
  );
}
