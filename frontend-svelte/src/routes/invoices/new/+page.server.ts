import { backendGet } from "$lib/backend";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.authHeader) {
        throw redirect(303, "/login");
    }
    
    // Load prerequisites for new invoice
    const [customersRes, productsRes, taxDefinitionsRes] = await Promise.allSettled([
        backendGet("/api/v1/customers", locals.authHeader),
        backendGet("/api/v1/products", locals.authHeader),
        backendGet("/api/v1/tax-definitions", locals.authHeader)
    ]);

    return {
        customers: customersRes.status === "fulfilled" ? customersRes.value : [],
        products: productsRes.status === "fulfilled" ? productsRes.value : [],
        taxDefinitions: taxDefinitionsRes.status === "fulfilled" ? taxDefinitionsRes.value : []
    };
};
