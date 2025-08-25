import { getDatabase } from "../database/init.ts";
import { Customer, CustomerModel } from "../models/customer.ts";

export const getCustomers = async () => {
  const db = getDatabase();
  const customerModel = new CustomerModel(db);
  return await customerModel.findAll();
};

export const getCustomerById = async (id: string) => {
  const db = getDatabase();
  const customerModel = new CustomerModel(db);
  return await customerModel.findById(id);
};

export const createCustomer = async (data: Omit<Customer, 'id' | 'createdAt'>) => {
  const db = getDatabase();
  const customerModel = new CustomerModel(db);
  return await customerModel.create(data);
};

export const updateCustomer = async (id: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>) => {
  const db = getDatabase();
  const customerModel = new CustomerModel(db);
  return await customerModel.update(id, data);
};

export const deleteCustomer = async (id: string) => {
  const db = getDatabase();
  const customerModel = new CustomerModel(db);
  return await customerModel.delete(id);
};