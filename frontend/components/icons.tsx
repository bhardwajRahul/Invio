// Minimal Lucide-like SVG icon components (ISC-licensed icon shapes simplified)
// All icons sized via CSS (w-5 h-5). Stroke inherits currentColor.

type IconProps = { class?: string };

export function BuildingIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class || "w-5 h-5"}>
      <path d="M3 21h18" />
      <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
      <path d="M9 8h.01M9 12h.01M9 16h.01M12 8h.01M12 12h.01M12 16h.01M15 8h.01M15 12h.01M15 16h.01" />
    </svg>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class || "w-5 h-5"}>
      <path d="M12 22a10 10 0 1 0-10-10 4 4 0 0 0 4 4h1a2 2 0 0 1 2 2v1a3 3 0 0 0 3 3z" />
      <circle cx="7.5" cy="10.5" r="1.5" />
      <circle cx="12" cy="7.5" r="1.5" />
      <circle cx="16.5" cy="10.5" r="1.5" />
      <circle cx="12" cy="14.5" r="1.5" />
    </svg>
  );
}

export function LayoutTemplateIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class || "w-5 h-5"}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 10v10" />
    </svg>
  );
}

export function CreditCardIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class || "w-5 h-5"}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  );
}

export function PercentIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class || "w-5 h-5"}>
      <path d="M19 5L5 19" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </svg>
  );
}

export function HashIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class || "w-5 h-5"}>
      <path d="M4 9h16M4 15h16" />
      <path d="M10 3L8 21M16 3l-2 18" />
    </svg>
  );
}

export function FileCodeIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class || "w-5 h-5"}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13l-2 2 2 2" />
      <path d="M15 13l2 2-2 2" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={props.class || "w-5 h-5"}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}
