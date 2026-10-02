import { useCallback, useEffect, useState } from "react";

import {
    createProjectMaterial,
    deleteProjectMaterial,
    downloadDepositReceipt,
    getProjects,
    getProject,
    reviewDepositReceipt,
    updateProjectMaterial,
    updateProject,
    type DepositReceipt,
    type Project,
    type ProjectStatus,
} from "../../../services/projectService";

const projectStatuses: { value: ProjectStatus; label: string }[] = [
    { value: "planning", label: "Planificación" },
    { value: "in_progress", label: "En progreso" },
    { value: "on_hold", label: "En pausa" },
    { value: "completed", label: "Completado" },
    { value: "cancelled", label: "Cancelado" },
];

const receiptStatus: Record<string, string> = {
    pending: "Pendiente de revisión",
    approved: "Aprobado",
    rejected: "Rechazado",
};

const money = (value: number | string | null) =>
    value === null
        ? "No indicado"
        : new Intl.NumberFormat("es-EC", {
            style: "currency",
            currency: "USD",
        }).format(Number(value) || 0);

const readableError = (error: unknown) => {
    if (typeof error !== "object" || error === null) return "No se pudo completar la operación.";
    const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
    return data?.message || (data?.errors ? Object.values(data.errors).flat().join(" ") : "") || "No se pudo completar la operación.";
};

function Projects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [updateTitle, setUpdateTitle] = useState("");
    const [updateDescription, setUpdateDescription] = useState("");
    const [progress, setProgress] = useState("0");
    const [status, setStatus] = useState<ProjectStatus>("planning");
    const [startsAt, setStartsAt] = useState("");
    const [targetDate, setTargetDate] = useState("");
    const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
    const [materialForm, setMaterialForm] = useState({
        name: "",
        quantity: "1",
        unit: "unidad",
        unit_cost: "0",
        notes: "",
    });
    const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);

    const loadProjects = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const response = await getProjects(search.trim());
            setProjects(response.data);
        } catch (loadError) {
            console.error("Error cargando proyectos:", loadError);
            setError(readableError(loadError));
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const timeout = window.setTimeout(() => void loadProjects(), search ? 250 : 0);
        return () => window.clearTimeout(timeout);
    }, [loadProjects, search]);

    const openProject = async (id: number) => {
        try {
            setSaving(true);
            setError("");
            const project = await getProject(id);
            setSelectedProject(project);
            setProgress(String(project.progress));
            setStatus(project.status);
            setStartsAt(project.starts_at ?? "");
            setTargetDate(project.target_date ?? "");
            setUpdateTitle("");
            setUpdateDescription("");
        } catch (loadError) {
            console.error("Error abriendo proyecto:", loadError);
            setError(readableError(loadError));
        } finally {
            setSaving(false);
        }
    };

    const submitUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedProject) return;
        try {
            setSaving(true);
            setError("");
            const updated = await updateProject(selectedProject.id, {
                status,
                progress: Number(progress),
                starts_at: startsAt || null,
                target_date: targetDate || null,
                update_title: updateTitle,
                update_description: updateDescription,
                visible_to_customer: true,
            });
            setSelectedProject(updated);
            await loadProjects();
        } catch (saveError) {
            console.error("Error publicando avance:", saveError);
            setError(readableError(saveError));
        } finally {
            setSaving(false);
        }
    };

    const refreshSelectedProject = async () => {
        if (!selectedProject) return;
        setSelectedProject(await getProject(selectedProject.id));
    };

    const submitMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedProject) return;
        try {
            setSaving(true);
            setError("");
            const payload = {
                name: materialForm.name.trim(),
                quantity: Number(materialForm.quantity),
                unit: materialForm.unit.trim(),
                unit_cost: Number(materialForm.unit_cost),
                notes: materialForm.notes.trim(),
            };
            if (editingMaterialId) {
                await updateProjectMaterial(selectedProject.id, editingMaterialId, payload);
            } else {
                await createProjectMaterial(selectedProject.id, payload);
            }
            setMaterialForm({ name: "", quantity: "1", unit: "unidad", unit_cost: "0", notes: "" });
            setEditingMaterialId(null);
            await refreshSelectedProject();
        } catch (saveError) {
            console.error("Error guardando material del proyecto:", saveError);
            setError(readableError(saveError));
        } finally {
            setSaving(false);
        }
    };

    const editMaterial = (material: NonNullable<Project["materials"]>[number]) => {
        setEditingMaterialId(material.id);
        setMaterialForm({
            name: material.name,
            quantity: String(material.quantity),
            unit: material.unit,
            unit_cost: String(material.unit_cost),
            notes: material.notes ?? "",
        });
    };

    const removeMaterial = async (materialId: number) => {
        if (!selectedProject || !window.confirm("¿Eliminar este material del proyecto?")) return;
        try {
            setSaving(true);
            setError("");
            await deleteProjectMaterial(selectedProject.id, materialId);
            if (editingMaterialId === materialId) {
                setEditingMaterialId(null);
                setMaterialForm({ name: "", quantity: "1", unit: "unidad", unit_cost: "0", notes: "" });
            }
            await refreshSelectedProject();
        } catch (deleteError) {
            console.error("Error eliminando material del proyecto:", deleteError);
            setError(readableError(deleteError));
        } finally {
            setSaving(false);
        }
    };

    const handleReview = async (
        receipt: DepositReceipt,
        reviewStatus: "approved" | "rejected"
    ) => {
        try {
            setSaving(true);
            setError("");
            await reviewDepositReceipt(
                receipt.id,
                reviewStatus,
                reviewNotes[receipt.id] ?? ""
            );
            await openProject(selectedProject!.id);
        } catch (reviewError) {
            console.error("Error revisando comprobante:", reviewError);
            setError(readableError(reviewError));
        } finally {
            setSaving(false);
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

    const portalAccount = selectedProject?.customer.portal_users?.[0];

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {selectedProject ? selectedProject.number : "Proyectos"}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {selectedProject
                            ? selectedProject.title
                            : "Seguimiento de cotizaciones aceptadas, avances y depósitos."}
                    </p>
                </div>
                {selectedProject && (
                    <button onClick={() => setSelectedProject(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        ← Volver a proyectos
                    </button>
                )}
            </div>

            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            {!selectedProject && (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por proyecto, cliente o identificación…" className="mb-5 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500" />
                    {loading ? (
                        <p className="py-10 text-center text-sm text-slate-500">Cargando proyectos…</p>
                    ) : projects.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-500">Aún no hay proyectos. Al aceptar una cotización se creará aquí automáticamente.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[960px] text-left text-sm">
                                <thead><tr className="border-b border-slate-200 text-slate-500">
                                    <th className="px-3 py-3">Proyecto</th><th className="px-3 py-3">Cliente</th>
                                    <th className="px-3 py-3">Cotización</th><th className="px-3 py-3">Orden de trabajo</th>
                                    <th className="px-3 py-3">Estado</th><th className="px-3 py-3">Avance</th><th className="px-3 py-3">Comprobantes</th>
                                </tr></thead>
                                <tbody>{projects.map((project) => (
                                    <tr key={project.id} onClick={() => void openProject(project.id)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-3 py-4"><div className="font-semibold">{project.number}</div><div className="text-xs text-slate-500">{project.title}</div></td>
                                        <td className="px-3 py-4"><div>{project.customer.name}</div><div className="text-xs text-slate-500">{project.customer.identification}</div></td>
                                        <td className="px-3 py-4">{project.quotation?.number ?? "—"}</td>
                                        <td className="px-3 py-4 font-semibold text-sky-800">{project.work_order?.number ?? "—"}</td>
                                        <td className="px-3 py-4">{projectStatuses.find((item) => item.value === project.status)?.label}</td>
                                        <td className="px-3 py-4">{project.progress}%</td>
                                        <td className="px-3 py-4">{project.deposit_receipts_count ?? 0}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {selectedProject && (
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
                    <div className="space-y-5">
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">{selectedProject.title}</h2>
                                    <p className="mt-1 text-sm text-slate-500">Cliente: {selectedProject.customer.name} · {selectedProject.customer.identification}</p>
                                    {selectedProject.quotation && <p className="mt-1 text-sm text-slate-500">Cotización: {selectedProject.quotation.number} · {money(selectedProject.quotation.total)}</p>}
                                    {selectedProject.work_order && (
                                        <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm">
                                            <span className="text-slate-600">Orden de trabajo</span>
                                            <strong className="text-sky-900">{selectedProject.work_order.number}</strong>
                                            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-sky-800">{selectedProject.work_order.status === "pending" ? "Pendiente" : selectedProject.work_order.status}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-32 text-right">
                                    <p className="text-2xl font-bold text-slate-900">{selectedProject.progress}%</p>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${selectedProject.progress}%` }} /></div>
                                </div>
                            </div>
                            {portalAccount && (
                                <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
                                    <p className="text-sm font-semibold text-blue-900">Acceso al portal del cliente</p>
                                    <p className="mt-1 text-sm text-blue-800">{portalAccount.name} · {portalAccount.email}</p>
                                    <p className="mt-1 text-xs text-blue-700">La contraseña inicial se entregó al aceptar la cotización. No se puede volver a consultar; el cliente puede restablecerla con administración.</p>
                                </div>
                            )}
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h2 className="font-semibold text-slate-900">Materiales y gastos del proyecto</h2>
                                    <p className="mt-1 text-sm text-slate-500">Listado y costo estimado de los materiales previstos para esta obra.</p>
                                </div>
                                <p className="text-lg font-bold text-slate-900">
                                    Total: {money((selectedProject.materials ?? []).reduce((sum, item) => sum + item.total_cost, 0))}
                                </p>
                            </div>
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">Material</th>
                                            <th className="px-3 py-2">Cantidad</th>
                                            <th className="px-3 py-2">Costo unitario</th>
                                            <th className="px-3 py-2">Gasto</th>
                                            <th className="px-3 py-2">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedProject.materials?.map((material) => (
                                            <tr key={material.id} className="border-b border-slate-100">
                                                <td className="px-3 py-3">
                                                    <p className="font-medium text-slate-800">{material.name}</p>
                                                    {material.notes && <p className="mt-1 max-w-sm text-xs text-slate-500">{material.notes}</p>}
                                                </td>
                                                <td className="px-3 py-3 text-slate-600">{Number(material.quantity)} {material.unit}</td>
                                                <td className="px-3 py-3 text-slate-600">{money(material.unit_cost)}</td>
                                                <td className="px-3 py-3 font-semibold text-slate-800">{money(material.total_cost)}</td>
                                                <td className="px-3 py-3">
                                                    <div className="flex gap-2">
                                                        <button type="button" disabled={saving || ["completed", "cancelled"].includes(selectedProject.status)} onClick={() => editMaterial(material)} className="rounded border border-slate-300 px-2.5 py-1.5 text-xs disabled:opacity-50">Editar</button>
                                                        <button type="button" disabled={saving || ["completed", "cancelled"].includes(selectedProject.status)} onClick={() => void removeMaterial(material.id)} className="rounded border border-red-200 px-2.5 py-1.5 text-xs text-red-700 disabled:opacity-50">Eliminar</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {!selectedProject.materials?.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Aún no hay materiales registrados.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            {!["completed", "cancelled"].includes(selectedProject.status) && (
                                <form onSubmit={submitMaterial} className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
                                    <h3 className="font-medium text-slate-800 sm:col-span-2">{editingMaterialId ? "Editar material" : "Agregar material"}</h3>
                                    <label className="text-sm text-slate-700">Material
                                        <input required maxLength={180} value={materialForm.name} onChange={(event) => setMaterialForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="text-sm text-slate-700">Cantidad
                                            <input required type="number" min="0.001" step="0.001" value={materialForm.quantity} onChange={(event) => setMaterialForm((current) => ({ ...current, quantity: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                                        </label>
                                        <label className="text-sm text-slate-700">Unidad
                                            <input required maxLength={40} value={materialForm.unit} onChange={(event) => setMaterialForm((current) => ({ ...current, unit: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                                        </label>
                                    </div>
                                    <label className="text-sm text-slate-700">Costo por unidad (USD)
                                        <input required type="number" min="0" step="0.01" value={materialForm.unit_cost} onChange={(event) => setMaterialForm((current) => ({ ...current, unit_cost: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                                    </label>
                                    <label className="text-sm text-slate-700">Notas
                                        <input maxLength={2000} value={materialForm.notes} onChange={(event) => setMaterialForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
                                    </label>
                                    <div className="flex gap-2 sm:col-span-2">
                                        <button disabled={saving} type="submit" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving ? "Guardando…" : editingMaterialId ? "Guardar cambios" : "Agregar material"}</button>
                                        {editingMaterialId && <button type="button" onClick={() => { setEditingMaterialId(null); setMaterialForm({ name: "", quantity: "1", unit: "unidad", unit_cost: "0", notes: "" }); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancelar</button>}
                                    </div>
                                </form>
                            )}
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="font-semibold text-slate-900">Comprobantes de depósito</h2>
                            {!selectedProject.deposit_receipts?.length ? (
                                <p className="py-6 text-sm text-slate-500">Este proyecto aún no tiene comprobantes enviados.</p>
                            ) : (
                                <div className="mt-4 space-y-4">
                                    {selectedProject.deposit_receipts.map((receipt) => (
                                        <article key={receipt.id} className="rounded-lg border border-slate-200 p-4">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-slate-800">{receipt.original_name}</p>
                                                    <p className="mt-1 text-sm text-slate-500">Subido por {receipt.uploader?.name} · {new Date(receipt.created_at).toLocaleString("es-EC")}</p>
                                                    <p className="mt-1 text-sm text-slate-700">Monto del depósito: {money(receipt.amount)}</p>
                                                    {receipt.notes && <p className="mt-1 text-sm text-slate-600">{receipt.notes}</p>}
                                                </div>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${receipt.status === "approved" ? "bg-green-100 text-green-800" : receipt.status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}`}>{receiptStatus[receipt.status]}</span>
                                            </div>
                                            {receipt.review_notes && <p className="mt-3 text-sm text-slate-600">Revisión: {receipt.review_notes}</p>}
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button onClick={() => void handleDownload(receipt)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Descargar comprobante</button>
                                                {receipt.status === "pending" && (
                                                    <>
                                                        <input value={reviewNotes[receipt.id] ?? ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [receipt.id]: event.target.value }))} placeholder="Nota de revisión (opcional)" className="min-w-48 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs" />
                                                        <button disabled={saving} onClick={() => void handleReview(receipt, "approved")} className="rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Aprobar</button>
                                                        <button disabled={saving} onClick={() => void handleReview(receipt, "rejected")} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Rechazar</button>
                                                    </>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="font-semibold text-slate-900">Avances compartidos con el cliente</h2>
                            <div className="mt-4 space-y-3">
                                {selectedProject.updates?.map((update) => (
                                    <article key={update.id} className="border-l-2 border-amber-400 pl-4">
                                        <div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-semibold text-slate-800">{update.title}</h3><time className="text-xs text-slate-500">{new Date(update.created_at).toLocaleString("es-EC")}</time></div>
                                        <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{update.description}</p>
                                        {update.progress !== null && <p className="mt-1 text-xs font-semibold text-amber-800">Avance: {update.progress}%</p>}
                                        {!!update.photos?.length && <div className="mt-3 grid grid-cols-2 gap-2">{update.photos.map((photo) => <a key={photo.id} href={photo.download_url} target="_blank" rel="noreferrer"><img src={photo.download_url} alt={photo.original_name} loading="lazy" className="h-24 w-full rounded-lg object-cover" /></a>)}</div>}
                                    </article>
                                ))}
                                {!selectedProject.updates?.length && <p className="text-sm text-slate-500">Aún no se han publicado avances.</p>}
                            </div>
                        </section>
                    </div>

                    <form onSubmit={submitUpdate} className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="font-semibold text-slate-900">Publicar avance</h2>
                        <label className="block text-sm font-medium text-slate-700">Estado del proyecto
                            <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5">
                                {projectStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>
                        </label>
                        <label className="block text-sm font-medium text-slate-700">Porcentaje completado
                            <input required type="number" min={selectedProject.progress} max="100" value={progress} onChange={(event) => setProgress(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                            <label className="block text-sm font-medium text-slate-700">Inicio (opcional)
                                <input type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                            </label>
                            <label className="block text-sm font-medium text-slate-700">Fecha estimada
                                <input type="date" min={startsAt || undefined} value={targetDate} onChange={(event) => setTargetDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                            </label>
                        </div>
                        <label className="block text-sm font-medium text-slate-700">Título del avance *
                            <input required maxLength={180} value={updateTitle} onChange={(event) => setUpdateTitle(event.target.value)} placeholder="Ej. Instalación de canalización" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                        </label>
                        <label className="block text-sm font-medium text-slate-700">Descripción *
                            <textarea required maxLength={5000} rows={4} value={updateDescription} onChange={(event) => setUpdateDescription(event.target.value)} placeholder="Describe el progreso, trabajos realizados o próximos pasos." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                        </label>
                        <p className="text-xs text-slate-500">El avance no puede retroceder. Si repites el porcentaje actual, la actualización queda registrada sin duplicar el porcentaje.</p>
                        <button type="submit" disabled={saving} className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{saving ? "Guardando…" : "Guardar avance"}</button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Projects;
