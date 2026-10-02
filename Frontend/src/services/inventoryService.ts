import client from "../api/client";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface InventoryProduct {
    id: number;
    sku: string | null;
    name: string;
    description: string | null;
    category: string | null;
    unit: string;
    unit_price: number | string;
    stock_quantity: number | string;
    minimum_stock: number | string;
    is_active: boolean;
    stock_status: StockStatus;
    image_url: string | null;
}

export interface InventoryProductPayload {
    sku?: string | null;
    name: string;
    description?: string | null;
    category?: string | null;
    unit: string;
    unit_price: number;
    stock_quantity: number;
    minimum_stock: number;
    is_active: boolean;
}

export const getInventoryProducts = async () => {
    const response = await client.get<{ data: InventoryProduct[] }>("/inventory-products", {
        params: { per_page: 100 },
    });
    return response.data.data;
};

export const createInventoryProduct = async (payload: InventoryProductPayload) => {
    const response = await client.post<{ data: InventoryProduct }>("/inventory-products", payload);
    return response.data.data;
};

export const updateInventoryProduct = async (
    id: number,
    payload: InventoryProductPayload
) => {
    const response = await client.put<{ data: InventoryProduct }>(
        `/inventory-products/${id}`,
        payload
    );
    return response.data.data;
};

export const uploadInventoryProductImage = async (id: number, image: File) => {
    const formData = new FormData();
    formData.append("image", image);
    const response = await client.post<{ data: InventoryProduct }>(
        `/inventory-products/${id}/image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data.data;
};

export const deleteInventoryProductImage = async (id: number) => {
    const response = await client.delete<{ data: InventoryProduct }>(
        `/inventory-products/${id}/image`,
    );
    return response.data.data;
};

export const deleteInventoryProduct = async (id: number) => {
    await client.delete(`/inventory-products/${id}`);
};

export const adjustInventoryStock = async (
    id: number,
    quantity_change: number,
    reason: string
) => {
    const response = await client.post(`/inventory-products/${id}/adjustments`, {
        quantity_change,
        reason,
    });
    return response.data;
};
