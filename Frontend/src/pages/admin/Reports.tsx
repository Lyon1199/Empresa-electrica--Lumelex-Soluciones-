import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getAuthenticatedUser } from "../../services/authService";
import { getDashboard, type DashboardData } from "../../services/dashboardService";
import { downloadWorkerReport, getDailyReports, recordWorkerPayment, type ReportSummary } from "../../services/reportService";
import {
    createWorker,
    getAllWorkOrders,
    getWorkers,
    updateWorker,
    updateWorkerDailyRate,
    type DailyReport,
    type WorkOrder,
    type Worker,
} from "../../services/workOrderService";

const currentMonth = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};
const currentDate = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const money = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });
const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : "—";
const numeric = (value: unknown) => Number(value ?? 0) || 0;
const getQuoteValue = (order: WorkOrder) => {
    const quote = order.project?.quotation ?? order.quotation;
    return numeric(quote?.total ?? quote?.total_amount ?? quote?.amount ?? order.quotation_total ?? order.total);
};
const getCost = (order: WorkOrder) => numeric(order.project?.quotation?.internal_labor_total ?? order.quotation?.internal_labor_total);
const orderName = (order?: WorkOrder) => order ? order.number ?? order.code ?? order.title ?? order.name ?? `OT #${order.id}` : "OT";

function Reports() {
    const [tab, setTab] = useState<"general" | "workers">("general");
    const [month, setMonth] = useState(currentMonth);
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [summary, setSummary] = useState<ReportSummary>({});
    const [selectedWorker, setSelectedWorker] = useState("");
    const [selectedOrder, setSelectedOrder] = useState("");
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [reportsLoading, setReportsLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [savingWorker, setSavingWorker] = useState(false);
    const [editingWorker, setEditingWorker] = useState<number | null>(null);
    const [canManageWorkers, setCanManageWorkers] = useState(false);
    const [canManagePayroll, setCanManagePayroll] = useState(false);
    const [payrollRefresh, setPayrollRefresh] = useState(0);
    const [editingRateWorker, setEditingRateWorker] = useState<Worker | null>(null);
    const [dailyRateDraft, setDailyRateDraft] = useState("");
    const [paymentWorkerId, setPaymentWorkerId] = useState<number | null>(null);
    const [paymentForm, setPaymentForm] = useState({ amount: "", payment_date: currentDate(), notes: "" });
    const [savingPayroll, setSavingPayroll] = useState(false);
    const [workerForm, setWorkerForm] = useState<{ name: string; email: string; identification: string; phone: string; daily_rate: string; role: "tecnico" | "lider_proyecto" }>({ name: "", email: "", identification: "", phone: "", daily_rate: "0", role: "tecnico" });

    useEffect(() => {
        let active = true;
        Promise.all([getDashboard(), getAllWorkOrders(), getWorkers(), getAuthenticatedUser()])
            .then(([stats, workOrders, workerList, user]) => {
                if (!active) return;
                setDashboard(stats);
                setOrders(workOrders);
                setWorkers(workerList);
                setCanManageWorkers(user.roles.some((role) => ["admin", "gerente", "supervisor"].includes(role)));
                setCanManagePayroll(user.roles.some((role) => ["admin", "gerente", "contabilidad", "supervisor"].includes(role)));
            })
            .catch((cause: any) => {
                if (active) setError(cause?.response?.data?.message ?? "No se pudieron cargar los datos del reporte.");
            })
            .finally(() => { if (active) setOverviewLoading(false); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        getDailyReports({
            month,
            ...(selectedWorker ? { worker_id: Number(selectedWorker) } : {}),
            ...(selectedOrder ? { work_order_id: Number(selectedOrder) } : {}),
        })
            .then((result) => {
                if (!active) return;
                setReports(result.data);
                setSummary(result.summary ?? {});
            })
            .catch((cause: any) => {
                if (active) setError(cause?.response?.data?.message ?? "No se pudieron cargar los reportes diarios.");
            })
            .finally(() => { if (active) setReportsLoading(false); });
        return () => { active = false; };
    }, [month, selectedWorker, selectedOrder, payrollRefresh]);

    const income = useMemo(() => orders.reduce((sum, order) => sum + getQuoteValue(order), 0), [orders]);
    const costs = useMemo(() => orders.reduce((sum, order) => sum + getCost(order), 0), [orders]);
    const profit = income - costs;
    const statusCounts = useMemo(() => orders.reduce<Record<string, number>>((counts, order) => {
        const key = String(order.status ?? "sin estado");
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
    }, {}), [orders]);

    const reportsByWorker = useMemo(() => reports.reduce<Record<number, number>>((counts, report) => {
        const id = report.worker_id ?? report.worker?.id ?? 0;
        counts[id] = (counts[id] ?? 0) + 1;
        return counts;
    }, {}), [reports]);
    const reportsByOrder = useMemo(() => reports.reduce<Record<number, number>>((counts, report) => {
        counts[report.work_order_id] = (counts[report.work_order_id] ?? 0) + 1;
        return counts;
    }, {}), [reports]);
    const overdueByWorker = useMemo(() => (summary.overdue_days ?? []).reduce<Record<number, number>>((counts, item) => {
        if (item.worker_id) counts[item.worker_id] = (counts[item.worker_id] ?? 0) + 1;
        return counts;
    }, {}), [summary.overdue_days]);
    const overdueByOrder = useMemo(() => (summary.overdue_days ?? []).reduce<Record<number, number>>((counts, item) => {
        if (item.work_order_id) counts[item.work_order_id] = (counts[item.work_order_id] ?? 0) + 1;
        return counts;
    }, {}), [summary.overdue_days]);

    const workerFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSavingWorker(true);
        setError("");
        setNotice("");
        try {
            if (editingWorker) {
                await updateWorker(editingWorker, workerForm);
                setNotice("La cuenta del trabajador se actualizó.");
            } else {
                await createWorker(workerForm);
                setNotice("La cuenta se creó. La contraseña inicial es el número de cédula.");
            }
            setWorkerForm({ name: "", email: "", identification: "", phone: "", daily_rate: "0", role: "tecnico" });
            setEditingWorker(null);
            setWorkers(await getWorkers());
        } catch (cause: any) {
            const errors = cause?.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(" ") : cause?.response?.data?.message ?? "No se pudo guardar la cuenta del trabajador.");
        } finally {
            setSavingWorker(false);
        }
    };

    const editWorker = (worker: Worker) => {
        setEditingWorker(worker.id);
        setWorkerForm({ name: worker.name, email: worker.email, identification: worker.identification ?? "", phone: worker.phone ?? "", daily_rate: String(worker.daily_rate ?? 0), role: worker.role ?? "tecnico" });
        setNotice("");
        requestAnimationFrame(() => document.getElementById("worker-account-form")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    };

    const handleDownload = async () => {
        if (!selectedWorker) {
            setError("Selecciona un trabajador para descargar su reporte mensual.");
            return;
        }
        setError("");
        try {
            const worker = workers.find((item) => item.id === Number(selectedWorker));
            if (!worker) {
                setError("No se encontró el trabajador seleccionado.");
                return;
            }
            await downloadWorkerReport(month, worker.id, worker.name);
        } catch (cause: any) {
            setError(cause?.response?.data?.message ?? "No se pudo descargar el archivo del reporte.");
        }
    };

    const loading = tab === "general" ? overviewLoading : reportsLoading;
    const summarySubmitted = summary.submitted ?? reports.length;
    const summaryOverdue = summary.overdue ?? summary.overdue_days?.length ?? 0;
    const workersWithReports = summary.workers?.length ?? Object.keys(reportsByWorker).length;
    const payrollByWorker = new Map((summary.payroll?.workers ?? []).map((item) => [item.worker.id, item]));
    const payrollTotal = summary.payroll?.total_due ?? 0;
    const payrollPaid = summary.payroll?.total_paid ?? 0;
    const payrollBalance = summary.payroll?.total_balance ?? 0;
    const paymentWorker = workers.find((worker) => worker.id === paymentWorkerId);
    const paymentPayroll = paymentWorkerId ? payrollByWorker.get(paymentWorkerId) : undefined;

    const saveDailyRate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editingRateWorker) return;
        setSavingPayroll(true);
        setError("");
        setNotice("");
        try {
            await updateWorkerDailyRate(editingRateWorker.id, Number(dailyRateDraft));
            setWorkers(await getWorkers());
            setEditingRateWorker(null);
            setNotice(`El pago diario de ${editingRateWorker.name} se actualizó.`);
            setPayrollRefresh((value) => value + 1);
        } catch (cause: any) {
            const errors = cause?.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(" ") : cause?.response?.data?.message ?? "No se pudo actualizar el pago diario.");
        } finally {
            setSavingPayroll(false);
        }
    };

    const savePayment = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!paymentWorkerId) return;
        setSavingPayroll(true);
        setError("");
        setNotice("");
        try {
            await recordWorkerPayment({
                worker_id: paymentWorkerId,
                month,
                amount: Number(paymentForm.amount),
                payment_date: paymentForm.payment_date,
                notes: paymentForm.notes.trim() || undefined,
            });
            const worker = workers.find((item) => item.id === paymentWorkerId);
            setNotice(`Pago registrado para ${worker?.name ?? "el trabajador"} en ${month}.`);
            setPaymentWorkerId(null);
            setPaymentForm({ amount: "", payment_date: currentDate(), notes: "" });
            setPayrollRefresh((value) => value + 1);
        } catch (cause: any) {
            const errors = cause?.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(" ") : cause?.response?.data?.message ?? "No se pudo registrar el pago.");
        } finally {
            setSavingPayroll(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
                    <p className="mt-1 text-sm text-slate-500">Análisis general de ventas y rentabilidad, y control de reportes diarios del equipo.</p>
                </div>
            </header>
            <div className="flex gap-2 border-b border-slate-200" role="tablist" aria-label="Tipo de reporte">
                <button role="tab" aria-selected={tab === "general"} onClick={() => { setError(""); setTab("general"); }} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === "general" ? "border-amber-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>General / ventas y utilidad</button>
                <button role="tab" aria-selected={tab === "workers"} onClick={() => { setError(""); setTab("workers"); }} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === "workers" ? "border-amber-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>Trabajadores / reportes diarios</button>
            </div>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
            {editingRateWorker && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
                <form onSubmit={saveDailyRate} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="daily-rate-title">
                    <div><h2 id="daily-rate-title" className="text-lg font-semibold text-slate-900">Editar pago diario</h2><p className="mt-1 text-sm text-slate-500">{editingRateWorker.name}</p></div>
                    <label className="block text-sm font-medium text-slate-700">Valor por día (USD)<input autoFocus required type="number" min="0" max="99999999.99" step="0.01" value={dailyRateDraft} onChange={(event) => setDailyRateDraft(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingRateWorker(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancelar</button><button disabled={savingPayroll} type="submit" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">{savingPayroll ? "Guardando…" : "Guardar tarifa"}</button></div>
                </form>
            </div>}
            {paymentWorker && paymentPayroll && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
                <form onSubmit={savePayment} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="payment-title">
                    <div><h2 id="payment-title" className="text-lg font-semibold text-slate-900">Registrar pago a {paymentWorker.name}</h2><p className="mt-1 text-sm text-slate-500">{month} · Saldo pendiente: <strong>{money.format(paymentPayroll.balance)}</strong></p></div>
                    <label className="block text-sm font-medium text-slate-700">Valor pagado (USD)<input autoFocus required type="number" min="0.01" max={paymentPayroll.balance} step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                    <label className="block text-sm font-medium text-slate-700">Fecha de pago<input required type="date" value={paymentForm.payment_date} onChange={(event) => setPaymentForm({ ...paymentForm, payment_date: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                    <label className="block text-sm font-medium text-slate-700">Nota / referencia <span className="font-normal text-slate-400">(opcional)</span><textarea rows={2} value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Ej. Abono en efectivo" /></label>
                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setPaymentWorkerId(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancelar</button><button disabled={savingPayroll} type="submit" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">{savingPayroll ? "Registrando…" : "Guardar pago"}</button></div>
                </form>
            </div>}
            {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Cargando información de reportes…</div> : tab === "general" ? (
                <section className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            ["Valor contratado", money.format(income), "📈"],
                            ["Mano de obra interna", money.format(costs), "🧰"],
                            ["Margen antes de materiales", money.format(profit), "💵"],
                            ["Órdenes de trabajo", dashboard?.work_orders ?? orders.length, "🔧"],
                        ].map(([label, value, icon]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><span className="text-xl">{icon}</span></div><p className="mt-3 text-2xl font-bold text-slate-900">{value}</p></article>)}
                    </div>
                    <div className="grid gap-5 lg:grid-cols-2">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="font-semibold text-slate-900">Indicadores del sistema</h2>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {[["Clientes", dashboard?.customers ?? 0], ["Proyectos", dashboard?.projects ?? 0], ["Cotizaciones", dashboard?.quotations ?? 0], ["En seguimiento", dashboard?.open_quotations ?? 0]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-slate-900">{value}</p></div>)}
                            </div>
                            <p className="mt-4 text-xs text-slate-500">Estimación basada en cotizaciones de proyectos y mano de obra interna. No descuenta materiales, impuestos ni otros gastos y no representa dinero efectivamente cobrado.</p>
                        </section>
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="font-semibold text-slate-900">Órdenes por estado</h2>
                            <div className="mt-4 space-y-4">
                                {Object.entries(statusCounts).length === 0 ? <p className="text-sm text-slate-500">No hay órdenes para resumir.</p> : Object.entries(statusCounts).map(([status, count]) => <div key={status}><div className="mb-1 flex justify-between text-sm"><span className="capitalize text-slate-600">{status.replaceAll("_", " ")}</span><span className="font-medium text-slate-800">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${orders.length ? count / orders.length * 100 : 0}%` }} /></div></div>)}
                            </div>
                        </section>
                    </div>
                    <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">Estimación por orden</h2><p className="mt-1 text-xs text-slate-500">El costo incluye solo la mano de obra interna registrada en la cotización; no equivale a utilidad neta.</p></div>
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Orden / proyecto</th><th className="px-5 py-3">Cliente</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3 text-right">Ingreso</th><th className="px-5 py-3 text-right">Costo</th><th className="px-5 py-3 text-right">Utilidad</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{orders.map((order) => {
                                const revenue = getQuoteValue(order);
                                const cost = getCost(order);
                                return <tr key={order.id}><td className="px-5 py-3"><span className="font-medium text-slate-800">{orderName(order)}</span><span className="mt-1 block text-xs text-slate-500">{order.project?.name ?? order.project?.title ?? "—"}</span></td><td className="px-5 py-3 text-slate-600">{order.customer?.name ?? order.project?.customer?.name ?? "—"}</td><td className="px-5 py-3 text-slate-600">{order.status ?? "—"}</td><td className="px-5 py-3 text-right">{money.format(revenue)}</td><td className="px-5 py-3 text-right">{money.format(cost)}</td><td className="px-5 py-3 text-right font-medium">{money.format(revenue - cost)}</td></tr>;
                            })}</tbody>
                        </table>
                        {orders.length === 0 && <p className="p-5 text-sm text-slate-500">Aún no hay órdenes de trabajo.</p>}
                    </section>
                </section>
            ) : (
                <section className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        {[["Reportes enviados", summarySubmitted], ["Días atrasados", summaryOverdue], ["Trabajadores con reportes", workersWithReports], ["Total del mes", money.format(payrollTotal)], ["Pagado · saldo", `${money.format(payrollPaid)} · ${money.format(payrollBalance)}`]].map(([label, value]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></article>)}
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)]">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            {canManageWorkers && <>
                            <h2 id="worker-account-form" className="font-semibold text-slate-900">{editingWorker ? `Editar cuenta: ${workerForm.name}` : "Crear cuenta de trabajador"}</h2>
                            <form className="mt-4 space-y-3" onSubmit={workerFormSubmit}>
                                <label className="block text-sm font-medium text-slate-700">Nombre completo<input required value={workerForm.name} onChange={(event) => setWorkerForm({ ...workerForm, name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                <label className="block text-sm font-medium text-slate-700">Correo electrónico<input required type="email" value={workerForm.email} onChange={(event) => setWorkerForm({ ...workerForm, email: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                <label className="block text-sm font-medium text-slate-700">Cédula *<input required inputMode="numeric" pattern="[0-9]{10}" minLength={10} maxLength={10} value={workerForm.identification} onChange={(event) => setWorkerForm({ ...workerForm, identification: event.target.value.replace(/\D/g, "").slice(0, 10) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /><span className="mt-1 block text-xs font-normal text-slate-500">La contraseña de acceso será este número de cédula. Si la cambias, también se actualiza la contraseña.</span></label>
                                <label className="block text-sm font-medium text-slate-700">Teléfono <span className="font-normal text-slate-400">(opcional)</span><input value={workerForm.phone} onChange={(event) => setWorkerForm({ ...workerForm, phone: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                <label className="block text-sm font-medium text-slate-700">Pago por día (USD)<input required type="number" min="0" step="0.01" value={workerForm.daily_rate} onChange={(event) => setWorkerForm({ ...workerForm, daily_rate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                <label className="block text-sm font-medium text-slate-700">Rol<select value={workerForm.role} onChange={(event) => setWorkerForm({ ...workerForm, role: event.target.value as "tecnico" | "lider_proyecto" })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="tecnico">Trabajador técnico</option><option value="lider_proyecto">Líder de proyecto</option></select></label>
                                <div className="flex gap-2"><button disabled={savingWorker} type="submit" className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{savingWorker ? "Guardando…" : editingWorker ? "Actualizar trabajador" : "Crear trabajador"}</button>{editingWorker && <button type="button" onClick={() => { setEditingWorker(null); setWorkerForm({ name: "", email: "", identification: "", phone: "", daily_rate: "0", role: "tecnico" }); }} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm">Cancelar</button>}</div>
                            </form>
                            </>}
                            {!canManageWorkers && <h2 className="font-semibold text-slate-900">Cuentas de trabajadores · solo consulta</h2>}
                            <div className="mt-6 border-t border-slate-100 pt-5">
                                <h3 className="font-semibold text-slate-900">Cuentas registradas <span className="text-sm font-normal text-slate-500">({workers.length})</span></h3>
                                <ul className="mt-3 divide-y divide-slate-100">{workers.map((worker) => <li key={worker.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-800">{worker.name} <span className="font-normal text-slate-500">· {worker.role === "lider_proyecto" ? "Líder de proyecto" : "Técnico"}</span></p><p className="truncate text-xs text-slate-500">{worker.email} · Cédula: {worker.identification ?? "pendiente de registrar"} · Día: {money.format(numeric(worker.daily_rate))}</p></div><div className="flex flex-wrap gap-2">{canManagePayroll && <button type="button" onClick={() => { setEditingRateWorker(worker); setDailyRateDraft(String(worker.daily_rate ?? 0)); }} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-50">Editar pago diario</button>}{canManageWorkers && <button type="button" onClick={() => editWorker(worker)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">Editar cuenta</button>}</div></li>)}</ul>
                            </div>
                        </section>

                        <div className="space-y-5">
                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-wrap items-end justify-between gap-3">
                                    <div><h2 className="font-semibold text-slate-900">Control mensual de reportes diarios</h2><p className="mt-1 text-xs text-slate-500">Los días sin confirmación se marcan como atrasados por trabajador y OT.</p></div>
                                    <label className="text-sm font-medium text-slate-700">Mes<input type="month" value={month} onChange={(event) => { setError(""); setReportsLoading(true); setMonth(event.target.value); }} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
                                    <button type="button" onClick={() => void handleDownload()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Descargar CSV del trabajador</button>
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <label className="text-sm font-medium text-slate-700">Trabajador<select value={selectedWorker} onChange={(event) => { setError(""); setReportsLoading(true); setSelectedWorker(event.target.value); }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Todos</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select></label>
                                    <label className="text-sm font-medium text-slate-700">Orden de trabajo<select value={selectedOrder} onChange={(event) => { setError(""); setReportsLoading(true); setSelectedOrder(event.target.value); }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Todas</option>{orders.map((order) => <option key={order.id} value={order.id}>{orderName(order)}</option>)}</select></label>
                                </div>
                                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                                        <h3 className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">Resumen por trabajador</h3>
                                        <table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2">Trabajador</th><th className="px-3 py-2">Reportes</th><th className="px-3 py-2">Días</th><th className="px-3 py-2">Pago/día</th><th className="px-3 py-2">Devengado</th><th className="px-3 py-2">Pagado</th><th className="px-3 py-2">Saldo</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Atrasados</th><th className="px-3 py-2">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{workers.filter((worker) => !selectedWorker || worker.id === Number(selectedWorker)).map((worker) => {
                                            const payroll = payrollByWorker.get(worker.id);
                                            return <tr key={worker.id}>
                                                <td className="px-3 py-2 font-medium">{worker.name}</td>
                                                <td className="px-3 py-2">{reportsByWorker[worker.id] ?? 0}</td>
                                                <td className="px-3 py-2">{payroll?.worked_days ?? 0}</td>
                                                <td className="px-3 py-2">{money.format(numeric(worker.daily_rate))}</td>
                                                <td className="px-3 py-2 font-semibold">{money.format(payroll?.amount_due ?? 0)}</td>
                                                <td className="px-3 py-2">{money.format(payroll?.paid ?? 0)}</td>
                                                <td className="px-3 py-2 font-semibold">{money.format(payroll?.balance ?? 0)}</td>
                                                <td className="px-3 py-2"><span className={`whitespace-nowrap rounded-full px-2 py-1 font-medium ${payroll?.status === "paid" ? "bg-emerald-50 text-emerald-700" : payroll?.status === "partial" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{payroll?.status === "paid" ? "Pagado" : payroll?.status === "partial" ? "Abono parcial" : "Pendiente"}</span></td>
                                                <td className="px-3 py-2 text-amber-800">{overdueByWorker[worker.id] ?? 0}</td>
                                                <td className="px-3 py-2">
                                                    {canManagePayroll && payroll && payroll.balance > 0 && <button type="button" onClick={() => { setPaymentWorkerId(worker.id); setPaymentForm({ amount: "", payment_date: currentDate(), notes: "" }); }} className="whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 font-medium text-white hover:bg-slate-700">Registrar pago</button>}
                                                    {payroll?.payments.length ? <details className="mt-1"><summary className="cursor-pointer text-amber-800">{payroll.payments.length} pago(s)</summary><ul className="mt-1 space-y-1">{payroll.payments.map((payment) => <li key={payment.id} className="min-w-48 rounded bg-slate-50 p-2 text-slate-600">{dateLabel(payment.payment_date)} · {money.format(numeric(payment.amount))}{payment.notes && <span className="block">{payment.notes}</span>}{payment.creator?.name && <span className="block text-slate-400">Registró: {payment.creator.name}</span>}</li>)}</ul></details> : null}
                                                </td>
                                            </tr>;
                                        })}</tbody></table>
                                        <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">Cada fecha con reporte se cuenta una sola vez. Los pagos quedan registrados por trabajador y mes; el saldo se actualiza automáticamente.</p>
                                    </div>
                                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                                        <h3 className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">Resumen por OT</h3>
                                        <table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2">Orden</th><th className="px-3 py-2">Entregados</th><th className="px-3 py-2">Atrasados</th></tr></thead><tbody className="divide-y divide-slate-100">{orders.filter((order) => !selectedOrder || order.id === Number(selectedOrder)).map((order) => <tr key={order.id}><td className="px-3 py-2">{orderName(order)}</td><td className="px-3 py-2">{reportsByOrder[order.id] ?? 0}</td><td className="px-3 py-2 text-amber-800">{overdueByOrder[order.id] ?? 0}</td></tr>)}</tbody></table>
                                    </div>
                                </div>
                                <div className="mt-4 overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Trabajador / cuenta</th><th className="px-3 py-2">Orden</th><th className="px-3 py-2">Trabajo y ubicación</th><th className="px-3 py-2">Enviado</th><th className="px-3 py-2">Estado</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100">{reports.map((report) => {
                                            const name = report.worker?.name ?? workers.find((worker) => worker.id === report.worker_id)?.name ?? "Trabajador";
                                            const order = report.work_order ?? orders.find((item) => item.id === report.work_order_id);
                                            return <tr key={report.id}><td className="whitespace-nowrap px-3 py-3">{dateLabel(report.report_date)}</td><td className="px-3 py-3"><span className="font-medium">{name}</span><span className="block text-xs text-slate-500">{report.worker?.email ?? workers.find((worker) => worker.id === report.worker_id)?.email ?? "—"}</span></td><td className="px-3 py-3">{orderName(order)}</td><td className="max-w-xs px-3 py-3"><p className="line-clamp-2">{report.work_done}</p><p className="mt-1 text-xs text-slate-500">{report.location ?? "Ubicación —"}</p></td><td className="whitespace-nowrap px-3 py-3">{report.submitted_at ? new Intl.DateTimeFormat("es-EC", { dateStyle: "short", timeStyle: "short" }).format(new Date(report.submitted_at)) : "—"}</td><td className="px-3 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Entregado</span></td></tr>;
                                        })}</tbody>
                                    </table>
                                    {reports.length === 0 && <p className="p-4 text-sm text-slate-500">No hay reportes enviados para estos filtros.</p>}
                                </div>
                            </section>
                            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                                <h3 className="font-semibold text-slate-900">Días pendientes de confirmación</h3>
                                {summary.overdue_days?.length ? <ul className="mt-3 divide-y divide-amber-200">{summary.overdue_days.map((item, index) => <li key={`${item.worker_id}-${item.work_order_id}-${item.report_date ?? item.date}-${index}`} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span className="font-medium text-slate-800">{item.worker_name ?? workers.find((worker) => worker.id === item.worker_id)?.name ?? "Trabajador"} · {item.work_order_number ?? item.work_order?.number ?? `OT #${item.work_order_id ?? "—"}`}</span><span className="text-amber-800">{dateLabel(item.report_date ?? item.date)}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No hay días atrasados en la respuesta del servidor para este filtro.</p>}
                            </section>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

export default Reports;
