import client from "../api/client";

export interface WorkOrder {
    id: number;
    number?: string;
    title?: string;
    code?: string;
    name?: string;
    status?: string;
    description?: string | null;
    created_at?: string;
    updated_at?: string;
    project?: {
        id?: number;
        name?: string;
        progress?: number;
        title?: string;
        customer?: { id?: number; name?: string };
        quotation?: { id?: number; number?: string; total?: number; total_amount?: number; amount?: number; internal_labor_total?: number };
        updates?: Array<{
            id: number;
            title: string;
            description: string;
            progress: number | null;
            photos?: Array<{ id: number; original_name: string; download_url: string }>;
        }>;
    };
    customer?: { id?: number; name?: string };
    quotation?: { id?: number; number?: string; total?: number; total_amount?: number; amount?: number; internal_labor_total?: number };
    workers?: Worker[];
    leaders?: Worker[];
    latest_reports?: DailyReport[];
    daily_reports?: DailyReport[];
    [key: string]: unknown;
}

export interface Worker {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    daily_rate?: string | number | null;
    identification: string | null;
    role?: "tecnico" | "lider_proyecto";
}

export interface DailyReport {
    id: number;
    work_order_id: number;
    worker_id?: number;
    report_date: string;
    work_done: string;
    location?: string;
    hours_worked?: number | null;
    start_time?: string | null;
    end_time?: string | null;
    materials_used?: string | null;
    issues?: string | null;
    notes?: string | null;
    created_at?: string;
    submitted_at?: string;
    worker?: Worker;
    work_order?: WorkOrder;
}

export interface Paginated<T> {
    data: T[];
    current_page?: number;
    last_page?: number;
    total?: number;
}

const unwrap = <T,>(response: { data: { data?: T } }): T =>
    (response.data.data ?? response.data) as T;

export async function getWorkOrders(page = 1, search = "", perPage = 20) {
    const response = await client.get("/work-orders", {
        params: { page, per_page: perPage, ...(search.trim() ? { search: search.trim() } : {}) },
    });
    const body = response.data;
    const result = body?.data && !Array.isArray(body.data) && Array.isArray(body.data.data)
        ? body.data
        : body;
    return (Array.isArray(result) ? { data: result } : result) as Paginated<WorkOrder>;
}

export async function getAllWorkOrders(search = "") {
    const first = await getWorkOrders(1, search, 100);
    const orders = [...(first.data ?? [])];
    const lastPage = first.last_page ?? 1;
    for (let startPage = 2; startPage <= lastPage; startPage += 4) {
        const pages = Array.from(
            { length: Math.min(4, lastPage - startPage + 1) },
            (_, index) => startPage + index,
        );
        const results = await Promise.all(pages.map((page) => getWorkOrders(page, search, 100)));
        results.forEach((result) => orders.push(...(result.data ?? [])));
    }
    return orders;
}

export async function getWorkOrder(id: number) {
    const response = await client.get(`/work-orders/${id}`);
    return unwrap<WorkOrder>(response);
}

export async function updateWorkOrder(
    id: number,
    payload: { status: string; description: string; worker_ids: number[]; leader_ids: number[] },
) {
    const response = await client.put(`/work-orders/${id}`, payload);
    return unwrap<WorkOrder>(response);
}

export async function getWorkers() {
    const response = await client.get("/workers");
    const result = unwrap<Worker[] | Paginated<Worker>>(response);
    return Array.isArray(result) ? result : result.data ?? [];
}

export async function createWorker(payload: {
    name: string;
    email: string;
    identification: string;
    phone?: string;
    daily_rate?: string | number;
    role: "tecnico" | "lider_proyecto";
}) {
    const response = await client.post("/workers", payload);
    return unwrap<Worker>(response);
}

export async function updateWorker(id: number, payload: Partial<Worker> & { role?: "tecnico" | "lider_proyecto" }) {
    const response = await client.put(`/workers/${id}`, payload);
    return unwrap<Worker>(response);
}

export async function updateWorkerDailyRate(id: number, daily_rate: number) {
    const response = await client.put(`/workers/${id}/daily-rate`, { daily_rate });
    return unwrap<{ id: number; daily_rate: number }>(response);
}

export async function submitProjectUpdate(
    projectId: number,
    payload: { title: string; description: string; progress: number; visible_to_customer: boolean; photos: File[] },
) {
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("description", payload.description);
    formData.append("progress", String(payload.progress));
    formData.append("visible_to_customer", payload.visible_to_customer ? "1" : "0");
    payload.photos.forEach((photo) => formData.append("photos[]", photo));
    const response = await client.post(`/worker/projects/${projectId}/updates`, formData);
    return unwrap<unknown>(response);
}

export async function getAssignedWorkOrders() {
    const response = await client.get("/worker/work-orders");
    const result = unwrap<WorkOrder[] | Paginated<WorkOrder>>(response);
    return Array.isArray(result) ? result : result.data ?? [];
}

export async function getWorkerDailyReports(month: string) {
    const response = await client.get("/worker/daily-reports", { params: { month } });
    const result = unwrap<DailyReport[] | Paginated<DailyReport>>(response);
    return Array.isArray(result) ? result : result.data ?? [];
}

export async function submitWorkerDailyReport(payload: {
    work_order_id: number;
    report_date: string;
    work_done: string;
    location: string;
    hours_worked?: number;
    start_time?: string;
    end_time?: string;
    materials_used?: string;
    issues?: string;
    notes?: string;
}) {
    const response = await client.post("/worker/daily-reports", payload);
    return unwrap<DailyReport>(response);
}
