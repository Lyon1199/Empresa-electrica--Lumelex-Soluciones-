import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getProjects } from "../../services/projectService";
import type { Project } from "../../services/projectService";
import {
    createFinancialTransaction,
    getFinanceSummary,
    getFinanceTransactions,
    updateFinancialTransactionStatus,
} from "../../services/financeService";
import type {
    FinanceSummary,
    FinancialStatus,
    FinancialTransaction,
    FinancialType,
    PaymentMethod,
} from "../../services/financeService";

const currency = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
const today = () => new Date().toISOString().slice(0, 10);
const typeLabels: Record<FinancialType, string> = {
    receivable: "Cuenta por cobrar",
    payable: "Cuenta por pagar",
    expense: "Gasto",
};
const statusLabels: Record<FinancialStatus, string> = {
    pending: "Pendiente",
    paid: "Pagado",
    cancelled: "Anulado",
};
const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
    { value: "bank_transfer", label: "Transferencia" },
    { value: "cash", label: "Efectivo" },
    { value: "card", label: "Tarjeta" },
    { value: "other", label: "Otro" },
];

const initialForm = {
    type: "expense" as FinancialType,
    description: "",
    category: "",
    counterparty: "",
    amount: "",
    issue_date: today(),
    due_date: "",
    project_id: "",
};

function errorMessage(error: unknown) {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response;
        const errors = response?.data?.errors;
        if (errors) return Object.values(errors).flat().join(" ");
        if (response?.data?.message) return response.data.message;
    }
    return "No se pudo completar la operación. Intenta nuevamente.";
}

function Finance() {
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [typeFilter, setTypeFilter] = useState<FinancialType | "">("");
    const [statusFilter, setStatusFilter] = useState<FinancialStatus | "">("");
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [form, setForm] = useState(initialForm);
    const [paymentMethodsById, setPaymentMethodsById] = useState<Record<number, PaymentMethod>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadData = useCallback(async () => {
        try {
            const [summaryData, result] = await Promise.all([
                getFinanceSummary(),
                getFinanceTransactions({ type: typeFilter, status: statusFilter, page }),
            ]);
            setSummary(summaryData);
            setTransactions(result.data);
            setLastPage(result.last_page);
            setTotal(result.total);
        } catch (cause) {
            setError(errorMessage(cause));
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, typeFilter]);

    useEffect(() => {
        let active = true;
        Promise.all([
            getFinanceSummary(),
            getFinanceTransactions({ type: typeFilter, status: statusFilter, page }),
        ])
            .then(([summaryData, result]) => {
                if (!active) return;
                setError("");
                setSummary(summaryData);
                setTransactions(result.data);
                setLastPage(result.last_page);
                setTotal(result.total);
            })
            .catch((cause: unknown) => {
                if (active) setError(errorMessage(cause));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [page, statusFilter, typeFilter]);

    useEffect(() => {
        let active = true;
        getProjects()
            .then((result) => {
                if (active) setProjects(result.data);
            })
            .catch((cause: unknown) => {
                if (active) setError(errorMessage(cause));
            });
        return () => {
            active = false;
        };
    }, []);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            await createFinancialTransaction({
                type: form.type,
                description: form.description.trim(),
                category: form.category.trim(),
                ...(form.counterparty.trim() ? { counterparty: form.counterparty.trim() } : {}),
                amount: Number(form.amount),
                issue_date: form.issue_date,
                ...(form.due_date ? { due_date: form.due_date } : {}),
                ...(form.project_id ? { project_id: Number(form.project_id) } : {}),
            });
            setForm({ ...initialForm, issue_date: today() });
            setPage(1);
            setNotice("Movimiento financiero registrado.");
            await loadData();
        } catch (cause) {
            setError(errorMessage(cause));
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = async (transaction: FinancialTransaction, status: "paid" | "cancelled") => {
        setError("");
        setNotice("");
        try {
            await updateFinancialTransactionStatus(
                transaction.id,
                status,
                status === "paid" ? paymentMethodsById[transaction.id] ?? "bank_transfer" : undefined,
            );
            setNotice(status === "paid" ? "Pago registrado." : "Movimiento anulado.");
            await loadData();
        } catch (cause) {
            setError(errorMessage(cause));
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Finanzas</h1>
                    <p className="mt-1 text-sm text-slate-600">Cuentas por cobrar y pagar, gastos y movimientos internos.</p>
                </div>
                <div className="max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                    <strong>SRI pendiente de integración.</strong> Esta pantalla solo registra movimientos internos;
                    todavía no emite ni consulta comprobantes tributarios.
                </div>
            </header>

            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen financiero">
                {[
                    { label: "Por cobrar", value: summary?.receivables_pending },
                    { label: "Por pagar", value: summary?.payables_pending },
                    { label: "Cobrado este mes", value: summary?.collected_this_month },
                    { label: "Pagado este mes", value: summary?.paid_out_this_month },
                ].map((item) => (
                    <article key={item.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">{item.label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-900">
                            {item.value === undefined ? "—" : currency.format(item.value)}
                        </p>
                    </article>
                ))}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Registrar movimiento</h2>
                <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <label className="text-sm font-medium text-slate-700">
                        Tipo
                        <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as FinancialType })}>
                            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                        Descripción
                        <input required maxLength={255} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                        Categoría
                        <input required maxLength={100} placeholder="Materiales, servicios..." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                        Cliente / proveedor
                        <input maxLength={255} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.counterparty} onChange={(event) => setForm({ ...form, counterparty: event.target.value })} />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                        Valor (USD)
                        <input required min="0.01" step="0.01" type="number" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                        Fecha
                        <input required type="date" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.issue_date} onChange={(event) => setForm({ ...form, issue_date: event.target.value })} />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                        Vencimiento
                        <input type="date" min={form.issue_date} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                        Proyecto
                        <select className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })}>
                            <option value="">Sin proyecto</option>
                            {projects.map((project) => <option key={project.id} value={project.id}>{project.number} · {project.title}</option>)}
                        </select>
                    </label>
                    <div className="md:col-span-2 xl:col-span-4">
                        <button disabled={saving} className="rounded-lg bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300 disabled:opacity-60">
                            {saving ? "Guardando..." : "Registrar"}
                        </button>
                    </div>
                </form>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Movimientos</h2>
                        <p className="text-sm text-slate-500">{total} registros</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <select aria-label="Filtrar por tipo" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value as FinancialType | ""); setPage(1); }}>
                            <option value="">Todos los tipos</option>
                            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        <select aria-label="Filtrar por estado" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as FinancialStatus | ""); setPage(1); }}>
                            <option value="">Todos los estados</option>
                            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                            <tr>{["Fecha / vencimiento", "Tipo / concepto", "Cliente / proveedor", "Proyecto", "Valor", "Estado", "Acciones"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!loading && transactions.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No hay movimientos para estos filtros.</td></tr>}
                            {transactions.map((transaction) => (
                                <tr key={transaction.id} className="align-top">
                                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                        {transaction.issue_date}<br />
                                        <span className="text-xs text-slate-400">Vence: {transaction.due_date ?? "—"}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-medium text-slate-900">{typeLabels[transaction.type]}</span>
                                        <p className="text-slate-600">{transaction.description}</p>
                                        <span className="text-xs text-slate-400">{transaction.category}</span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{transaction.counterparty ?? "—"}</td>
                                    <td className="px-4 py-3 text-slate-600">{transaction.project?.title ?? "—"}</td>
                                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{currency.format(Number(transaction.amount))}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${transaction.status === "paid" ? "bg-emerald-100 text-emerald-800" : transaction.status === "cancelled" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"}`}>
                                            {statusLabels[transaction.status]}
                                        </span>
                                    </td>
                                    <td className="min-w-44 px-4 py-3">
                                        {transaction.status === "pending" && (
                                            <div className="flex flex-col gap-2">
                                                <select aria-label={`Método de pago para ${transaction.description}`} className="rounded border border-slate-300 px-2 py-1 text-xs" value={paymentMethodsById[transaction.id] ?? "bank_transfer"} onChange={(event) => setPaymentMethodsById({ ...paymentMethodsById, [transaction.id]: event.target.value as PaymentMethod })}>
                                                    {paymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                                                </select>
                                                <button className="text-left text-xs font-semibold text-emerald-700 hover:underline" onClick={() => void updateStatus(transaction, "paid")}>Marcar pagado</button>
                                                <button className="text-left text-xs font-semibold text-slate-500 hover:underline" onClick={() => void updateStatus(transaction, "cancelled")}>Anular</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Cargando movimientos...</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
                    <span>Página {page} de {lastPage}</span>
                    <div className="flex gap-2">
                        <button disabled={page <= 1 || loading} onClick={() => setPage(page - 1)} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50">Anterior</button>
                        <button disabled={page >= lastPage || loading} onClick={() => setPage(page + 1)} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50">Siguiente</button>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Finance;
