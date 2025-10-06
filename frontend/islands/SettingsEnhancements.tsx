import { useEffect } from "preact/hooks";

export default function SettingsEnhancements() {
  useEffect(() => {
    // Highlight color sync
    const input = document.getElementById('highlight-input') as HTMLInputElement | null;
    const swatch = document.getElementById('highlight-swatch') as HTMLElement | null;
    const applyColor = (val: string) => {
      if (!val || !swatch) return;
      swatch.style.background = val;
    };
    const onInput = () => {
      if (!input) return;
      const val = input.value || '';
      if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(val)) applyColor(val);
    };
    input?.addEventListener('input', onInput);

    // Logo URL validation
    const logoInput = document.getElementById('logo-input') as HTMLInputElement | null;
    const logoErr = document.getElementById('logo-error') as HTMLElement | null;
    const isValidLogo = (v: string) => {
      if (!v) return false;
      if (v.startsWith('data:image/')) return true;
      try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
    };
    const updateLogo = () => {
      const v = (logoInput && logoInput.value) ? logoInput.value.trim() : '';
      if (!isValidLogo(v)) {
        logoErr && logoErr.classList.remove('hidden');
        return;
      }
      logoErr && logoErr.classList.add('hidden');
    };
    const onLogoTyping = () => { logoErr && logoErr.classList.add('hidden'); };
    logoInput?.addEventListener('change', updateLogo);
    logoInput?.addEventListener('input', onLogoTyping);
    if (logoInput?.value) updateLogo();

    return () => {
      input?.removeEventListener('input', onInput);
      logoInput?.removeEventListener('change', updateLogo);
      logoInput?.removeEventListener('input', onLogoTyping);
    };
  }, []);
  return null;
}
