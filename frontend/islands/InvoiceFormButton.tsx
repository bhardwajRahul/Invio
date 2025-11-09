import { useEffect, useState } from "preact/hooks";
import { LuSave } from "../components/icons.tsx";

export default function InvoiceFormButton(
  { formId, label }: { formId: string; label: string },
) {
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const checkValidity = () => {
      const validAttr = form.getAttribute("data-valid");
      setIsValid(validAttr === "true");
    };

    // Initial check
    checkValidity();

    // Watch for changes using MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "data-valid"
        ) {
          checkValidity();
        }
      });
    });

    observer.observe(form, {
      attributes: true,
      attributeFilter: ["data-valid"],
    });

    return () => observer.disconnect();
  }, [formId]);

  return (
    <button
      type="submit"
      form={formId}
      class="btn btn-primary"
      disabled={!isValid}
    >
      <LuSave size={16} />
      <span>{label}</span>
    </button>
  );
}
