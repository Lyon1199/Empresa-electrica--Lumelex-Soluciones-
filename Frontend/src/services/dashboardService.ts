import client from "../api/client";

export interface DashboardData {
    users: number;
    customers: number;
    projects: number;
    quotations: number;
    open_quotations: number;
    open_quotation_value: number;
    work_orders: number;
}

let cachedDashboard: { data: DashboardData; expiresAt: number } | null = null;
let pendingDashboard: Promise<DashboardData> | null = null;
const CACHE_TIME_MS = 20_000;

export const getDashboard = async (): Promise<DashboardData> => {
    if (cachedDashboard && cachedDashboard.expiresAt > Date.now()) {
        return cachedDashboard.data;
    }
    if (pendingDashboard) return pendingDashboard;

    pendingDashboard = client.get("/admin/dashboard")
        .then((response) => {
            const data = response.data.data as DashboardData;
            cachedDashboard = { data, expiresAt: Date.now() + CACHE_TIME_MS };
            return data;
        })
        .finally(() => {
            pendingDashboard = null;
        });
    return pendingDashboard;
};

export const invalidateDashboard = () => {
    cachedDashboard = null;
};