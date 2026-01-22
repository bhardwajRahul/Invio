import { createContext } from "preact";
import { ComponentChildren } from "preact";
import { useContext } from "preact/hooks";
import { DEFAULT_LOCALIZATION, LocalizationConfig } from "./mod.ts";

export const LocalizationContext = createContext<LocalizationConfig>(
  DEFAULT_LOCALIZATION,
);

export function LocalizationProvider(
  props: { value: LocalizationConfig; children: ComponentChildren },
) {
  return (
    <LocalizationContext.Provider value={props.value}>
      {props.children}
    </LocalizationContext.Provider>
  );
}

export function useTranslations() {
  return useContext(LocalizationContext);
}
