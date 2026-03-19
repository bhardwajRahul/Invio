import { backendGet } from "$lib/backend";
import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.authHeader) {
        throw redirect(303, "/login");
    }

    try {
        const [invoiceRes, customersRes, productsRes, taxDefinitionsRes] = await Promise.allSettled([
            backendGet(`/api/v1/invoices/${params.id}`, locals.authHeader),
            backendGet("/api/v1/customers", locals.authHeader),
            backendGet("/api/v1/products", locals.authHeader),
            backendGet("/api/v1/tax-definitions", locals.authHeader)
        ]);

        if (invoiceRes.status !== "fulfilled") {
            throw error(404, "Invoice not found");
        }

        return {
            invoice: invoiceRes.value,
            customers: customersRes.status === "fulfilled" ? customersRes.value : [],
            products: productsRes.status === "fulfilled" ? productsRes.value : [],
            taxDefinitions: taxDefinitionsRes.status === "fulfilled" ? taxDefinitionsRes.value : []
        };
    } catch (err: any) {
        throw error(404, err?.message || "Invoice not found");
    }
};