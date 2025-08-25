import { Customer } from "../models/customer.ts";

export const getCustomers = async ({ response }: { response: any }) => {
  const customers = await Customer.findAll();
  response.body = customers;
};

export const getCustomerById = async ({ params, response }: { params: { id: string }; response: any }) => {
  const customer = await Customer.findById(params.id);
  if (customer) {
    response.body = customer;
  } else {
    response.status = 404;
    response.body = { message: "Customer not found" };
  }
};

export const createCustomer = async ({ request, response }: { request: any; response: any }) => {
  const body = await request.body();
  const newCustomer = await Customer.create(body.value);
  response.status = 201;
  response.body = newCustomer;
};

export const updateCustomer = async ({ params, request, response }: { params: { id: string }; request: any; response: any }) => {
  const body = await request.body();
  const updatedCustomer = await Customer.update(params.id, body.value);
  if (updatedCustomer) {
    response.body = updatedCustomer;
  } else {
    response.status = 404;
    response.body = { message: "Customer not found" };
  }
};

export const deleteCustomer = async ({ params, response }: { params: { id: string }; response: any }) => {
  const deleted = await Customer.delete(params.id);
  if (deleted) {
    response.status = 204;
  } else {
    response.status = 404;
    response.body = { message: "Customer not found" };
  }
};