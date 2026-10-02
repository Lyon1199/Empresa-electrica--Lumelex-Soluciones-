import client from "../api/client";

export type QuotationStatus =
    | "draft"
    | "sent"
    | "accepted"
    | "rejected"
    | "expired"
    | "cancelled";

export type QuotationItemCategory =
    | "material"
    | "labor"
    | "equipment"
    | "service"
    | "other";

export interface QuotationItemPayload {
    product_id?: number | null;
    category: QuotationItemCategory;
    description: string;
    unit: string;
    quantity: number;
    unit_price: number;
}

export interface QuotationPayload {
    customer_id: number;
    title: string;
    issue_date: string;
    valid_until: string;
    status: QuotationStatus;
    scope: string;
    notes: string;
    terms: string;
    discount_percent: number;
    tax_percent: number;
    internal_labor_enabled: boolean;
    internal_worker_count: number;
    internal_work_days: number;
    internal_daily_rate: number;
    items: QuotationItemPayload[];
}

export interface QuotationItem extends QuotationItemPayload {
    id: number;
    line_total: string;
    position: number;
}

export interface Quotation {
    id: number;
    number: string;
    customer_id: number;
    customer_name: string;
    customer_identification: string;
    customer_email: string | null;
    customer_address: string | null;
    title: string;
    issue_date: string;
    valid_until: string;
    status: QuotationStatus;
    sent_at?: string | null;
    scope: string | null;
    notes: string | null;
    terms: string | null;
    currency: string;
    subtotal: string;
    discount_percent: string;
    discount_amount: string;
    tax_percent: string;
    tax_amount: string;
    total: string;
    internal_labor_enabled?: boolean;
    internal_worker_count?: number;
    internal_work_days?: string;
    internal_daily_rate?: string;
    internal_labor_total?: string;
    items: QuotationItem[];
    created_at: string;
    updated_at: string;
}

export interface QuotationListResponse {
    data: Quotation[];
    current_page: number;
    last_page: number;
    total: number;
}

export interface PortalCredentials {
    email: string;
    password: string;
}

export interface QuotationSaveResponse {
    data: Quotation;
    project: { id: number; number: string } | null;
    portal_credentials: PortalCredentials | null;
}

export const getQuotations = async (
    search?: string,
    status?: QuotationStatus | "",
    page = 1
): Promise<QuotationListResponse> => {
    const response = await client.get("/quotations", {
        params: {
            ...(search ? { search } : {}),
            ...(status ? { status } : {}),
            page,
        },
    });

    return response.data;
};

export const getQuotation = async (id: number): Promise<Quotation> => {
    const response = await client.get(`/quotations/${id}`);
    return response.data.data;
};

export const createQuotation = async (
    payload: QuotationPayload
): Promise<QuotationSaveResponse> => {
    const response = await client.post("/quotations", payload);
    return response.data;
};

export const updateQuotation = async (
    id: number,
    payload: QuotationPayload
): Promise<QuotationSaveResponse> => {
    const response = await client.put(`/quotations/${id}`, payload);
    return response.data;
};

export const sendQuotationByEmail = async (id: number, pdf: Blob): Promise<Quotation> => {
    const formData = new FormData();
    formData.append("pdf", pdf, `Cotizacion-${id}.pdf`);
    const response = await client.post(`/quotations/${id}/send`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.data;
};

export const deleteQuotation = async (id: number): Promise<void> => {
    await client.delete(`/quotations/${id}`);
};

export const cloneQuotation = async (
    id: number,
    customer_id: number
): Promise<Quotation> => {
    const response = await client.post(`/quotations/${id}/clone`, { customer_id });
    return response.data.data;
};
