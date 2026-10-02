import { useEffect, useMemo, useState } from "react";
import {
    adjustInventoryStock,
    createInventoryProduct,
    deleteInventoryProduct,
    deleteInventoryProductImage,
    getInventoryProducts,
    uploadInventoryProductImage,
    updateInventoryProduct,
    type InventoryProduct,
    type InventoryProductPayload,
} from "../../../services/inventoryService";

type Filter = "all" | "low_stock" | "out_of_stock" | "inactive";

const emptyForm: InventoryProductPayload = {
    sku: "",
    name: "",
    description: "",
    category: "",
    unit: "unidad",
    unit_price: 0,
    stock_quantity: 0,
    minimum_stock: 0,
    is_active: true,
};

const responseMessage = (error: unknown, fallback: string) => {
    if (typeof error !== "object" || error === null) return fallback;
    const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
    return data?.errors ? Object.values(data.errors).flat().join(" ") : data?.message ?? fallback;
};

const statusText = (status: InventoryProduct["stock_status"]) => ({
    in_stock: "En stock",
    low_stock: "Stock bajo",
    out_of_stock: "Agotado",
}[status]);

const xmlEscape = (value: string) => value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const productIllustration = (product: InventoryProduct) => {
    const category = (product.category ?? "").toLocaleLowerCase();
    const name = product.name.toLocaleLowerCase();
    const color = category.includes("ilumin") ? "#f59e0b"
        : category.includes("conduct") ? "#2563eb"
            : category.includes("canal") ? "#64748b"
                : category.includes("tierra") ? "#16a34a"
                    : category.includes("tomacorr") ? "#7c3aed"
                        : category.includes("tablero") ? "#0f766e" : "#d97706";
    let shape = '<rect x="57" y="32" width="66" height="100" rx="12" fill="#334155"/><rect x="66" y="42" width="48" height="78" rx="8" fill="#e2e8f0"/><path d="M90 57l-10 20h12l-7 26 19-31H92z" fill="#f59e0b"/>';
    if (name.includes("cable") || category.includes("conduct")) {
        shape = '<circle cx="90" cy="81" r="43" fill="none" stroke="#334155" stroke-width="16"/><circle cx="90" cy="81" r="25" fill="none" stroke="#f8fafc" stroke-width="7"/><path d="M122 109l21 18" stroke="#b45309" stroke-width="8" stroke-linecap="round"/>';
    } else if (name.includes("tubo") || name.includes("conduit")) {
        shape = '<path d="M52 52h76v54H52z" rx="8" fill="#cbd5e1" stroke="#475569" stroke-width="8"/><path d="M64 63h52v32H64z" fill="#f8fafc"/><path d="M58 116h64" stroke="#64748b" stroke-width="7" stroke-linecap="round"/>';
    } else if (category.includes("ilumin") || name.includes("lámpara") || name.includes("reflector")) {
        shape = '<path d="M90 35c-23 0-38 16-38 36 0 14 8 23 18 34h40c10-11 18-20 18-34 0-20-15-36-38-36z" fill="#fde68a" stroke="#b45309" stroke-width="7"/><path d="M75 111h30m-27 12h24m-20 10h16" stroke="#475569" stroke-width="7" stroke-linecap="round"/>';
    } else if (category.includes("tomacorr") || name.includes("interruptor") || name.includes("tomacorriente")) {
        shape = '<rect x="56" y="35" width="68" height="100" rx="16" fill="#f8fafc" stroke="#64748b" stroke-width="7"/><circle cx="78" cy="76" r="5" fill="#334155"/><circle cx="102" cy="76" r="5" fill="#334155"/><path d="M90 91v12m-8 0h16" stroke="#334155" stroke-width="5" stroke-linecap="round"/>';
    } else if (name.includes("varilla") || category.includes("tierra")) {
        shape = '<path d="M90 29v100" stroke="#b45309" stroke-width="12" stroke-linecap="round"/><path d="M74 47h32m-32 18h32m-32 18h32" stroke="#fbbf24" stroke-width="5"/><path d="M77 130l13 18 13-18" fill="#b45309"/>';
    } else if (name.includes("cinta")) {
        shape = '<circle cx="90" cy="82" r="44" fill="#1e293b"/><circle cx="90" cy="82" r="23" fill="#e2e8f0"/><circle cx="90" cy="82" r="11" fill="#94a3b8"/><path d="M119 112l22 16" stroke="#1e293b" stroke-width="14" stroke-linecap="round"/>';
    } else if (name.includes("tablero") || category.includes("tablero")) {
        shape = '<rect x="54" y="30" width="72" height="108" rx="8" fill="#cbd5e1" stroke="#475569" stroke-width="7"/><rect x="65" y="42" width="50" height="17" rx="3" fill="#f8fafc"/><path d="M72 70v45m16-45v45m16-45v45" stroke="#334155" stroke-width="7"/><circle cx="108" cy="51" r="3" fill="#16a34a"/>';
    } else if (name.includes("breaker") || name.includes("protector") || name.includes("contactor") || category.includes("proteccion") || category.includes("control")) {
        shape = '<rect x="58" y="35" width="64" height="96" rx="9" fill="#f8fafc" stroke="#475569" stroke-width="7"/><rect x="72" y="50" width="36" height="17" rx="5" fill="#cbd5e1"/><path d="M90 70v26" stroke="#334155" stroke-width="10" stroke-linecap="round"/><circle cx="90" cy="111" r="5" fill="#22c55e"/>';
    }
    const title = xmlEscape(product.name.slice(0, 34));
    const sku = xmlEscape(product.sku ?? product.category ?? "LUMELEX");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" rx="20" fill="#f1f5f9"/><rect x="8" y="8" width="164" height="164" rx="16" fill="#fff" stroke="#e2e8f0"/><circle cx="90" cy="80" r="61" fill="${color}" opacity=".1"/>${shape}<text x="90" y="157" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#334155">${title}</text><text x="90" y="169" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" fill="#64748b">${sku}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export default function Inventory() {
    const [products, setProducts] = useState<InventoryProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [error, setError] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<InventoryProductPayload>(emptyForm);
    const [adjusting, setAdjusting] = useState<InventoryProduct | null>(null);
    const [adjustment, setAdjustment] = useState({ quantity_change: "", reason: "" });
    const [dialogError, setDialogError] = useState("");
    const [imageSavingId, setImageSavingId] = useState<number | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            setError("");
            setProducts(await getInventoryProducts());
        } catch (loadError) {
            setError(responseMessage(loadError, "No se pudo cargar el inventario."));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;
        getInventoryProducts()
            .then((items) => {
                if (mounted) setProducts(items);
            })
            .catch((loadError) => {
                if (mounted) setError(responseMessage(loadError, "No se pudo cargar el inventario."));
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, []);

    const visibleProducts = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return products.filter((product) => {
            const matchesText = !query || [
                product.name, product.sku ?? "", product.description ?? "", product.category ?? "",
            ].some((value) => value.toLocaleLowerCase().includes(query));
            const matchesFilter = filter === "all"
                || (filter === "inactive" && !product.is_active)
                || (filter === "low_stock" && product.is_active && product.stock_status === "low_stock")
                || (filter === "out_of_stock" && product.is_active && product.stock_status === "out_of_stock");
            return matchesText && matchesFilter;
        });
    }, [filter, products, search]);

    const lowStockCount = products.filter((product) =>
        product.is_active && product.stock_status !== "in_stock"
    ).length;

    const startCreate = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setDialogError("");
        setFormOpen(true);
        setError("");
    };

    const startEdit = (product: InventoryProduct) => {
        setEditingId(product.id);
        setForm({
            sku: product.sku ?? "",
            name: product.name,
            description: product.description ?? "",
            category: product.category ?? "",
            unit: product.unit,
            unit_price: Number(product.unit_price),
            stock_quantity: Number(product.stock_quantity),
            minimum_stock: Number(product.minimum_stock),
            is_active: product.is_active,
        });
        setDialogError("");
        setFormOpen(true);
        setError("");
    };

    const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            setSaving(true);
            setError("");
            if (editingId) await updateInventoryProduct(editingId, form);
            else await createInventoryProduct(form);
            setFormOpen(false);
            await load();
        } catch (saveError) {
            setDialogError(responseMessage(saveError, "No se pudo guardar el producto."));
        } finally {
            setSaving(false);
        }
    };

    const removeProduct = async (product: InventoryProduct) => {
        if (!window.confirm(`¿Eliminar "${product.name}" del inventario?`)) return;
        try {
            setError("");
            await deleteInventoryProduct(product.id);
            await load();
        } catch (deleteError) {
            setError(responseMessage(deleteError, "No se pudo eliminar el producto."));
        }
    };

    const saveAdjustment = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!adjusting) return;
        const quantity = Number(adjustment.quantity_change.replace(",", "."));
        if (!Number.isFinite(quantity) || quantity === 0 || !adjustment.reason.trim()) {
            setDialogError("Indica una variación distinta de cero y el motivo del ajuste.");
            return;
        }
        try {
            setSaving(true);
            setError("");
            await adjustInventoryStock(adjusting.id, quantity, adjustment.reason.trim());
            setAdjusting(null);
            setAdjustment({ quantity_change: "", reason: "" });
            await load();
        } catch (adjustError) {
            setDialogError(responseMessage(adjustError, "No se pudo registrar el ajuste de stock."));
        } finally {
            setSaving(false);
        }
    };

    const saveProductImage = async (product: InventoryProduct, image?: File) => {
        if (!image) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || image.size > 5 * 1024 * 1024) {
            setError("Selecciona una imagen JPG, PNG o WEBP de máximo 5 MB.");
            return;
        }
        try {
            setImageSavingId(product.id);
            setError("");
            const updated = await uploadInventoryProductImage(product.id, image);
            setProducts((current) => current.map((item) => item.id === product.id ? updated : item));
        } catch (imageError) {
            setError(responseMessage(imageError, "No se pudo guardar la imagen del producto."));
        } finally {
            setImageSavingId(null);
        }
    };

    const removeProductImage = async (product: InventoryProduct) => {
        try {
            setError("");
            const updated = await deleteInventoryProductImage(product.id);
            setProducts((current) => current.map((item) => item.id === product.id ? updated : item));
        } catch (imageError) {
            setError(responseMessage(imageError, "No se pudo eliminar la imagen del producto."));
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Catálogo y existencias</p>
                    <h1 className="mt-1 text-3xl font-bold text-slate-900">Inventario</h1>
                    <p className="mt-2 text-slate-600">Administra productos, precios, cantidades disponibles y mínimos de stock.</p>
                    <p className="mt-1 text-xs text-slate-500">Los productos sin foto muestran una ilustración vectorial generada como referencia; puedes reemplazarla por una foto real.</p>
                </div>
                <button type="button" onClick={startCreate} className="rounded-lg bg-amber-500 px-5 py-3 font-semibold text-slate-950 hover:bg-amber-400">+ Nuevo producto</button>
            </header>

            {lowStockCount > 0 && (
                <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                    <strong>Alerta de inventario:</strong> {lowStockCount} producto(s) con stock bajo o agotado.
                </div>
            )}
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 grid gap-3 md:grid-cols-[1fr_240px]">
                    <input aria-label="Buscar productos" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, SKU, categoría o descripción…" className="rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500" />
                    <select aria-label="Filtrar productos" value={filter} onChange={(event) => setFilter(event.target.value as Filter)} className="rounded-lg border border-slate-300 px-4 py-3">
                        <option value="all">Todos los productos</option>
                        <option value="low_stock">Stock bajo</option>
                        <option value="out_of_stock">Agotados</option>
                        <option value="inactive">Inactivos</option>
                    </select>
                </div>
                {loading ? <p className="py-12 text-center text-slate-500">Cargando inventario…</p> : visibleProducts.length === 0 ? (
                    <p className="py-12 text-center text-slate-500">No hay productos que coincidan con la búsqueda.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1180px] text-left text-sm">
                            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                                <th className="py-3 pr-4">Imagen</th><th className="py-3 pr-4">Producto</th><th className="py-3 pr-4">Categoría / SKU</th><th className="py-3 pr-4">Precio</th><th className="py-3 pr-4">Existencia</th><th className="py-3 pr-4">Mínimo</th><th className="py-3 pr-4">Estado</th><th className="py-3">Acciones</th>
                            </tr></thead>
                            <tbody>{visibleProducts.map((product) => (
                                <tr key={product.id} className="border-b border-slate-100 align-top">
                                    <td className="py-4 pr-4">
                                        <img src={product.image_url ?? productIllustration(product)} alt={product.image_url ? product.name : `Ilustración de referencia: ${product.name}`} loading="lazy" className="h-16 w-16 rounded-lg border border-slate-200 bg-slate-50 object-cover" />
                                        <label className="mt-1 block cursor-pointer text-xs font-semibold text-blue-700 hover:underline">
                                            {imageSavingId === product.id ? "Subiendo…" : product.image_url ? "Cambiar foto" : "Subir foto"}
                                            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={imageSavingId === product.id} onChange={(event) => { void saveProductImage(product, event.target.files?.[0]); event.target.value = ""; }} />
                                        </label>
                                        {!product.image_url && <a href={productIllustration(product)} download={`${product.sku ?? product.id}-ilustracion.svg`} className="mt-1 block text-xs text-slate-600 hover:underline">Descargar ilustración</a>}
                                        {product.image_url && <button type="button" onClick={() => void removeProductImage(product)} className="mt-1 block text-xs text-red-700 hover:underline">Quitar foto</button>}
                                    </td>
                                    <td className="py-4 pr-4"><strong className="block text-slate-900">{product.name}</strong>{product.description && <span className="mt-1 block max-w-md whitespace-pre-wrap text-xs leading-5 text-slate-500">{product.description}</span>}<span className="mt-1 block text-xs text-slate-500">Unidad: {product.unit}</span></td>
                                    <td className="py-4 pr-4 text-slate-600">{product.category || "—"}<span className="mt-1 block text-xs text-slate-500">{product.sku || "Sin SKU"}</span></td>
                                    <td className="py-4 pr-4 font-medium text-slate-800">{new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(Number(product.unit_price))}</td>
                                    <td className={`py-4 pr-4 font-semibold ${product.stock_status === "in_stock" ? "text-slate-800" : "text-amber-800"}`}>{Number(product.stock_quantity).toLocaleString("es-EC")} {product.unit}</td>
                                    <td className="py-4 pr-4 text-slate-600">{Number(product.minimum_stock).toLocaleString("es-EC")}</td>
                                    <td className="py-4 pr-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.stock_status === "in_stock" ? "bg-green-100 text-green-800" : product.stock_status === "low_stock" ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-800"}`}>{!product.is_active ? "Inactivo" : statusText(product.stock_status)}</span></td>
                                    <td className="py-4"><div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => { setAdjusting(product); setDialogError(""); setAdjustment({ quantity_change: "", reason: "" }); }} className="rounded border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-50">Ajustar stock</button>
                                        <button type="button" onClick={() => startEdit(product)} className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Editar</button>
                                        <button type="button" onClick={() => void removeProduct(product)} className="rounded border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">Eliminar</button>
                                    </div></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </section>

            {formOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation">
                    <form onSubmit={(event) => void saveProduct(event)} className="my-6 w-full max-w-3xl space-y-4 rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">{editingId ? "Editar producto" : "Nuevo producto"}</h2><button type="button" onClick={() => setFormOpen(false)} aria-label="Cerrar" className="text-2xl text-slate-500">×</button></div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="text-sm font-semibold text-slate-700">Nombre *<input required maxLength={180} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2.5 font-normal" /></label>
                            <label className="text-sm font-semibold text-slate-700">SKU<input maxLength={80} value={form.sku ?? ""} onChange={(event) => setForm({ ...form, sku: event.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2.5 font-normal" /></label>
                            <label className="text-sm font-semibold text-slate-700">Categoría<input maxLength={100} value={form.category ?? ""} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2.5 font-normal" /></label>
                            <label className="text-sm font-semibold text-slate-700">Unidad *<input required maxLength={30} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2.5 font-normal" /></label>
                            <label className="text-sm font-semibold text-slate-700">Precio unitario (USD) *<input required min="0" step="0.01" type="number" value={form.unit_price} onChange={(event) => setForm({ ...form, unit_price: Number(event.target.value) })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2.5 font-normal" /></label>
                            <label className="text-sm font-semibold text-slate-700">Cantidad actual *<input required min="0" step="0.001" type="number" value={form.stock_quantity} disabled={editingId !== null} onChange={(event) => setForm({ ...form, stock_quantity: Number(event.target.value) })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2.5 font-normal disabled:bg-slate-100 disabled:text-slate-500" />{editingId !== null && <span className="mt-1 block text-xs font-normal text-slate-500">Usa “Ajustar stock” para registrar una variación con su motivo.</span>}</label>
                            <label className="text-sm font-semibold text-slate-700">Stock mínimo *<input required min="0" step="0.001" type="number" value={form.minimum_stock} onChange={(event) => setForm({ ...form, minimum_stock: Number(event.target.value) })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2.5 font-normal" /></label>
                            <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />Producto activo</label>
                            <label className="text-sm font-semibold text-slate-700 md:col-span-2">Descripción completa<textarea rows={4} maxLength={10000} value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2.5 font-normal" /></label>
                        </div>
                        {dialogError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{dialogError}</p>}
                        <div className="flex justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700">Cancelar</button><button disabled={saving} className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-slate-950 disabled:opacity-50">{saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear producto"}</button></div>
                    </form>
                </div>
            )}

            {adjusting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <form onSubmit={(event) => void saveAdjustment(event)} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
                        <div><h2 className="text-xl font-bold text-slate-900">Ajustar existencia</h2><p className="mt-1 text-sm text-slate-600">{adjusting.name} · Existencia actual: {Number(adjusting.stock_quantity)} {adjusting.unit}</p></div>
                        <label className="block text-sm font-semibold text-slate-700">Cambio de cantidad *<input required type="number" step="0.001" value={adjustment.quantity_change} onChange={(event) => setAdjustment({ ...adjustment, quantity_change: event.target.value })} placeholder="Ej. 5 para entrada o -2 para salida" className="mt-1 w-full rounded border border-slate-300 px-3 py-2.5 font-normal" /><span className="mt-1 block text-xs font-normal text-slate-500">Usa un valor positivo para sumar y negativo para restar.</span></label>
                        <label className="block text-sm font-semibold text-slate-700">Motivo del ajuste *<textarea required maxLength={1000} rows={3} value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} placeholder="Compra, corrección de conteo, material dañado…" className="mt-1 w-full rounded border border-slate-300 px-3 py-2.5 font-normal" /></label>
                        {dialogError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{dialogError}</p>}
                        <div className="flex justify-end gap-3"><button type="button" onClick={() => setAdjusting(null)} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Cancelar</button><button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Registrando…" : "Registrar ajuste"}</button></div>
                    </form>
                </div>
            )}
        </div>
    );
}
