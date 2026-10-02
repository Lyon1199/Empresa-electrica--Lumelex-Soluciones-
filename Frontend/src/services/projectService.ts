import client from "../api/client";
import type { QuotationStatus } from "./quotationService";

export type ProjectStatus =
    | "planning"
    | "in_progress"
    | "on_hold"
    | "completed"
    | "cancelled";

export type ReceiptStatus = "pending" | "approved" | "rejected";

export interface ProjectUpdate {
    id: number;
    title: string;
    description: string;
    progress: number | null;
    visible_to_customer: boolean;
    created_at: string;
    creator?: { id: number; name: string } | null;
    photos?: Array<{
        id: number;
        original_name: string;
        mime_type: string;
        download_url: string;
    }>;
}

export interface ProjectMaterial {
    id: number;
    project_id: number;
    name: string;
    quantity: string;
    unit: string;
    unit_cost: string;
    total_cost: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
    recorder?: { id: number; name: string } | null;
}

export interface DepositReceipt {
    id: number;
    project_id: number;
    original_name: string;
    mime_type: string;
    size: number;
    amount: string | null;
    notes: string | null;
    status: ReceiptStatus;
    review_notes: string | null;
    reviewed_at?: string | null;
    created_at: string;
    uploader?: { id: number; name: string; email: string } | null;
    reviewer?: { id: number; name: string } | null;
    project?: Project;
}

export interface WorkOrder {
    id: number;
    number: string;
    status: string;
    description: string | null;
    created_at: string;
}

export interface Project {
    id: number;
    number: string;
    customer_id: number;
    title: string;
    status: ProjectStatus;
    progress: number;
    description: string | null;
    starts_at: string | null;
    target_date: string | null;
    customer: {
        id: number;
        name: string;
        identification: string;
        email: string | null;
        phone?: string | null;
        address?: string | null;
        portal_users?: { id: number; name: string; email: string }[];
    };
    quotation?: {
        id: number;
        number: string;
        title?: string;
        total: string;
        status: QuotationStatus;
        issue_date?: string;
        valid_until?: string;
    };
    work_order?: WorkOrder | null;
    updates?: ProjectUpdate[];
    materials?: ProjectMaterial[];
    deposit_receipts?: DepositReceipt[];
    deposit_receipts_count?: number;
    created_at: string;
}

export interface ProjectListResponse {
    data: Project[];
    current_page: number;
    last_page: number;
    total: number;
}

export const getProjects = async (search = "", status = "") => {
    const response = await client.get<ProjectListResponse>("/projects", {
        params: {
            ...(search ? { search } : {}),
            ...(status ? { status } : {}),
        },
    });
    return response.data;
};

export const getProject = async (id: number): Promise<Project> => {
    const response = await client.get<{ data: Project }>(`/projects/${id}`);
    return response.data.data;
};

export interface ProjectUpdatePayload {
    status: ProjectStatus;
    progress: number;
    starts_at: string | null;
    target_date: string | null;
    update_title: string;
    update_description: string;
    visible_to_customer: boolean;
}

export const updateProject = async (
    id: number,
    data: ProjectUpdatePayload
): Promise<Project> => {
    const response = await client.put<{ data: Project }>(`/projects/${id}`, data);
    return response.data.data;
};

export interface ProjectMaterialPayload {
    name: string;
    quantity: number;
    unit: string;
    unit_cost: number;
    notes: string;
}

export const createProjectMaterial = async (projectId: number, data: ProjectMaterialPayload) => {
    const response = await client.post<{ data: ProjectMaterial }>(`/projects/${projectId}/materials`, data);
    return response.data.data;
};

export const updateProjectMaterial = async (
    projectId: number,
    materialId: number,
    data: ProjectMaterialPayload,
) => {
    const response = await client.put<{ data: ProjectMaterial }>(
        `/projects/${projectId}/materials/${materialId}`,
        data,
    );
    return response.data.data;
};

export const deleteProjectMaterial = async (projectId: number, materialId: number) => {
    await client.delete(`/projects/${projectId}/materials/${materialId}`);
};

export const getCustomerProjects = async (): Promise<Project[]> => {
    const response = await client.get<{ data: Project[] }>("/customer/projects");
    return response.data.data;
};

export const uploadDepositReceipt = async (
    projectId: number,
    file: File,
    amount: string,
    notes: string
): Promise<DepositReceipt> => {
    const formData = new FormData();
    formData.append("receipt", file);
    if (amount) formData.append("amount", amount);
    if (notes) formData.append("notes", notes);
    const response = await client.post<{ data: DepositReceipt }>(
        `/customer/projects/${projectId}/deposit-receipts`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data.data;
};

export const getDepositReceipts = async (): Promise<DepositReceipt[]> => {
    const response = await client.get<{ data: DepositReceipt[] }>("/deposit-receipts", {
        params: { per_page: 100 },
    });
    return response.data.data;
};

export const reviewDepositReceipt = async (
    id: number,
    status: Exclude<ReceiptStatus, "pending">,
    reviewNotes: string
): Promise<DepositReceipt> => {
    const response = await client.put<{ data: DepositReceipt }>(
        `/deposit-receipts/${id}/review`,
        { status, review_notes: reviewNotes }
    );
    return response.data.data;
};

export const downloadDepositReceipt = async (id: number, fileName: string) => {
    const url = window.location.pathname.startsWith("/cliente")
        ? `/customer/deposit-receipts/${id}/download`
        : `/deposit-receipts/${id}/download`;
    const response = await client.get(url, { responseType: "blob" });
    const objectUrl = URL.createObjectURL(response.data as Blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export const updateCustomerPassword = async (
    currentPassword: string,
    password: string,
    passwordConfirmation: string
) => {
    const response = await client.put("/customer/password", {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
    });
    return response.data;
};
