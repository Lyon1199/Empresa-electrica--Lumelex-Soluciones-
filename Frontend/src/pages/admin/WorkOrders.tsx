import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getAuthenticatedUser } from "../../services/authService";
import {
    getWorkOrder,
    getWorkOrders,
    getWorkers,
    updateWorkOrder,
    type DailyReport,
    type WorkOrder,
    type Worker,
} from "../../services/workOrderService";

const statusLabels: Record<string, string> = {
    pending: "Pendiente",
    in_progress: "En progreso",
    on_hold: "En pausa",
    completed: "Completada",
    cancelled: "Cancelada",
};

const formatDate = (value?: string) =>
    value ? new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

function WorkOrders() {
    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [workers, setWorkers] = useState<Worker[]>([]);
    const [selected, setSelected] = useState<WorkOrder | null>(null);
    const [status, setStatus] = useState("");
    const [description, setDescription] = useState("");
    const [workerIds, setWorkerIds] = useState<number[]>([]);
    const [leaderIds, setLeaderIds] = useState<number[]>([]);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [canManage, setCanManage] = useState(false);

    const selectedId = selected?.id;
    const load = useCallback(async () => {
        try {
            const [result, workerList] = await Promise.all([getWorkOrders(page, search), getWorkers()]);
            setOrders(result.data ?? []);
            setPage(result.current_page ?? page);
            setLastPage(result.last_page ?? 1);
            setTotal(result.total ?? result.data?.length ?? 0);
            setWorkers(workerList);
            if (selectedId) {
                const refreshed = await getWorkOrder(selectedId);
                setSelected(refreshed);
            }
        } catch (cause: any) {
            setError(cause?.response?.data?.message ?? "No se pudieron cargar las órdenes de trabajo.");
        } finally {
            setLoading(false);
        }
    }, [page, search, selectedId]);

    useEffect(() => {
        let active = true;
        Promise.all([getWorkOrders(page, search), getWorkers()])
            .then(async ([result, workerList]) => {
                if (!active) return;
                setOrders(result.data ?? []);
                setLastPage(result.last_page ?? 1);
                setTotal(result.total ?? result.data?.length ?? 0);
                setWorkers(workerList);
                if (selectedId) {
                    const refreshed = await getWorkOrder(selectedId);
                    if (active) setSelected(refreshed);
                }
            })
            .catch((cause: any) => {
                if (active) setError(cause?.response?.data?.message ?? "No se pudieron cargar las órdenes de trabajo.");
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [page, search, selectedId]);

    useEffect(() => {
        getAuthenticatedUser()
            .then((user) => setCanManage(user.roles.some((role) => ["admin", "gerente", "supervisor"].includes(role))))
            .catch((cause) => setError(cause instanceof Error ? cause.message : "No se pudo validar el rol de la cuenta."));
    }, []);

    const selectOrder = async (order: WorkOrder) => {
        setError("");
        try {
            const detail = await getWorkOrder(order.id);
            setSelected(detail);
            setStatus(detail.status ?? "pending");
            setDescription(detail.description ?? "");
            setWorkerIds((detail.workers ?? []).map((worker) => worker.id));
            setLeaderIds((detail.leaders ?? []).map((leader) => leader.id));
            setNotice("");
        } catch (cause: any) {
            setError(cause?.response?.data?.message ?? "No se pudo abrir el detalle de la orden.");
        }
    };

    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selected) return;
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const updated = await updateWorkOrder(selected.id, {
                status,
                description,
                worker_ids: workerIds,
                leader_ids: leaderIds,
            });
            setSelected(updated);
            setNotice("La orden de trabajo se actualizó correctamente.");
            setLoading(true);
            await load();
            setLoading(false);
        } catch (cause: any) {
            setError(cause?.response?.data?.message ?? "No se pudieron guardar los cambios.");
        } finally {
            setSaving(false);
        }
    };

    const toggleWorker = (id: number) => setWorkerIds((current) =>
        current.includes(id) ? current.filter((workerId) => workerId !== id) : [...current, id],
    );
    const toggleLeader = (id: number) => setLeaderIds((current) =>
        current.includes(id) ? current.filter((leaderId) => leaderId !== id) : [...current, id],
    );
    const technicians = workers.filter((worker) => worker.role === "tecnico");
    const projectLeaders = workers.filter((worker) => worker.role === "lider_proyecto");

    const orderTitle = (order: WorkOrder) => order.number ?? order.code ?? order.title ?? order.name ?? `Orden #${order.id}`;
    const reports: DailyReport[] = selected?.latest_reports ?? selected?.daily_reports ?? [];
    const quotation = selected?.project?.quotation ?? selected?.quotation;
    const money = new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" });

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-slate-900">Órdenes de trabajo</h1>
                <p className="mt-1 text-sm text-slate-500">Consulta proyectos, asignaciones y avances diarios de cada orden.</p>
            </header>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

            <form className="flex gap-2" onSubmit={(event) => {
                event.preventDefault();
                const nextSearch = searchInput.trim();
                setError("");
                setLoading(true);
                if (nextSearch === search) void load().finally(() => setLoading(false));
                else {
                    setPage(1);
                    setSearch(nextSearch);
                }
            }}>
                <input className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar por proyecto, cliente o código…" aria-label="Buscar órdenes de trabajo" />
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700" type="submit">Buscar</button>
            </form>

            <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.5fr)]">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 px-5 py-4">
                        <h2 className="font-semibold text-slate-900">Listado de órdenes</h2>
                        <p className="mt-1 text-xs text-slate-500">{total} orden(es) encontradas</p>
                    </div>
                    {loading ? <p className="p-5 text-sm text-slate-500">Cargando órdenes…</p> : orders.length === 0 ? <p className="p-5 text-sm text-slate-500">No hay órdenes de trabajo para mostrar.</p> : (
                        <ul className="divide-y divide-slate-100">
                            {orders.map((order) => (
                                <li key={order.id}>
                                    <button onClick={() => void selectOrder(order)} className={`w-full p-4 text-left transition hover:bg-slate-50 ${selected?.id === order.id ? "bg-amber-50" : ""}`} type="button">
                                        <span className="flex items-start justify-between gap-3">
                                            <span className="font-medium text-slate-900">{orderTitle(order)}</span>
                                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{statusLabels[order.status ?? ""] ?? order.status ?? "Sin estado"}</span>
                                        </span>
                                        <span className="mt-1 block text-sm text-slate-600">{order.project?.name ?? order.project?.title ?? "Proyecto sin nombre"}</span>
                                        <span className="mt-1 block text-xs text-slate-500">{order.customer?.name ?? order.project?.customer?.name ?? "Cliente no especificado"}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {!loading && lastPage > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
                        <button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage((current) => Math.max(1, current - 1)); }} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">Anterior</button>
                        <span className="text-slate-500">Página {page} de {lastPage}</span>
                        <button type="button" disabled={page >= lastPage} onClick={() => { setLoading(true); setPage((current) => Math.min(lastPage, current + 1)); }} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">Siguiente</button>
                    </div>}
                </section>

                <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    {!selected ? (
                        <div className="flex min-h-60 items-center justify-center text-center text-sm text-slate-500">Selecciona una orden para ver su detalle y administrar las asignaciones.</div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Detalle de orden</p>
                                        <h2 className="mt-1 text-xl font-bold text-slate-900">{orderTitle(selected)}</h2>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{statusLabels[selected.status ?? ""] ?? selected.status ?? "Sin estado"}</span>
                                </div>
                                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Proyecto</dt><dd className="mt-1 text-sm font-medium text-slate-800">{selected.project?.name ?? selected.project?.title ?? "—"}</dd></div>
                                    <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Cliente</dt><dd className="mt-1 text-sm font-medium text-slate-800">{selected.customer?.name ?? selected.project?.customer?.name ?? "—"}</dd></div>
                                    <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Cotización</dt><dd className="mt-1 text-sm font-medium text-slate-800">{quotation?.number ?? (quotation?.id ? `#${quotation.id}` : "—")}</dd></div>
                                    <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">Valor cotizado</dt><dd className="mt-1 text-sm font-medium text-slate-800">{quotation ? money.format(Number(quotation.total ?? quotation.total_amount ?? quotation.amount ?? 0)) : "—"}</dd></div>
                                </dl>
                            </div>

                            {canManage ? (
                            <form className="space-y-4 border-t border-slate-100 pt-5" onSubmit={save}>
                                <h3 className="font-semibold text-slate-900">Administrar orden</h3>
                                <label className="block text-sm font-medium text-slate-700">
                                    Estado
                                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                                        <option value="pending">Pendiente</option><option value="in_progress">En progreso</option><option value="completed">Completada</option><option value="cancelled">Cancelada</option>
                                    </select>
                                </label>
                                <label className="block text-sm font-medium text-slate-700">
                                    Descripción / instrucciones
                                    <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
                                </label>
                                <fieldset>
                                    <legend className="mb-2 text-sm font-medium text-slate-700">Técnicos asignados</legend>
                                    {technicians.length === 0 ? <p className="text-sm text-slate-500">No hay técnicos registrados.</p> : (
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {technicians.map((worker) => <label key={worker.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={workerIds.includes(worker.id)} onChange={() => toggleWorker(worker.id)} className="accent-amber-600" />{worker.name}<span className="truncate text-xs text-slate-400">{worker.email}</span></label>)}
                                        </div>
                                    )}
                                </fieldset>
                                <fieldset>
                                    <legend className="mb-2 text-sm font-medium text-slate-700">Líderes del proyecto</legend>
                                    {projectLeaders.length === 0 ? <p className="text-sm text-slate-500">Crea líderes desde Reportes → Trabajadores.</p> : (
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {projectLeaders.map((leader) => <label key={leader.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={leaderIds.includes(leader.id)} onChange={() => toggleLeader(leader.id)} className="accent-amber-600" />{leader.name}<span className="truncate text-xs text-slate-400">{leader.email}</span></label>)}
                                        </div>
                                    )}
                                </fieldset>
                                <button type="submit" disabled={saving} className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-wait disabled:opacity-60">{saving ? "Guardando…" : "Guardar cambios"}</button>
                            </form>
                            ) : <p className="border-t border-slate-100 pt-4 text-sm text-slate-500">Vista de consulta: los cambios de estado y asignaciones están reservados para administración y supervisión.</p>}

                            <div className="border-t border-slate-100 pt-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="font-semibold text-slate-900">Reportes recientes</h3>
                                    <span className="text-xs text-slate-500">{reports.length} reporte(s)</span>
                                </div>
                                {reports.length === 0 ? <p className="mt-3 text-sm text-slate-500">Esta orden aún no tiene reportes diarios.</p> : (
                                    <ul className="mt-3 space-y-3">
                                        {reports.map((report) => <li key={report.id} className="rounded-lg border border-slate-200 p-3">
                                            <div className="flex flex-wrap justify-between gap-2"><span className="text-sm font-semibold text-slate-800">{report.worker?.name ?? "Técnico"} · {report.report_date}</span><span className="text-xs text-slate-500">Enviado: {formatDate(report.submitted_at)}</span></div>
                                            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{report.work_done}</p>
                                            <p className="mt-1 text-xs text-slate-500">Ubicación: {report.location ?? "—"}{report.hours_worked ? ` · ${report.hours_worked} h` : ""}</p>
                                        </li>)}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

export default WorkOrders;
