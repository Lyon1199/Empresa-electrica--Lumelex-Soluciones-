import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { getAuthenticatedUser, logout, type AuthenticatedUser } from "../../services/authService";
import {
    getAssignedWorkOrders,
    getWorkerDailyReports,
    submitProjectUpdate,
    submitWorkerDailyReport,
    type DailyReport,
    type WorkOrder,
} from "../../services/workOrderService";

const localDate = (date = new Date()) =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Guayaquil",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
const localMonth = () => localDate().slice(0, 7);
const orderName = (order: WorkOrder) => order.number ?? order.code ?? order.title ?? order.name ?? `Orden #${order.id}`;
const submittedAt = (value?: string) => value ? new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Hora no disponible";

function WorkerPortal() {
    const today = localDate();
    const [user, setUser] = useState<AuthenticatedUser | null>(null);
    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [reports, setReports] = useState<DailyReport[]>([]);
    const [currentReports, setCurrentReports] = useState<DailyReport[]>([]);
    const [historyMonth, setHistoryMonth] = useState(localMonth);
    const [orderId, setOrderId] = useState("");
    const [form, setForm] = useState({ work_done: "", location: "", hours_worked: "", start_time: "", end_time: "", materials_used: "", issues: "", notes: "" });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [projectUpdate, setProjectUpdate] = useState({
        title: "",
        description: "",
        progress: "",
        visible_to_customer: true,
    });
    const [projectPhotos, setProjectPhotos] = useState<File[]>([]);
    const [updatingProject, setUpdatingProject] = useState(false);

    const load = async (month: string) => {
        try {
            const monthReports = getWorkerDailyReports(month);
            const [assigned, dailyReports, todayReports, account] = await Promise.all([
                getAssignedWorkOrders(),
                monthReports,
                month === localMonth() ? monthReports : getWorkerDailyReports(localMonth()),
                getAuthenticatedUser(),
            ]);
            setOrders(assigned);
            setReports(dailyReports);
            setCurrentReports(todayReports);
            setUser(account);
            setOrderId((previous) => previous || String(assigned.find((order) => !["completed", "cancelled"].includes(order.status ?? ""))?.id ?? ""));
        } catch (cause: any) {
            setError(cause?.response?.data?.message ?? "No se pudo cargar tu espacio de trabajo.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        const monthReports = getWorkerDailyReports(historyMonth);
        Promise.all([
            getAssignedWorkOrders(),
            monthReports,
            historyMonth === localMonth() ? monthReports : getWorkerDailyReports(localMonth()),
            getAuthenticatedUser(),
        ])
            .then(([assigned, dailyReports, todayReports, account]) => {
                if (!active) return;
                setOrders(assigned);
                setReports(dailyReports);
                setCurrentReports(todayReports);
                setUser(account);
                setOrderId((previous) => previous || String(assigned.find((order) => !["completed", "cancelled"].includes(order.status ?? ""))?.id ?? ""));
            })
            .catch((cause: any) => {
                if (active) setError(cause?.response?.data?.message ?? "No se pudo cargar tu espacio de trabajo.");
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [historyMonth]);

    const activeOrders = useMemo(() => orders.filter((order) => !["on_hold", "completed", "cancelled"].includes(order.status ?? "")), [orders]);
    const selectedProjectOrder = activeOrders.find((order) => String(order.id) === orderId);
    const submittedForOrder = (id: number) => currentReports.some((report) => report.report_date?.slice(0, 10) === today && report.work_order_id === id);
    const selectedOrderHasReport = orderId !== "" && submittedForOrder(Number(orderId));
    const isProjectLeader = user?.roles.includes("lider_proyecto") ?? false;

    const publishProjectUpdate = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const order = activeOrders.find((item) => item.id === Number(orderId));
        if (!order?.project?.id) {
            setError("Selecciona una orden de trabajo con proyecto asignado.");
            return;
        }
        setUpdatingProject(true);
        setError("");
        setNotice("");
        try {
            await submitProjectUpdate(order.project.id, {
                title: projectUpdate.title.trim(),
                description: projectUpdate.description.trim(),
                progress: Number(projectUpdate.progress),
                visible_to_customer: projectUpdate.visible_to_customer,
                photos: projectPhotos,
            });
            setProjectUpdate({ title: "", description: "", progress: "", visible_to_customer: true });
            setProjectPhotos([]);
            setNotice("El avance del proyecto se publicó correctamente.");
            await load(historyMonth);
        } catch (cause: any) {
            const errors = cause?.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(" ") : cause?.response?.data?.message ?? "No se pudo publicar el avance.");
        } finally {
            setUpdatingProject(false);
        }
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!orderId) {
            setError("Selecciona una orden de trabajo activa.");
            return;
        }
        setSubmitting(true);
        setError("");
        setNotice("");
        try {
            await submitWorkerDailyReport({
                work_order_id: Number(orderId),
                report_date: today,
                work_done: form.work_done.trim(),
                location: form.location.trim(),
                ...(form.hours_worked ? { hours_worked: Number(form.hours_worked) } : {}),
                ...(form.start_time ? { start_time: form.start_time } : {}),
                ...(form.end_time ? { end_time: form.end_time } : {}),
                ...(form.materials_used ? { materials_used: form.materials_used.trim() } : {}),
                ...(form.issues ? { issues: form.issues.trim() } : {}),
                ...(form.notes ? { notes: form.notes.trim() } : {}),
            });
            setForm({ work_done: "", location: "", hours_worked: "", start_time: "", end_time: "", materials_used: "", issues: "", notes: "" });
            setNotice("Tu reporte de hoy se registró correctamente.");
            await load(historyMonth);
        } catch (cause: any) {
            const errors = cause?.response?.data?.errors;
            setError(errors ? Object.values(errors).flat().join(" ") : cause?.response?.data?.message ?? "No se pudo enviar el reporte diario.");
        } finally {
            setSubmitting(false);
        }
    };

    const signOut = async () => {
        setLoggingOut(true);
        try { await logout(); } catch (cause) { console.error("No se pudo cerrar la sesión en el servidor:", cause); }
        window.location.replace("/login");
    };

    return (
        <main className="min-h-screen bg-slate-100">
            <header className="bg-slate-900 text-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
                    <div><p className="text-xs font-semibold tracking-[0.2em] text-amber-400">LUMELEX · CAMPO</p><h1 className="mt-1 text-xl font-bold">{isProjectLeader ? "Portal del líder de proyecto" : "Espacio del trabajador"}</h1><p className="mt-1 text-sm text-slate-300">{user ? `Sesión de ${user.name} · ${user.email}` : "Cargando cuenta…"}</p></div>
                    <button type="button" onClick={() => void signOut()} disabled={loggingOut} className="rounded-lg border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800 disabled:opacity-60">{loggingOut ? "Saliendo…" : "Cerrar sesión"}</button>
                </div>
            </header>
            <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
                {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
                {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Cargando órdenes y reportes…</div> : (
                    <>
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div><h2 className="text-lg font-semibold text-slate-900">Órdenes asignadas activas</h2><p className="mt-1 text-sm text-slate-500">Confirma cada día el trabajo realizado en cada OT asignada.</p></div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">{activeOrders.length} activa(s)</span>
                            </div>
                            {activeOrders.length === 0 ? <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No tienes órdenes de trabajo activas asignadas.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{activeOrders.map((order) => {
                                const sent = submittedForOrder(order.id);
                                return <article key={order.id} className={`rounded-xl border p-4 ${sent ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"}`}>
                                    <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{orderName(order)}</h3><p className="mt-1 text-sm text-slate-600">{order.project?.name ?? order.project?.title ?? "Proyecto sin nombre"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${sent ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{sent ? "Reporte enviado hoy" : "Pendiente hoy"}</span></div>
                                    {order.description && <p className="mt-3 text-sm text-slate-600">{order.description}</p>}
                                    <p className="mt-2 text-xs text-slate-500">Estado: {order.status ?? "Activa"}</p>
                                    {isProjectLeader && <div className="mt-3 border-t border-slate-200 pt-3"><p className="text-xs font-medium text-slate-600">Avance: {Number(order.project?.progress ?? 0)}%</p>{order.project?.updates?.slice(0, 2).map((update) => <div key={update.id} className="mt-2 text-xs text-slate-600"><p className="font-medium">{update.title}</p><p className="line-clamp-2">{update.description}</p><div className="mt-2 flex flex-wrap gap-2">{update.photos?.map((photo) => <img key={photo.id} src={photo.download_url} alt={photo.original_name} className="h-16 w-20 rounded object-cover" />)}</div></div>)}</div>}
                                </article>;
                            })}</div>}
                        </section>

                        {isProjectLeader && <form onSubmit={publishProjectUpdate} className="space-y-4 rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
                            <div><h2 className="text-lg font-semibold text-slate-900">Publicar avance del proyecto</h2><p className="mt-1 text-sm text-slate-500">Comparte el progreso y fotos de la obra con el cliente.</p></div>
                            <label className="block text-sm font-medium text-slate-700">Orden / proyecto<select required value={orderId} onChange={(event) => setOrderId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Selecciona un proyecto</option>{activeOrders.map((order) => <option key={order.id} value={order.id}>{orderName(order)} · {order.project?.title ?? "Proyecto"}</option>)}</select></label>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="block text-sm font-medium text-slate-700">Título del avance<input required maxLength={180} value={projectUpdate.title} onChange={(event) => setProjectUpdate({ ...projectUpdate, title: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                <label className="block text-sm font-medium text-slate-700">Avance acumulado (%)<input required type="number" min={Number(selectedProjectOrder?.project?.progress ?? 0)} max="100" value={projectUpdate.progress} onChange={(event) => setProjectUpdate({ ...projectUpdate, progress: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /><span className="mt-1 block text-xs font-normal text-slate-500">No puede ser menor al avance actual; repetir el mismo porcentaje no lo vuelve a registrar.</span></label>
                            </div>
                            <label className="block text-sm font-medium text-slate-700">Descripción<textarea required rows={3} maxLength={5000} value={projectUpdate.description} onChange={(event) => setProjectUpdate({ ...projectUpdate, description: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                            <label className="block text-sm font-medium text-slate-700">Fotos de la obra<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setProjectPhotos(Array.from(event.target.files ?? []))} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /><span className="mt-1 block text-xs font-normal text-slate-500">Hasta 8 fotos JPG, PNG o WEBP, máximo 10 MB cada una.</span></label>
                            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={projectUpdate.visible_to_customer} onChange={(event) => setProjectUpdate({ ...projectUpdate, visible_to_customer: event.target.checked })} className="accent-sky-600" />Visible en el portal del cliente</label>
                            <button type="submit" disabled={updatingProject || activeOrders.length === 0} className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60">{updatingProject ? "Publicando…" : "Publicar avance"}</button>
                        </form>}

                        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <h2 className="text-lg font-semibold text-slate-900">Reporte diario · {today}</h2>
                                <p className="mt-1 text-sm text-slate-500">Cuenta autenticada: <span className="font-medium text-slate-700">{user?.name ?? "—"}</span></p>
                                <form onSubmit={submit} className="mt-5 space-y-4">
                                    <label className="block text-sm font-medium text-slate-700">Orden de trabajo<select required value={orderId} onChange={(event) => setOrderId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="">Selecciona una OT</option>{activeOrders.map((order) => <option key={order.id} value={order.id}>{orderName(order)} · {order.project?.name ?? "Proyecto"}</option>)}</select></label>
                                    <label className="block text-sm font-medium text-slate-700">Trabajo realizado<textarea required minLength={3} rows={4} value={form.work_done} onChange={(event) => setForm({ ...form, work_done: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Describe las actividades realizadas hoy" /></label>
                                    <label className="block text-sm font-medium text-slate-700">Ubicación<input required value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Dirección o referencia del sitio" /></label>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <label className="block text-sm font-medium text-slate-700">Horas<input type="number" min="0" max="24" step="0.25" value={form.hours_worked} onChange={(event) => setForm({ ...form, hours_worked: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                        <label className="block text-sm font-medium text-slate-700">Inicio<input type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                        <label className="block text-sm font-medium text-slate-700">Fin<input type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                    </div>
                                    <label className="block text-sm font-medium text-slate-700">Materiales usados <span className="font-normal text-slate-400">(opcional)</span><textarea rows={2} value={form.materials_used} onChange={(event) => setForm({ ...form, materials_used: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                    <label className="block text-sm font-medium text-slate-700">Problemas o novedades <span className="font-normal text-slate-400">(opcional)</span><textarea rows={2} value={form.issues} onChange={(event) => setForm({ ...form, issues: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                    <label className="block text-sm font-medium text-slate-700">Notas <span className="font-normal text-slate-400">(opcional)</span><textarea rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                                    <p className="text-xs text-slate-500">La fecha se registra automáticamente como hoy; no es posible enviar un reporte de otro día desde este formulario.</p>
                                    {selectedOrderHasReport && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Ya registraste el reporte de hoy para esta orden.</p>}
                                    <button type="submit" disabled={submitting || activeOrders.length === 0 || selectedOrderHasReport} className="w-full rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Enviando reporte…" : selectedOrderHasReport ? "Reporte de hoy ya enviado" : "Enviar reporte de hoy"}</button>
                                </form>
                            </div>
                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">Reportes anteriores</h2><p className="mt-1 text-sm text-slate-500">Incluye la fecha y hora en que se registró cada reporte.</p></div><label className="text-sm font-medium text-slate-700">Mes<input type="month" value={historyMonth} onChange={(event) => { setError(""); setLoading(true); setHistoryMonth(event.target.value); }} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2" /></label></div>
                                {reports.length === 0 ? <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No hay reportes guardados para este mes.</p> : <ul className="mt-5 space-y-3">{[...reports].sort((a, b) => `${b.report_date}${b.submitted_at ?? ""}`.localeCompare(`${a.report_date}${a.submitted_at ?? ""}`)).map((report) => <li key={report.id} className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold text-slate-800">{report.work_order ? orderName(report.work_order) : orders.find((order) => order.id === report.work_order_id) ? orderName(orders.find((order) => order.id === report.work_order_id)!) : `Orden #${report.work_order_id}`}</span><span className="text-sm text-slate-500">{report.report_date}</span></div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{report.work_done}</p>
                                    <p className="mt-2 text-xs text-slate-500">Ubicación: {report.location ?? "—"}{report.hours_worked ? ` · ${report.hours_worked} horas` : ""}</p>
                                    <p className="mt-1 text-xs text-slate-500">Registrado: {submittedAt(report.submitted_at)}</p>
                                </li>)}</ul>}
                            </section>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}

export default WorkerPortal;
