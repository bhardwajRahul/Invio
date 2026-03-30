<script lang="ts">
  import { getContext } from "svelte";
  import { enhance } from "$app/forms";

  let { form } = $props();

  let t = getContext("i18n") as (key: string, params?: Record<string, string>) => string;
  
  let isLoading = $state(false);
</script>

<div class="hero min-h-[80vh] bg-base-200">
  <div class="hero-content flex-col w-full max-w-md">
    <div class="card shrink-0 w-full shadow-xl bg-base-100 border border-base-300">
      <div class="card-body">
        <h2 class="text-2xl font-semibold text-center mb-2">{t("Welcome to Invio")}</h2>
        <form method="POST" use:enhance={() => {
          isLoading = true;
          return async ({ update }) => {
            await update();
            isLoading = false;
          };
        }}>
          {#if form?.error}
            <div class="alert alert-error mb-3">
              <span>{t(form.error, (form as any)?.errorParams)}</span>
            </div>
          {/if}

          <div class="form-control">
            <label class="label" for="username">
              <span class="label-text">{t("Username")}</span>
            </label>
            <input
              id="username"
              type="text"
              name="username"
              placeholder={t("Enter your username")}
              class="input input-bordered w-full"
              value={form?.username ?? ""}
              autocomplete="username"
              required
              disabled={isLoading}
            />
          </div>

          <div class="form-control mt-2">
            <label class="label" for="password">
              <span class="label-text">{t("Password")}</span>
            </label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder={t("Enter your password")}
              class="input input-bordered w-full"
              autocomplete="current-password"
              required
              disabled={isLoading}
            />
          </div>

          <div class="form-control mt-6">
            <button class="btn btn-primary w-full" type="submit" disabled={isLoading}>
              {#if isLoading}
                <span class="loading loading-spinner"></span>
              {/if}
              {t("Login")}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
