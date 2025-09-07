import { ComponentChildren } from "preact";
import { Breadcrumbs } from "./Breadcrumbs.tsx";

export function Layout(
  props: {
    children: ComponentChildren;
  authed?: boolean;
  demoMode?: boolean;
    path?: string;
    wide?: boolean;
  },
) {
  return (
    <div class="min-h-screen bg-base-200">
  <div class="navbar bg-base-100 border-b" data-demo={props.demoMode ? "true" : "false"}>
        <div class="container mx-auto flex items-center">
          {/* Left: Logo only */}
          <div class="navbar-start flex-1">
            <a href="/" class="btn btn-ghost text-xl">
              <span class="brand-logo inline-flex items-center">
                <svg
                  class="w-5 h-5 mr-2"
                  viewBox="0 0 500 500"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M104.16661834716797,437.5000305175781L104.16661834716797,104.1666488647461C104.16661834716797,81.1548080444336,122.82152557373047,62.50002670288086,145.83335876464844,62.50002670288086L354.1666259765625,62.50002670288086C377.1785888671875,62.50002670288086,395.8333740234375,81.1548080444336,395.8333740234375,104.1666488647461L395.8333740234375,437.5000305175781L333.3333740234375,395.8334045410156L291.6666259765625,437.5000305175781L249.99998474121094,395.8334045410156L208.33335876464844,437.5000305175781L166.66661071777344,395.8334045410156ZM187.49998474121094,145.83340454101562L312.5,145.83340454101562M187.49998474121094,229.16665649414062L312.5,229.16665649414062M270.8333740234375,312.5000305175781L312.5,312.5000305175781"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="41.6667"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>Invio</span>
              </span>
            </a>
          </div>
          {/* Right: nav links + auth */}
          <div class="navbar-end gap-2 items-center ml-auto justify-end">
            {props.authed && (
              <ul class="menu menu-horizontal px-1 hidden md:flex">
                <li>
                  <a href="/dashboard">
                    <i data-lucide="layout-dashboard" class="w-4 h-4">
                    </i>Dashboard
                  </a>
                </li>
                <li>
                  <a href="/invoices">
                    <i data-lucide="receipt-text" class="w-4 h-4"></i>Invoices
                  </a>
                </li>
                <li>
                  <a href="/customers">
                    <i data-lucide="users" class="w-4 h-4"></i>Customers
                  </a>
                </li>
                <li>
                  <a href="/settings">
                    <i data-lucide="settings" class="w-4 h-4"></i>Settings
                  </a>
                </li>
                <li>
                  <a href="/logout">
                    <i data-lucide="log-out" class="w-4 h-4"></i>Logout
                  </a>
                </li>
              </ul>
            )}
            {/* Mobile dropdown */}
            {props.authed && (
              <div class="dropdown dropdown-end md:hidden">
                <div tabIndex={0} role="button" class="btn btn-ghost">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </div>
                <ul
                  tabIndex={0}
                  class="menu dropdown-content bg-base-100 rounded-box z-[1] mt-2 w-52 p-2 shadow"
                >
                  <li>
                    <a href="/dashboard">
                      <i data-lucide="layout-dashboard" class="w-4 h-4">
                      </i>Dashboard
                    </a>
                  </li>
                  <li>
                    <a href="/invoices">
                      <i data-lucide="receipt-text" class="w-4 h-4"></i>Invoices
                    </a>
                  </li>
                  <li>
                    <a href="/customers">
                      <i data-lucide="users" class="w-4 h-4"></i>Customers
                    </a>
                  </li>
                  <li>
                    <a href="/settings">
                      <i data-lucide="settings" class="w-4 h-4"></i>Settings
                    </a>
                  </li>
                  <li>
                    <a href="/logout">
                      <i data-lucide="log-out" class="w-4 h-4"></i>Logout
                    </a>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <main
        class={"container mx-auto p-4 " +
          (props.wide ? "max-w-screen-2xl" : "")}
      >
        {/* If demoMode is enabled, add a tiny client-side script that disables write controls but keeps them visible */}
        {props.demoMode && (
          <>
            <script>
              {`(function(){try{const sel='[data-writable]';document.querySelectorAll(sel).forEach(function(el){if(el instanceof HTMLElement){el.setAttribute('disabled','true');el.classList.add('opacity-50','cursor-not-allowed');}});}catch(e){} })();`}
            </script>
            <script>
              {`(function(){try{const name='invio_auth';function getCookie(n){return document.cookie.split('; ').find(c=>c.split('=')[0]===n);}
                if(!getCookie(name)){
                  const b64 = btoa('demo:demo');
                  // set cookie (no HttpOnly so JS can set it). Path=/; SameSite=Lax
                  document.cookie = name + '=' + encodeURIComponent(b64) + '; Path=/; SameSite=Lax';
                }
              }catch(e){} })();`}
            </script>
          </>
        )}
        {props.authed && props.path && <Breadcrumbs path={props.path} />}
        {props.children}
      </main>
    </div>
  );
}
