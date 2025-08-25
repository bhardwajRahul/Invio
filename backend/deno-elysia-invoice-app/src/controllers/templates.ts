import { Template } from "../models/template.ts";
import { v4 as uuidv4 } from "../utils/uuid.ts";

export const getTemplates = async ({ response }: { response: any }) => {
    const templates = await Template.findAll();
    response.body = templates;
};

export const createTemplate = async ({ request, response }: { request: any; response: any }) => {
    const body = await request.body();
    const { name, html } = body.value;

    const newTemplate = {
        id: uuidv4(),
        name,
        html,
        created_at: new Date(),
    };

    await Template.create(newTemplate);
    response.status = 201;
    response.body = newTemplate;
};

export const updateTemplate = async ({ params, request, response }: { params: { id: string }; request: any; response: any }) => {
    const body = await request.body();
    const { name, html } = body.value;

    const updatedTemplate = {
        name,
        html,
    };

    await Template.update(params.id, updatedTemplate);
    response.status = 200;
    response.body = { message: "Template updated successfully" };
};

export const deleteTemplate = async ({ params, response }: { params: { id: string }; response: any }) => {
    await Template.delete(params.id);
    response.status = 204;
};

export const getTemplateById = async ({ params, response }: { params: { id: string }; response: any }) => {
    const template = await Template.findById(params.id);
    if (template) {
        response.body = template;
    } else {
        response.status = 404;
        response.body = { message: "Template not found" };
    }
};