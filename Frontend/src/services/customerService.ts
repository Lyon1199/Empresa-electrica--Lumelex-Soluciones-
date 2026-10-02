import client from "../api/client";

export type CustomerType = "person" | "company";

export interface Customer {
    id: number;
    name: string;
    customer_type: CustomerType;
    identification: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    contact_person?: string;
    contact_phone?: string;
    notes?: string;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CustomerPayload {
    name: string;
    customer_type: CustomerType;
    identification: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    contact_person?: string;
    contact_phone?: string;
    notes?: string;
    active?: boolean;
}

export const getCustomers = async (
    search?: string,
    customerType?: CustomerType,
    perPage?: number,
    activeOnly?: boolean
) => {

    const response = await client.get(
        "/customers",
        {
            params: {
                ...(search ? { search } : {}),
                ...(customerType ? { customer_type: customerType } : {}),
                ...(perPage ? { per_page: perPage } : {}),
                ...(activeOnly ? { active: true } : {}),
            },
        }
    );

    return response.data;
};

export const getCustomer = async (
    id: number
) => {

    const response = await client.get(
        `/customers/${id}`
    );

    return response.data.data;
};

export const createCustomer = async (
    data: CustomerPayload
) => {

    const response = await client.post(
        "/customers",
        data
    );

    return response.data;
};

export const updateCustomer = async (
    id: number,
    data: CustomerPayload
) => {

    const response = await client.put(
        `/customers/${id}`,
        data
    );

    return response.data;
};

export const deleteCustomer = async (
    id: number
) => {

    const response = await client.delete(
        `/customers/${id}`
    );

    return response.data;
};