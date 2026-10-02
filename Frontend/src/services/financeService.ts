import client from "../api/client";

export type FinancialType = "receivable" | "payable" | "expense";
export type FinancialStatus = "pending" | "paid" | "cancelled";
export type PaymentMethod = "cash" | "bank_transfer" | "card" | "other";

export interface FinancialTransaction {
    id: number;
    type: FinancialType;
    description: string;
    category: string;
    counterparty: string | null;
    amount: string;
    issue_date: string;
    due_date: string | null;
    status: FinancialStatus;
    payment_method: PaymentMethod | null;
    paid_at: string | null;
    project_id: number | null;
    project?: { id: number; title: string } | null;
    recorder?: { id: number; name: string } | null;
}

export interface FinanceSummary {
    receivables_pending: number;
    payables_pending: number;
    collected_this_month: number;
    paid_out_this_month: number;
}

export interface FinancePage {
    data: FinancialTransaction[];
    current_page: number;
    last_page: number;
    total: number;
}

export interface NewFinancialTransaction {
    type: FinancialType;
    description: string;
    category: string;
    counterparty?: string;
    amount: number;
    issue_date: string;
    due_date?: string;
    project_id?: number;
}

export async function getFinanceSummary() {
    const response = await client.get<{ data: FinanceSummary }>("/finance/summary");
    return response.data.data;
}

export async function getFinanceTransactions(params: {
    type?: FinancialType | "";
    status?: FinancialStatus | "";
    page?: number;
}) {
    const response = await client.get<{ data: FinancePage }>("/finance/transactions", { params });
    return response.data.data;
}

export async function createFinancialTransaction(transaction: NewFinancialTransaction) {
    const response = await client.post<{ data: FinancialTransaction }>("/finance/transactions", transaction);
    return response.data.data;
}

export async function updateFinancialTransactionStatus(
    id: number,
    status: "paid" | "cancelled",
    payment_method?: PaymentMethod,
) {
    const response = await client.patch<{ data: FinancialTransaction }>(
        `/finance/transactions/${id}/status`,
        { status, ...(payment_method ? { payment_method } : {}) },
    );
    return response.data.data;
}
