import client from "../api/client";

export type UserCategory = "all" | "admins" | "workers" | "customers" | "staff" | "unassigned";

export interface ManagedRole {
    name: string;
    slug: string;
}

export interface ManagedUser {
    id: number;
    customer_id: number | null;
    name: string;
    email: string;
    phone: string | null;
    identification: string | null;
    created_at: string;
    roles: ManagedRole[];
    customer: { id: number; name: string } | null;
}

export interface UsersPage {
    data: ManagedUser[];
    roles: ManagedRole[];
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}

export async function getUsers(
    filters: { category: UserCategory; role: string; search: string; page: number },
    signal?: AbortSignal,
): Promise<UsersPage> {
    const response = await client.get("/admin/users", {
        params: {
            category: filters.category,
            ...(filters.role ? { role: filters.role } : {}),
            ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
            page: filters.page,
        },
        signal,
    });
    return response.data as UsersPage;
}

export async function updateUserRole(userId: number, role: string): Promise<void> {
    await client.put(`/admin/users/${userId}/role`, { role });
}
