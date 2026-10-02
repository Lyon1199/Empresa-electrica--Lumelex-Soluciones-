import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getAuthenticatedUser, logout } from "../../services/authService";
import {
    downloadDepositReceipt,
    getCustomerProjects,
    uploadDepositReceipt,
    type DepositReceipt,
    type Project,
} from "../../services/projectService";
import lumelexLogo from "../../assets/lumelex-logo.png";

const money = (value: number | string | null) =>
    value === null
        ? "No indicado"
        : new Intl.NumberFormat("es-EC", {
            style: "currency",
            currency: "USD",
        }).format(Number(value) || 0);

const receiptStatus: Record<string, string> = {
    pending: "Pendiente de revisión",
    approved: "Aprobado por contabilidad",
    rejected: "Necesita corrección",
};

const readableError = (error: unknown) => {
    if (typeof error !== "object" || error === null) return "No se pudo completar la operación.";
    const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
    return data?.message || (data?.errors ? Object.values(data.errors).flat().join(" ") : "") || "No se pudo completar la operación.";
};

function CustomerPortal() {
    const navigate = useNavigate();
    const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingProject, setUploadingProject] = useState<number | null>(null);
    const [files, setFiles] = useState<Record<number, File | null>>({});
    const [amounts, setAmounts] = useState<Record<number, string>>({});
    const [notes, setNotes] = useState<Record<number, string>>({});
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loggingOut, setLoggingOut] = useState(false);
    const [passwordChangeSuggested, setPasswordChangeSuggested] = useState(false);

    const loadProjects = async () => {
        try {
            const result = await getCustomerProjects();
            setProjects(result);
        } catch (loadError) {
            console.error("Error cargando proyectos del cliente:", loadError);
            setError(readableError(loadError));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = window.setTimeout(() => void loadProjects(), 0);
        void getAuthenticatedUser()
            .then((user) => setPasswordChangeSuggested(user.must_change_password))
            .catch((userError) => console.error("Error consultando recomendaciones de seguridad:", userError));
        return () => window.clearTimeout(timeout);
    }, []);

    const submitReceipt = async (event: React.FormEvent<HTMLFormElement>, project: Project) => {
        event.preventDefault();
        const file = files[project.id];
        if (!file) {
            setError("Selecciona una imagen o PDF del comprobante de depósito.");
            return;
        }
        try {
            setUploadingProject(project.id);
            setError("");
            setSuccess("");
            await uploadDepositReceipt(
                project.id,
                file,
                amounts[project.id] ?? "",
                notes[project.id] ?? ""
            );
            setFiles((current) => ({ ...current, [project.id]: null }));
            setAmounts((current) => ({ ...current, [project.id]: "" }));
            setNotes((current) => ({ ...current, [project.id]: "" }));
            if (fileInputs.current[project.id]) fileInputs.current[project.id]!.value = "";
            setSuccess(`El comprobante de ${project.number} se envió a contabilidad.`);
            await loadProjects();
        } catch (uploadError) {
            console.error("Error cargando comprobante:", uploadError);
            setError(readableError(uploadError));
        } finally {
            setUploadingProject(null);
        }
    };

    const handleDownload = async (receipt: DepositReceipt) => {
        try {
            setError("");
            await downloadDepositReceipt(receipt.id, receipt.original_name);
        } catch (downloadError) {
            console.error("Error descargando comprobante:", downloadError);
            setError(readableError(downloadError));
        }
    };

    const handleLogout = async () => {
        try {
            setLoggingOut(true);
            await logout();
        } catch (logoutError) {
            console.error("Error cerrando sesión:", logoutError);
        } finally {
            sessionStorage.removeItem("lumelex_authenticated");
            navigate("/login", { replace: true });
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <img src={lumelexLogo} alt="Lumelex Soluciones Eléctricas e Ingeniería" className="h-12 w-16 rounded-lg object-contain sm:h-14 sm:w-20" />
                        <div className="hidden border-l border-slate-200 pl-3 sm:block">
                            <p className="text-sm font-bold text-slate-900">Portal de clientes</p>
                            <p className="text-xs text-slate-500">Proyectos y seguimiento</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button onClick={() => navigate("/cliente/cambiar-clave")} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 sm:text-sm">Cambiar contraseña</button>
                        <button onClick={() => void handleLogout()} disabled={loggingOut} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50 sm:px-4 sm:text-sm">{loggingOut ? "Saliendo…" : "Cerrar sesión"}</button>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 px-6 py-8 text-white shadow-xl shadow-slate-900/10 sm:px-9 sm:py-10">
                    <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-16 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />
                    <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-1/4 h-52 w-52 rounded-full bg-amber-400/10 blur-3xl" />
                    <svg aria-hidden="true" className="pointer-events-none absolute right-8 top-6 h-36 w-36 rotate-12 text-sky-300/10 sm:right-20 sm:top-4 sm:h-48 sm:w-48" viewBox="0 0 120 160" fill="currentColor">
                        <path d="M60 5C49 28 14 67 14 101a46 46 0 0 0 92 0C106 67 71 28 60 5Zm0 126a30 30 0 0 1-30-30c0-15 13-35 30-57 17 22 30 42 30 57a30 30 0 0 1-30 30Z" />
                        <path d="M45 104c2 10 8 16 18 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="5" />
                    </svg>
                    <div className="relative max-w-2xl">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-sky-100">
                            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                            LUMELEX · SOLUCIONES ELÉCTRICAS
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tu proyecto, siempre conectado.</h1>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Revisa el avance de tus instalaciones, consulta novedades y gestiona tus comprobantes en un solo lugar.</p>
                        <div className="mt-6 flex flex-wrap gap-3 text-sm">
                            <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-slate-200"><strong className="mr-1 text-white">{projects.length}</strong>{projects.length === 1 ? "proyecto asignado" : "proyectos asignados"}</span>
                            {projects.length > 0 && <span className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-slate-200"><strong className="mr-1 text-white">{Math.round(projects.reduce((total, project) => total + Number(project.progress || 0), 0) / projects.length)}%</strong>avance promedio</span>}
                        </div>
                    </div>
                    <div aria-hidden="true" className="absolute bottom-0 right-0 hidden items-end gap-2 pr-9 sm:flex">
                        <span className="mb-7 block h-12 w-1 rounded-full bg-amber-400/70" />
                        <span className="mb-0 block h-20 w-1 rounded-full bg-amber-400/40" />
                        <span className="mb-4 block h-16 w-1 rounded-full bg-sky-300/50" />
                    </div>
                </section>

                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Seguimiento</p>
                        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Mis proyectos</h2>
                        <p className="mt-1 text-sm text-slate-500">Avances, fechas y comprobantes de tus trabajos eléctricos.</p>
                    </div>
                    <div className="hidden items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-500 shadow-sm ring-1 ring-slate-200 sm:flex">
                        <svg aria-hidden="true" className="h-4 w-4 text-sky-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C9.4 7.2 4 12 4 16a8 8 0 0 0 16 0c0-4-5.4-8.8-8-14Zm0 18a4 4 0 0 1-4-4c0-1.7 1.8-4.5 4-7.4 2.2 2.9 4 5.7 4 7.4a4 4 0 0 1-4 4Z" /></svg>
                        Atención segura y personalizada
                    </div>
                </div>
                {passwordChangeSuggested && (
                    <section className="flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-sm sm:flex-row sm:items-center">
                        <div>
                            <h2 className="font-semibold text-amber-900">Protege tu cuenta</h2>
                            <p className="mt-1 text-sm text-amber-800">Estás usando la contraseña temporal basada en tu identificación. Te recomendamos cambiarla; no es obligatorio para usar el portal.</p>
                        </div>
                        <button onClick={() => navigate("/cliente/cambiar-clave")} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">Cambiar contraseña</button>
                    </section>
                )}
                {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
                {success && <div role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success}</div>}
                {loading ? (
                    <p className="py-16 text-center text-slate-500">Cargando tus proyectos…</p>
                ) : projects.length === 0 ? (
                    <section className="relative isolate overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm sm:py-16">
                        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-sky-100/70 blur-3xl" />
                        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                            <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M13 2 4.5 13h6L10 22l9.5-12h-6L13 2Z" /></svg>
                        </div>
                        <h2 className="relative mt-5 text-lg font-bold text-slate-900">Tus proyectos aparecerán aquí</h2>
                        <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Cuando una cotización sea aceptada y el equipo de Lumelex asigne un proyecto a tu cuenta, podrás consultar su avance en este espacio.</p>
                    </section>
                ) : projects.map((project) => (
                    <section key={project.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 transition hover:shadow-md">
                        <div className="h-1.5 bg-gradient-to-r from-sky-500 via-cyan-400 to-amber-400" />
                        <div className="space-y-6 p-5 sm:p-7">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                            <div>
                                <p className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-800"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" />{project.number}</p>
                                <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{project.title}</h2>
                                {project.quotation && <p className="mt-1 text-sm text-slate-500">Cotización <span className="font-semibold text-slate-700">{project.quotation.number}</span><span className="mx-2 text-slate-300">·</span><span className="font-semibold text-slate-700">{money(project.quotation.total)}</span></p>}
                                {project.work_order && <p className="mt-2 text-xs font-semibold text-sky-800">Orden de trabajo: {project.work_order.number}</p>}
                            </div>
                            <div className="w-full rounded-2xl bg-slate-50 p-4 sm:max-w-56">
                                <div className="flex justify-between text-sm"><span className="font-medium text-slate-600">Avance general</span><span className="font-bold text-sky-800">{project.progress}%</span></div>
                                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-400 transition-all" style={{ width: `${project.progress}%` }} /></div>
                            </div>
                        </div>

                        {project.description && <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{project.description}</p>}
                        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                            <span className="rounded-xl border border-slate-200 bg-white px-3 py-2">Estado: <strong className="text-slate-800">{project.status === "planning" ? "Planificación" : project.status === "in_progress" ? "En progreso" : project.status === "on_hold" ? "En pausa" : project.status === "completed" ? "Completado" : "Cancelado"}</strong></span>
                            {project.target_date && <span className="rounded-xl border border-slate-200 bg-white px-3 py-2">Fecha estimada: <strong className="text-slate-800">{new Date(`${project.target_date.slice(0, 10)}T12:00:00`).toLocaleDateString("es-EC")}</strong></span>}
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                            <h3 className="flex items-center gap-2 font-semibold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700"><svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg></span>Historial de avances</h3>
                            <div className="mt-3 space-y-4">
                                {project.updates?.map((update) => (
                                    <article key={update.id} className="border-l-2 border-amber-400 pl-4">
                                        <div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-semibold text-slate-800">{update.title}</h4><time className="text-xs text-slate-500">{new Date(update.created_at).toLocaleString("es-EC")}</time></div>
                                        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{update.description}</p>
                                        {update.progress !== null && <p className="mt-1 text-xs font-semibold text-amber-800">Avance acumulado: {update.progress}%</p>}
                                        {!!update.photos?.length && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{update.photos.map((photo) => <a key={photo.id} href={photo.download_url} target="_blank" rel="noreferrer"><img src={photo.download_url} alt={photo.original_name} loading="lazy" className="h-28 w-full rounded-lg object-cover" /></a>)}</div>}
                                    </article>
                                ))}
                                {!project.updates?.length && <p className="text-sm text-slate-500">Aún no se han publicado avances.</p>}
                            </div>
                        </div>

                        <div>
                            <h3 className="flex items-center gap-2 font-semibold text-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5M9 13h6M9 17h6" /></svg></span>Comprobantes de depósito</h3>
                            <div className="mt-3 space-y-3">
                                {project.deposit_receipts?.map((receipt) => (
                                    <article key={receipt.id} className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{receipt.original_name}</p>
                                            <p className="mt-1 text-xs text-slate-500">{new Date(receipt.created_at).toLocaleString("es-EC")} · {money(receipt.amount)} · {receiptStatus[receipt.status]}</p>
                                            {receipt.review_notes && <p className="mt-1 text-sm text-slate-600">Nota: {receipt.review_notes}</p>}
                                        </div>
                                        <button onClick={() => void handleDownload(receipt)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Descargar</button>
                                    </article>
                                ))}
                                {!project.deposit_receipts?.length && <p className="text-sm text-slate-500">Aún no has enviado comprobantes.</p>}
                            </div>
                        </div>

                        <form onSubmit={(event) => void submitReceipt(event, project)} className="rounded-2xl border border-dashed border-sky-300 bg-gradient-to-br from-sky-50/80 to-white p-4 sm:p-5">
                            <h3 className="font-semibold text-slate-900">Enviar comprobante del depósito</h3>
                            <p className="mt-1 text-xs text-slate-500">Aceptamos PDF, JPG, PNG o WEBP de hasta 10 MB. El comprobante solo será visible para ti, administración y contabilidad.</p>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <label className="text-sm font-medium text-slate-700">Archivo del comprobante *
                                    <input ref={(element) => { fileInputs.current[project.id] = element; }} required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFiles((current) => ({ ...current, [project.id]: event.target.files?.[0] ?? null }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5" />
                                </label>
                                <label className="text-sm font-medium text-slate-700">Monto del depósito (USD)
                                    <input type="text" inputMode="decimal" value={amounts[project.id] ?? ""} onChange={(event) => setAmounts((current) => ({ ...current, [project.id]: event.target.value }))} placeholder="Opcional" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" />
                                </label>
                                <label className="text-sm font-medium text-slate-700 md:col-span-2">Nota (opcional)
                                    <textarea rows={2} maxLength={2000} value={notes[project.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [project.id]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5" />
                                </label>
                            </div>
                            <button type="submit" disabled={uploadingProject === project.id} className="mt-3 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{uploadingProject === project.id ? "Enviando…" : "Enviar comprobante"}</button>
                        </form>
                        </div>
                    </section>
                ))}
                <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-5 text-xs text-slate-500 sm:flex-row">
                    <div className="flex items-center gap-2">
                        <img src={lumelexLogo} alt="" className="h-8 w-12 object-contain" />
                        <span>Soluciones eléctricas e ingeniería</span>
                    </div>
                    <span>Tu energía, en buenas manos.</span>
                </footer>
            </div>
        </main>
    );
}

export default CustomerPortal;
