import { useEffect, useMemo, useState } from "react";
import QuotationImport, {
    type ImportedQuotationItem,
} from "../../../components/quotations/QuotationImport";
import {
    getInventoryProducts,
    type InventoryProduct,
} from "../../../services/inventoryService";

import {
    getCustomers,
    type Customer,
} from "../../../services/customerService";
import {
    createQuotation,
    cloneQuotation,
    deleteQuotation,
    getQuotation,
    getQuotations,
    sendQuotationByEmail,
    updateQuotation,
    type Quotation,
    type QuotationItemCategory,
    type QuotationPayload,
    type PortalCredentials,
    type QuotationStatus,
} from "../../../services/quotationService";

type ViewMode = "list" | "form" | "detail";

const statuses: { value: QuotationStatus; label: string }[] = [
    { value: "draft", label: "Borrador" },
    { value: "sent", label: "Enviada" },
    { value: "accepted", label: "Aceptada" },
    { value: "rejected", label: "Rechazada" },
    { value: "expired", label: "Vencida" },
    { value: "cancelled", label: "Cancelada" },
];

const categories: { value: QuotationItemCategory; label: string }[] = [
    { value: "material", label: "Materiales" },
    { value: "labor", label: "Mano de obra" },
    { value: "equipment", label: "Equipos" },
    { value: "service", label: "Servicios" },
    { value: "other", label: "Otros" },
];

type QuotationForm = Omit<
    QuotationPayload,
    "discount_percent" | "tax_percent" | "internal_worker_count" | "internal_work_days" | "internal_daily_rate" | "items"
> & {
    discount_percent: string;
    tax_percent: string;
    internal_worker_count: string;
    internal_work_days: string;
    internal_daily_rate: string;
    items: Array<
        Omit<QuotationPayload["items"][number], "quantity" | "unit_price"> & {
            quantity: string;
            unit_price: string;
        }
    >;
};

const units = [
    { value: "m", label: "Metro (m)" },
    { value: "km", label: "Kilómetro (km)" },
    { value: "cm", label: "Centímetro (cm)" },
    { value: "mm", label: "Milímetro (mm)" },
    { value: "rollo", label: "Rollo" },
    { value: "tramo", label: "Tramo" },
    { value: "unidad", label: "Unidad (u)" },
    { value: "punto", label: "Punto eléctrico" },
    { value: "salida", label: "Salida eléctrica" },
    { value: "circuito", label: "Circuito" },
    { value: "tablero", label: "Tablero" },
    { value: "caja", label: "Caja" },
    { value: "kit", label: "Kit" },
    { value: "par", label: "Par" },
    { value: "hora", label: "Hora" },
    { value: "jornada", label: "Jornada" },
    { value: "día", label: "Día" },
    { value: "servicio", label: "Servicio" },
    { value: "visita", label: "Visita técnica" },
    { value: "lote", label: "Lote" },
    { value: "kg", label: "Kilogramo (kg)" },
    { value: "m²", label: "Metro cuadrado (m²)" },
    { value: "m³", label: "Metro cúbico (m³)" },
    { value: "galón", label: "Galón" },
    { value: "paquete", label: "Paquete" },
] as const;

const toLocalDateValue = (date: Date) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

const today = () => toLocalDateValue(new Date());

const dateAfter = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toLocalDateValue(date);
};

const emptyItem = () => ({
    product_id: null as number | null,
    category: "material" as QuotationItemCategory,
    description: "",
    unit: "m",
    quantity: "1",
    unit_price: "0",
});

const emptyQuotation = (): QuotationForm => ({
    customer_id: 0,
    title: "",
    issue_date: today(),
    valid_until: dateAfter(30),
    status: "draft",
    scope: "",
    notes: "",
    terms: "Precios expresados en dólares de los Estados Unidos (USD).",
    discount_percent: "0",
    tax_percent: "15",
    internal_labor_enabled: false,
    internal_worker_count: "1",
    internal_work_days: "1",
    internal_daily_rate: "0",
    items: [emptyItem()],
});

const toPayload = (form: QuotationForm): QuotationPayload => ({
    ...form,
    discount_percent: parseUserNumber(form.discount_percent),
    tax_percent: parseUserNumber(form.tax_percent),
    internal_worker_count: form.internal_labor_enabled
        ? parseUserNumber(form.internal_worker_count)
        : 0,
    internal_work_days: form.internal_labor_enabled
        ? parseUserNumber(form.internal_work_days)
        : 0,
    internal_daily_rate: form.internal_labor_enabled
        ? parseUserNumber(form.internal_daily_rate)
        : 0,
    items: form.items.map((item) => ({
        ...item,
        quantity: parseUserNumber(item.quantity),
        unit_price: parseUserNumber(item.unit_price),
    })),
});

const parseUserNumber = (value: string) => {
    const normalized = value.trim().replace(",", ".");
    return normalized ? Number(normalized) : 0;
};

const isValidUserNumber = (value: string) =>
    /^\d+(?:[.,]\d+)?$/.test(value.trim());

const numberInputValue = (value: number | string) => {
    const parsed = typeof value === "number" ? value : parseUserNumber(value);
    return Number.isFinite(parsed) ? String(parsed) : "";
};

const money = (value: number | string) =>
    new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(Number(value) || 0);

const formatDate = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("es-EC");
};

const responseMessage = (error: unknown, fallback: string) => {
    if (typeof error !== "object" || error === null) return fallback;
    const data = (
        error as {
            response?: {
                data?: {
                    message?: string;
                    errors?: Record<string, string[]>;
                };
            };
        }
    ).response?.data;
    const validationMessage = data?.errors
        ? Object.values(data.errors).flat().join(" ")
        : "";
    return validationMessage || data?.message || fallback;
};

const statusStyle: Record<QuotationStatus, string> = {
    draft: "bg-slate-100 text-slate-700",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    expired: "bg-amber-100 text-amber-800",
    cancelled: "bg-slate-200 text-slate-600",
};

function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
    return (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[status]}`}>
            {statuses.find((item) => item.value === status)?.label ?? status}
        </span>
    );
}

function QuotationPage() {
    const [mode, setMode] = useState<ViewMode>("list");
    const [quotations, setQuotations] = useState<Quotation[]>([]);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<QuotationStatus | "">("");
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [form, setForm] = useState<QuotationForm>(emptyQuotation);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerError, setCustomerError] = useState("");
    const [showCustomerOptions, setShowCustomerOptions] = useState(false);
    const [statusSaving, setStatusSaving] = useState(false);
    const [pdfDownloading, setPdfDownloading] = useState(false);
    const [nextStatus, setNextStatus] = useState<QuotationStatus>("draft");
    const [portalCredentials, setPortalCredentials] =
        useState<PortalCredentials | null>(null);
    const [credentialsCopied, setCredentialsCopied] = useState(false);
    const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
    const [inventoryError, setInventoryError] = useState("");
    const [cloneOpen, setCloneOpen] = useState(false);
    const [cloneCustomers, setCloneCustomers] = useState<Customer[]>([]);
    const [cloneCustomerId, setCloneCustomerId] = useState("");
    const [cloneSaving, setCloneSaving] = useState(false);

    const itemsSubtotal = useMemo(
        () => form.items.reduce(
            (sum, item) => sum
                + parseUserNumber(item.quantity) * parseUserNumber(item.unit_price),
            0
        ),
        [form.items]
    );
    const internalLaborTotal = form.internal_labor_enabled
        ? parseUserNumber(form.internal_worker_count)
            * parseUserNumber(form.internal_work_days)
            * parseUserNumber(form.internal_daily_rate)
        : 0;
    const subtotal = itemsSubtotal + internalLaborTotal;
    const discountAmount = subtotal * parseUserNumber(form.discount_percent) / 100;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = taxableAmount * parseUserNumber(form.tax_percent) / 100;
    const total = taxableAmount + taxAmount;
    const selectedCustomer = customers.find(
        (customer) => customer.id === form.customer_id
    );

    useEffect(() => {
        if (mode !== "list") return;
        let mounted = true;
        const timer = window.setTimeout(async () => {
            try {
                setLoading(true);
                setError("");
                const result = await getQuotations(search.trim(), statusFilter, page);
                if (mounted) {
                    setQuotations(result.data);
                    setLastPage(result.last_page);
                    setTotalCount(result.total);
                }
            } catch (loadError) {
                console.error("Error cargando cotizaciones:", loadError);
                if (mounted) {
                    setError(responseMessage(loadError, "No se pudieron cargar las cotizaciones."));
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }, search ? 250 : 0);

        return () => {
            mounted = false;
            window.clearTimeout(timer);
        };
    }, [mode, page, search, statusFilter]);

    useEffect(() => {
        if (mode !== "form") return;
        let mounted = true;
        const timer = window.setTimeout(async () => {
            try {
                setCustomerLoading(true);
                setCustomerError("");
                const result = await getCustomers(
                    customerSearch.trim() || undefined,
                    undefined,
                    100,
                    true
                );
                if (mounted) setCustomers(result.data ?? []);
            } catch (loadError) {
                console.error("Error buscando clientes para cotizar:", loadError);
                if (mounted) {
                    setCustomerError(
                        responseMessage(loadError, "No se pudieron cargar los clientes.")
                    );
                }
            } finally {
                if (mounted) setCustomerLoading(false);
            }
        }, customerSearch ? 250 : 0);

        return () => {
            mounted = false;
            window.clearTimeout(timer);
        };
    }, [customerSearch, mode]);

    useEffect(() => {
        if (mode !== "form") return;
        let mounted = true;
        getInventoryProducts()
            .then((products) => {
                if (mounted) setInventoryProducts(products.filter((product) => product.is_active));
            })
            .catch((loadError) => {
                console.error("Error cargando productos para cotizar:", loadError);
                if (mounted) setInventoryError(responseMessage(loadError, "No se pudieron cargar los productos del inventario."));
            });
        return () => { mounted = false; };
    }, [mode]);

    const updateForm = <K extends keyof QuotationForm>(
        field: K,
        value: QuotationForm[K]
    ) => setForm((current) => ({ ...current, [field]: value }));

    const beginCreate = () => {
        setEditingId(null);
        setQuotation(null);
        setPortalCredentials(null);
        setCredentialsCopied(false);
        setForm(emptyQuotation());
        setCustomerSearch("");
        setError("");
        setMode("form");
    };

    const beginEdit = (item: Quotation) => {
        setEditingId(item.id);
        setQuotation(item);
        setPortalCredentials(null);
        setCredentialsCopied(false);
        setCustomers((current) => current.some((customer) => customer.id === item.customer_id)
            ? current
            : [
                {
                    id: item.customer_id,
                    name: item.customer_name,
                    customer_type: "person",
                    identification: item.customer_identification,
                    email: item.customer_email ?? undefined,
                    address: item.customer_address ?? undefined,
                    active: true,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                },
                ...current,
            ]);
        setForm({
            customer_id: item.customer_id,
            title: item.title,
            issue_date: item.issue_date.slice(0, 10),
            valid_until: item.valid_until.slice(0, 10),
            status: item.status,
            scope: item.scope ?? "",
            notes: item.notes ?? "",
            terms: item.terms ?? "",
            discount_percent: numberInputValue(item.discount_percent),
            tax_percent: numberInputValue(item.tax_percent),
            internal_labor_enabled: item.internal_labor_enabled ?? false,
            internal_worker_count: numberInputValue(item.internal_worker_count ?? 0),
            internal_work_days: numberInputValue(item.internal_work_days ?? 0),
            internal_daily_rate: numberInputValue(item.internal_daily_rate ?? 0),
            items: item.items.map(({ product_id, category, description, unit, quantity, unit_price }) => ({
                product_id: product_id ?? null,
                category,
                description,
                unit,
                quantity: numberInputValue(quantity),
                unit_price: numberInputValue(unit_price),
            })),
        });
        setCustomerSearch(item.customer_name);
        setError("");
        setMode("form");
    };

    const openQuotation = async (id: number) => {
        try {
            setSaving(true);
            setError("");
            setNotice("");
            const result = await getQuotation(id);
            setQuotation(result);
            setNextStatus(result.status);
            setMode("detail");
        } catch (loadError) {
            console.error("Error cargando cotización:", loadError);
            setError(responseMessage(loadError, "No se pudo abrir la cotización."));
        } finally {
            setSaving(false);
        }
    };

    const openCloneDialog = async () => {
        if (!quotation) return;
        try {
            setError("");
            const result = await getCustomers(undefined, undefined, 100, true);
            setCloneCustomers(result.data ?? []);
            setCloneCustomerId("");
            setCloneOpen(true);
        } catch (loadError) {
            setError(responseMessage(loadError, "No se pudieron cargar los clientes para clonar."));
        }
    };

    const handleClone = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!quotation || !cloneCustomerId) return;
        try {
            setCloneSaving(true);
            setError("");
            const copy = await cloneQuotation(quotation.id, Number(cloneCustomerId));
            setQuotation(copy);
            setNextStatus(copy.status);
            setPortalCredentials(null);
            setCloneOpen(false);
            setMode("detail");
            setPage(1);
        } catch (cloneError) {
            setError(responseMessage(cloneError, "No se pudo clonar la cotización."));
        } finally {
            setCloneSaving(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!form.customer_id) {
            setError("Selecciona un cliente para la cotización.");
            return;
        }
        if (form.items.some((item) =>
            !item.description.trim()
            || !item.unit.trim()
            || !isValidUserNumber(item.quantity)
            || parseUserNumber(item.quantity) <= 0
            || !isValidUserNumber(item.unit_price)
            || parseUserNumber(item.unit_price) < 0
        )) {
            setError("Completa cada partida con una cantidad mayor a cero y un precio válido.");
            return;
        }
        if (
            !isValidUserNumber(form.discount_percent)
            || parseUserNumber(form.discount_percent) < 0
            || parseUserNumber(form.discount_percent) > 100
            || !isValidUserNumber(form.tax_percent)
            || parseUserNumber(form.tax_percent) < 0
            || parseUserNumber(form.tax_percent) > 100
        ) {
            setError("El descuento y el IVA deben estar entre 0 y 100.");
            return;
        }
        if (
            form.internal_labor_enabled
            && (
                !isValidUserNumber(form.internal_worker_count)
                || parseUserNumber(form.internal_worker_count) < 1
                || !isValidUserNumber(form.internal_work_days)
                || parseUserNumber(form.internal_work_days) <= 0
                || !isValidUserNumber(form.internal_daily_rate)
                || parseUserNumber(form.internal_daily_rate) <= 0
            )
        ) {
            setError("Indica al menos un trabajador, días de trabajo y una tarifa diaria mayor que cero.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            const isNewQuotation = editingId === null;
            const payload = toPayload(form);
            const saved = editingId
                ? await updateQuotation(editingId, payload)
                : await createQuotation(payload);
            setQuotation(saved.data);
            setPortalCredentials(saved.portal_credentials);
            setCredentialsCopied(false);
            setMode("detail");
            if (isNewQuotation) {
                try {
                    setPdfDownloading(true);
                    const { downloadQuotationPdf } =
                        await import("../../../services/quotationPdf");
                    await downloadQuotationPdf(saved.data);
                } catch (downloadError) {
                    console.error("Cotización creada, pero falló la descarga del PDF:", downloadError);
                    setError(
                        `La cotización se creó correctamente, pero no se pudo descargar el PDF. ${responseMessage(downloadError, "Intenta descargarlo desde el botón del detalle.")}`
                    );
                } finally {
                    setPdfDownloading(false);
                }
            }
        } catch (saveError) {
            console.error("Error guardando cotización:", saveError);
            setError(responseMessage(saveError, "No se pudo guardar la cotización."));
        } finally {
            setSaving(false);
        }
    };

    const changeStatus = async () => {
        if (!quotation) return;
        try {
            setStatusSaving(true);
            setError("");
            setNotice("");
            const payload: QuotationPayload = {
                customer_id: quotation.customer_id,
                title: quotation.title,
                issue_date: quotation.issue_date.slice(0, 10),
                valid_until: quotation.valid_until.slice(0, 10),
                status: nextStatus,
                scope: quotation.scope ?? "",
                notes: quotation.notes ?? "",
                terms: quotation.terms ?? "",
                discount_percent: Number(quotation.discount_percent),
                tax_percent: Number(quotation.tax_percent),
                internal_labor_enabled: quotation.internal_labor_enabled ?? false,
                internal_worker_count: quotation.internal_worker_count ?? 0,
                internal_work_days: Number(quotation.internal_work_days ?? 0),
                internal_daily_rate: Number(quotation.internal_daily_rate ?? 0),
                items: quotation.items.map(({ product_id, category, description, unit, quantity, unit_price }) => ({
                    product_id: product_id ?? null,
                    category,
                    description,
                    unit,
                    quantity: Number(quantity),
                    unit_price: Number(unit_price),
                })),
            };
            if (nextStatus === "sent") {
                if (!quotation.customer_email) {
                    setError("El cliente no tiene correo registrado. Actualiza sus datos antes de enviar la cotización.");
                    return;
                }
                const { generateQuotationPdfBlob } = await import("../../../services/quotationPdf");
                const pdf = await generateQuotationPdfBlob(quotation);
                setQuotation(await sendQuotationByEmail(quotation.id, pdf));
                setNotice(`Cotización enviada a ${quotation.customer_email}.`);
                return;
            }
            const updated = await updateQuotation(quotation.id, payload);
            setQuotation(updated.data);
            if (updated.portal_credentials) {
                setPortalCredentials(updated.portal_credentials);
                setCredentialsCopied(false);
            }
        } catch (saveError) {
            console.error("Error actualizando estado de cotización:", saveError);
            setError(responseMessage(saveError, "No se pudo actualizar el estado."));
        } finally {
            setStatusSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!quotation) return;
        if (!window.confirm(`¿Eliminar la cotización ${quotation.number}?`)) return;
        try {
            setSaving(true);
            await deleteQuotation(quotation.id);
            setMode("list");
        } catch (deleteError) {
            console.error("Error eliminando cotización:", deleteError);
            setError(responseMessage(deleteError, "No se pudo eliminar la cotización."));
        } finally {
            setSaving(false);
        }
    };

    const copyPortalCredentials = async () => {
        if (!portalCredentials) return;
        try {
            await navigator.clipboard.writeText(
                `Usuario: ${portalCredentials.email}\nContraseña temporal: ${portalCredentials.password}`
            );
            setCredentialsCopied(true);
        } catch (copyError) {
            console.error("No se pudieron copiar las credenciales:", copyError);
            setError("No se pudieron copiar las credenciales. Selecciónalas y cópialas manualmente.");
        }
    };

    const handleDownloadPdf = async () => {
        if (!quotation) return;
        try {
            setPdfDownloading(true);
            setError("");
            const { downloadQuotationPdf } =
                await import("../../../services/quotationPdf");
            await downloadQuotationPdf(quotation);
        } catch (downloadError) {
            console.error("Error generando PDF de cotización:", downloadError);
            setError(
                responseMessage(downloadError, "No se pudo generar el PDF de la cotización.")
            );
        } finally {
            setPdfDownloading(false);
        }
    };

    const addItem = () => updateForm("items", [...form.items, emptyItem()]);
    const updateItem = (
        index: number,
        field: keyof QuotationForm["items"][number],
        value: string
    ) => updateForm(
        "items",
        form.items.map((item, itemIndex) =>
            itemIndex === index ? { ...item, [field]: value } : item
        )
    );
    const selectInventoryProduct = (index: number, productId: string) => {
        const product = inventoryProducts.find((item) => item.id === Number(productId));
        updateForm(
            "items",
            form.items.map((item, itemIndex) => itemIndex === index
                ? product
                    ? {
                        ...item,
                        product_id: product.id,
                        description: product.description?.trim()
                            ? `${product.name} — ${product.description}`
                            : product.name,
                        unit: product.unit,
                        unit_price: numberInputValue(product.unit_price),
                    }
                    : { ...item, product_id: null }
                : item)
        );
    };
    const approveImportedItems = (items: ImportedQuotationItem[]) => {
        const replaceBlankDefault = form.items.length === 1
            && !form.items[0].description.trim()
            && form.items[0].unit === "m"
            && form.items[0].quantity === "1"
            && form.items[0].unit_price === "0";
        updateForm(
            "items",
            [
                ...(replaceBlankDefault ? [] : form.items),
                ...items.map((item) => ({ ...item, product_id: null })),
            ]
        );
    };
    const changeItemCategory = (
        index: number,
        category: QuotationItemCategory
    ) => updateForm(
        "items",
        form.items.map((item, itemIndex) => itemIndex === index
            ? {
                ...item,
                category,
                unit: category === "labor"
                    ? "hora"
                    : category === "service"
                        ? "servicio"
                        : category === "material"
                            ? "m"
                            : "unidad",
            }
            : item)
    );
    const removeItem = (index: number) => updateForm(
        "items",
        form.items.filter((_, itemIndex) => itemIndex !== index)
    );

    const title = mode === "form"
        ? editingId ? "Editar cotización" : "Nueva cotización"
        : mode === "detail" ? quotation?.number ?? "Cotización" : "Cotizaciones";

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {mode === "list"
                            ? "Prepara, envía y administra propuestas de trabajos eléctricos."
                            : mode === "form"
                                ? "Completa los datos del cliente, el alcance y las partidas del servicio."
                                : quotation?.title}
                    </p>
                </div>
                {mode === "list" ? (
                    <button onClick={beginCreate} className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                        + Nueva cotización
                    </button>
                ) : (
                    <button onClick={() => { setError(""); setMode("list"); }} className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        ← Volver a cotizaciones
                    </button>
                )}
            </div>

            {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}
            {notice && (
                <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {notice}
                </div>
            )}

            {mode === "list" && (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
                        <input
                            value={search}
                            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                            placeholder="Buscar por número, cliente o identificación..."
                            aria-label="Buscar cotizaciones"
                            className="rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                        />
                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setStatusFilter(event.target.value as QuotationStatus | "");
                                setPage(1);
                            }}
                            aria-label="Filtrar por estado"
                            className="rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                        >
                            <option value="">Todos los estados</option>
                            {statuses.filter((item) => item.value !== "sent" || form.status === "sent").map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                        <span className="self-center text-sm text-slate-500">
                            {totalCount} {totalCount === 1 ? "cotización" : "cotizaciones"}
                        </span>
                    </div>

                    {loading ? (
                        <div className="py-12 text-center text-slate-500">Cargando cotizaciones…</div>
                    ) : quotations.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
                            <div className="text-4xl">🧾</div>
                            <h2 className="mt-3 font-semibold text-slate-800">Aún no hay cotizaciones</h2>
                            <p className="mt-1 text-sm text-slate-500">Crea tu primera propuesta de servicios eléctricos.</p>
                            <button onClick={beginCreate} className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400">
                                Crear cotización
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-500">
                                        <th className="px-3 py-3 font-semibold">Cotización</th>
                                        <th className="px-3 py-3 font-semibold">Cliente</th>
                                        <th className="px-3 py-3 font-semibold">Fecha</th>
                                        <th className="px-3 py-3 font-semibold">Vigencia</th>
                                        <th className="px-3 py-3 font-semibold">Estado</th>
                                        <th className="px-3 py-3 text-right font-semibold">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quotations.map((item) => (
                                        <tr
                                            key={item.id}
                                            onClick={() => void openQuotation(item.id)}
                                            className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                                        >
                                            <td className="px-3 py-4">
                                                <div className="font-semibold text-slate-900">{item.number}</div>
                                                <div className="mt-1 max-w-56 truncate text-xs text-slate-500">{item.title}</div>
                                            </td>
                                            <td className="px-3 py-4">
                                                <div className="font-medium text-slate-800">{item.customer_name}</div>
                                                <div className="text-xs text-slate-500">{item.customer_identification}</div>
                                            </td>
                                            <td className="px-3 py-4 text-slate-600">{formatDate(item.issue_date)}</td>
                                            <td className="px-3 py-4 text-slate-600">{formatDate(item.valid_until)}</td>
                                            <td className="px-3 py-4"><QuotationStatusBadge status={item.status} /></td>
                                            <td className="px-3 py-4 text-right font-semibold text-slate-900">{money(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {lastPage > 1 && (
                        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
                            <span className="text-slate-500">Página {page} de {lastPage}</span>
                            <div className="flex gap-2">
                                <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">Anterior</button>
                                <button disabled={page >= lastPage} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-300 px-3 py-2 disabled:opacity-40">Siguiente</button>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {mode === "form" && (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-4 font-semibold text-slate-900">Cliente y datos de la propuesta</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="relative md:col-span-2">
                                <label htmlFor="quotation-customer" className="mb-2 block text-sm font-semibold text-slate-700">Cliente *</label>
                                <input
                                    id="quotation-customer"
                                    required={!form.customer_id}
                                    value={selectedCustomer ? `${selectedCustomer.name} · ${selectedCustomer.identification}` : customerSearch}
                                    onChange={(event) => {
                                        setCustomerSearch(event.target.value);
                                        if (form.customer_id) updateForm("customer_id", 0);
                                        setShowCustomerOptions(true);
                                    }}
                                    onFocus={() => setShowCustomerOptions(true)}
                                    placeholder="Buscar por nombre o identificación…"
                                    autoComplete="off"
                                    className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                                />
                                {showCustomerOptions && !form.customer_id && (
                                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                        {customerLoading ? (
                                            <p className="p-4 text-sm text-slate-500">Buscando clientes…</p>
                                        ) : customers.length ? customers.map((customer) => (
                                            <button
                                                key={customer.id}
                                                type="button"
                                                onClick={() => {
                                                    updateForm("customer_id", customer.id);
                                                    setCustomerSearch(customer.name);
                                                    setShowCustomerOptions(false);
                                                }}
                                                className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-amber-50"
                                            >
                                                <span className="block text-sm font-semibold text-slate-800">{customer.name}</span>
                                                <span className="text-xs text-slate-500">{customer.identification}{customer.customer_type === "company" ? " · Empresa" : " · Persona"}</span>
                                            </button>
                                        )) : (
                                            <p className="p-4 text-sm text-slate-500">No se encontraron clientes activos.</p>
                                        )}
                                    </div>
                                )}
                                {customerError && <p className="mt-2 text-sm text-red-600">{customerError}</p>}
                                {form.customer_id > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            updateForm("customer_id", 0);
                                            setCustomerSearch("");
                                            setShowCustomerOptions(true);
                                        }}
                                        className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900"
                                    >
                                        Cambiar cliente
                                    </button>
                                )}
                            </div>
                            <label className="text-sm font-semibold text-slate-700">
                                Título de la cotización *
                                <input required maxLength={180} value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="Ej. Instalación eléctrica residencial" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-amber-500" />
                            </label>
                            <label className="text-sm font-semibold text-slate-700">
                                Estado
                                <select value={form.status} onChange={(event) => updateForm("status", event.target.value as QuotationStatus)} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-amber-500">
                                    {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                </select>
                            </label>
                            <label className="text-sm font-semibold text-slate-700">
                                Fecha de emisión *
                                <input required type="date" value={form.issue_date} onChange={(event) => updateForm("issue_date", event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-amber-500" />
                            </label>
                            <label className="text-sm font-semibold text-slate-700">
                                Válida hasta *
                                <input required type="date" min={form.issue_date} value={form.valid_until} onChange={(event) => updateForm("valid_until", event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-amber-500" />
                            </label>
                            <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                                Alcance del trabajo
                                <textarea rows={3} maxLength={10000} value={form.scope} onChange={(event) => updateForm("scope", event.target.value)} placeholder="Describe el trabajo, las instalaciones o resultados incluidos en esta propuesta." className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-amber-500" />
                            </label>
                        </div>
                    </section>

                    <QuotationImport onApprove={approveImportedItems} />

                    {inventoryError && (
                        <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                            {inventoryError} Puedes continuar agregando partidas manualmente.
                        </p>
                    )}

                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="font-semibold text-slate-900">Partidas de la cotización</h2>
                                <p className="mt-1 text-sm text-slate-500">Agrega materiales, mano de obra, equipos y servicios.</p>
                            </div>
                            <button type="button" onClick={addItem} className="rounded-lg border border-amber-500 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50">+ Agregar partida</button>
                        </div>
                        <div className="space-y-4">
                            {form.items.map((item, index) => (
                                <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-12">
                                    <label className="text-xs font-semibold text-slate-600 md:col-span-12">
                                        Producto de inventario (opcional)
                                        <select value={item.product_id ?? ""} onChange={(event) => selectInventoryProduct(index, event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-800">
                                            <option value="">Partida manual</option>
                                            {inventoryProducts.map((product) => (
                                                <option key={product.id} value={product.id}>
                                                    {product.sku ? `${product.sku} · ` : ""}{product.name} — {money(product.unit_price)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                                        Categoría
                                        <select value={item.category} onChange={(event) => changeItemCategory(index, event.target.value as QuotationItemCategory)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-800">
                                            {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                                        </select>
                                    </label>
                                    <label className="text-xs font-semibold text-slate-600 md:col-span-3">
                                        Descripción *
                                        <input required maxLength={255} value={item.description} onChange={(event) => updateItem(index, "description", event.target.value)} placeholder="Cable, instalación de luminarias…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                    <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                                        Unidad *
                                        <select required value={units.some((unit) => unit.value === item.unit) ? item.unit : "__custom__"} onChange={(event) => updateItem(index, "unit", event.target.value === "__custom__" ? "" : event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-800">
                                            {units.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                                            <option value="__custom__">Otra unidad…</option>
                                        </select>
                                        {!units.some((unit) => unit.value === item.unit) && (
                                            <input required maxLength={30} value={item.unit} onChange={(event) => updateItem(index, "unit", event.target.value)} placeholder="Especifica la unidad" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                        )}
                                    </label>
                                    <label className="text-xs font-semibold text-slate-600 md:col-span-1">
                                        Cantidad
                                        <input required type="text" inputMode="decimal" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} placeholder="Ej. 20" aria-label={`Cantidad de partida ${index + 1}`} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                    <label className="text-xs font-semibold text-slate-600 md:col-span-2">
                                        Precio unitario
                                        <input required type="text" inputMode="decimal" value={item.unit_price} onChange={(event) => updateItem(index, "unit_price", event.target.value)} placeholder="Ej. 20" aria-label={`Precio unitario de partida ${index + 1}`} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal text-slate-800" />
                                    </label>
                                    <div className="flex items-end justify-between md:col-span-2">
                                        <div className="pb-2">
                                            <span className="block text-xs text-slate-500">Importe</span>
                                            <span className="font-semibold text-slate-900">{money(parseUserNumber(item.quantity) * parseUserNumber(item.unit_price))}</span>
                                        </div>
                                        <button type="button" disabled={form.items.length === 1} onClick={() => removeItem(index)} aria-label={`Eliminar partida ${index + 1}`} className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-30">Eliminar</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="font-semibold text-slate-900">Costos internos de mano de obra</h2>
                                <p className="mt-1 text-sm text-slate-600">Uso interno. Se incluyen en el precio final, pero no se detallan en la cotización ni en el PDF.</p>
                            </div>
                            <label className="flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm font-semibold text-violet-900">
                                <input
                                    type="checkbox"
                                    checked={form.internal_labor_enabled}
                                    onChange={(event) => updateForm("internal_labor_enabled", event.target.checked)}
                                    className="h-4 w-4 accent-violet-700"
                                />
                                Calcular mano de obra interna
                            </label>
                        </div>
                        {form.internal_labor_enabled && (
                            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                <label className="text-sm font-semibold text-slate-700">
                                    Número de trabajadores *
                                    <input
                                        required
                                        min="1"
                                        max="1000"
                                        step="1"
                                        type="number"
                                        value={form.internal_worker_count}
                                        onChange={(event) => updateForm("internal_worker_count", event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                    />
                                </label>
                                <label className="text-sm font-semibold text-slate-700">
                                    Jornadas por trabajador *
                                    <input
                                        required
                                        min="0.01"
                                        max="10000"
                                        step="any"
                                        type="number"
                                        value={form.internal_work_days}
                                        onChange={(event) => updateForm("internal_work_days", event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                    />
                                </label>
                                <label className="text-sm font-semibold text-slate-700">
                                    Pago diario por trabajador (USD) *
                                    <input
                                        required
                                        min="0.01"
                                        max="100000000"
                                        step="any"
                                        type="number"
                                        value={form.internal_daily_rate}
                                        onChange={(event) => updateForm("internal_daily_rate", event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
                                    />
                                </label>
                                <div className="rounded-lg border border-violet-200 bg-white p-3 text-sm sm:col-span-3">
                                    <span className="text-slate-600">Costo interno calculado: </span>
                                    <strong className="text-violet-900">{money(internalLaborTotal)}</strong>
                                    <span className="ml-2 text-xs text-slate-500">({form.internal_worker_count || 0} trabajadores × {form.internal_work_days || 0} jornadas × {money(parseUserNumber(form.internal_daily_rate))} por jornada)</span>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
                        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <label className="block text-sm font-semibold text-slate-700">
                                Términos y condiciones
                                <textarea rows={3} maxLength={5000} value={form.terms} onChange={(event) => updateForm("terms", event.target.value)} placeholder="Condiciones de pago, garantía, exclusiones…" className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-amber-500" />
                            </label>
                            <label className="block text-sm font-semibold text-slate-700">
                                Observaciones
                                <textarea rows={2} maxLength={5000} value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Notas adicionales para el cliente." className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal outline-none focus:border-amber-500" />
                            </label>
                        </div>
                        <div className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="mb-4 font-semibold text-slate-900">Resumen económico (USD)</h2>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                                {form.internal_labor_enabled && (
                                    <div className="flex justify-between text-violet-800"><span>Incluye costo interno de mano de obra</span><span>{money(internalLaborTotal)}</span></div>
                                )}
                                <label className="flex items-center justify-between gap-3 text-slate-600">
                                    <span>Descuento (%)</span>
                                    <input type="text" inputMode="decimal" value={form.discount_percent} onChange={(event) => updateForm("discount_percent", event.target.value)} className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-slate-900" />
                                </label>
                                <div className="flex justify-between text-slate-600"><span>Descuento</span><span>-{money(discountAmount)}</span></div>
                                <label className="flex items-center justify-between gap-3 text-slate-600">
                                    <span>IVA (%)</span>
                                    <input type="text" inputMode="decimal" value={form.tax_percent} onChange={(event) => updateForm("tax_percent", event.target.value)} className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-slate-900" />
                                </label>
                                <div className="flex justify-between text-slate-600"><span>Impuesto</span><span>{money(taxAmount)}</span></div>
                                <div className="flex justify-between border-t border-slate-200 pt-4 text-base font-bold text-slate-900"><span>Total</span><span>{money(total)}</span></div>
                                <p className="text-xs text-slate-500">El cálculo oficial se confirma y guarda en el servidor.</p>
                            </div>
                        </div>
                    </section>

                    <div className="flex flex-wrap gap-3">
                        <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                            {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear cotización"}
                        </button>
                        <button type="button" onClick={() => { setError(""); setMode(editingId && quotation ? "detail" : "list"); }} className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            {mode === "detail" && quotation && (
                <div className="space-y-5">
                    {portalCredentials && quotation.status === "accepted" && (
                        <section className="rounded-xl border border-green-300 bg-green-50 p-5 shadow-sm">
                            <h2 className="font-semibold text-green-900">Proyecto creado y acceso del cliente listo</h2>
                            <p className="mt-1 text-sm text-green-800">
                                Comparte estas credenciales con el cliente. La contraseña temporal es su número de identificación y deberá cambiarla al ingresar.
                            </p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <label className="text-xs font-semibold text-green-900">Usuario
                                    <input readOnly value={portalCredentials.email} className="mt-1 w-full rounded-lg border border-green-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800" />
                                </label>
                                <label className="text-xs font-semibold text-green-900">Contraseña temporal
                                    <input readOnly value={portalCredentials.password} className="mt-1 w-full rounded-lg border border-green-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-800" />
                                </label>
                            </div>
                            <button onClick={() => void copyPortalCredentials()} className="mt-3 rounded-lg bg-green-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-900">
                                {credentialsCopied ? "Credenciales copiadas" : "Copiar usuario y contraseña"}
                            </button>
                            <p className="mt-2 text-xs text-green-800">Guarda o envía estas credenciales ahora: la contraseña solo se muestra en este momento y no se almacena en texto legible.</p>
                        </section>
                    )}
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                            <div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-xl font-bold text-slate-900">{quotation.number}</h2>
                                    <QuotationStatusBadge status={quotation.status} />
                                </div>
                                <p className="mt-1 text-slate-700">{quotation.title}</p>
                                <p className="mt-2 text-sm text-slate-500">Emitida {formatDate(quotation.issue_date)} · Válida hasta {formatDate(quotation.valid_until)}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => void handleDownloadPdf()} disabled={pdfDownloading} className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50">
                                    {pdfDownloading ? "Generando PDF…" : "Descargar PDF"}
                                </button>
                                <button onClick={() => void openCloneDialog()} className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-900 hover:bg-blue-100">Clonar a otro cliente</button>
                                <button onClick={() => beginEdit(quotation)} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Editar</button>
                                {["draft", "rejected", "cancelled"].includes(quotation.status) && (
                                    <button onClick={() => void handleDelete()} disabled={saving} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Eliminar</button>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
                        <div className="space-y-5">
                            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="font-semibold text-slate-900">Cliente</h2>
                                <p className="mt-3 font-medium text-slate-800">{quotation.customer_name}</p>
                                <p className="text-sm text-slate-500">Identificación: {quotation.customer_identification}</p>
                                {quotation.customer_email && <p className="text-sm text-slate-500">{quotation.customer_email}</p>}
                                {quotation.customer_address && <p className="text-sm text-slate-500">{quotation.customer_address}</p>}
                            </div>
                            {quotation.scope && (
                                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <h2 className="font-semibold text-slate-900">Alcance del trabajo</h2>
                                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{quotation.scope}</p>
                                </div>
                            )}
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="mb-4 font-semibold text-slate-900">Partidas</h2>
                                <table className="w-full min-w-[600px] text-left text-sm">
                                    <thead><tr className="border-b border-slate-200 text-slate-500">
                                        <th className="py-3 pr-3">Descripción</th><th className="py-3 pr-3">Unidad</th>
                                        <th className="py-3 pr-3 text-right">Cantidad</th><th className="py-3 pr-3 text-right">Precio</th>
                                        <th className="py-3 text-right">Importe</th>
                                    </tr></thead>
                                    <tbody>{quotation.items.map((item) => (
                                        <tr key={item.id} className="border-b border-slate-100">
                                            <td className="py-3 pr-3"><span className="block font-medium text-slate-800">{item.description}</span><span className="text-xs text-slate-500">{categories.find((category) => category.value === item.category)?.label}</span></td>
                                            <td className="py-3 pr-3 text-slate-600">{item.unit}</td>
                                            <td className="py-3 pr-3 text-right text-slate-600">{Number(item.quantity).toLocaleString("es-EC", { maximumFractionDigits: 3 })}</td>
                                            <td className="py-3 pr-3 text-right text-slate-600">{money(item.unit_price)}</td>
                                            <td className="py-3 text-right font-medium text-slate-800">{money(item.line_total)}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="mb-4 font-semibold text-slate-900">Resumen económico</h2>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(quotation.subtotal)}</span></div>
                                    <div className="flex justify-between text-slate-600"><span>Descuento ({Number(quotation.discount_percent)}%)</span><span>-{money(quotation.discount_amount)}</span></div>
                                    <div className="flex justify-between text-slate-600"><span>IVA ({Number(quotation.tax_percent)}%)</span><span>{money(quotation.tax_amount)}</span></div>
                                    <div className="flex justify-between border-t border-slate-200 pt-4 text-lg font-bold text-slate-900"><span>Total</span><span>{money(quotation.total)}</span></div>
                                </div>
                            </div>
                            {(quotation.terms || quotation.notes) && (
                                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    {quotation.terms && <><h2 className="font-semibold text-slate-900">Términos y condiciones</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{quotation.terms}</p></>}
                                    {quotation.notes && <><h2 className="mt-5 font-semibold text-slate-900">Observaciones</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{quotation.notes}</p></>}
                                </div>
                            )}
                            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="font-semibold text-slate-900">Actualizar estado</h2>
                                <div className="mt-3 flex gap-2">
                                    <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as QuotationStatus)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                                        {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                    </select>
                                    <button onClick={() => void changeStatus()} disabled={statusSaving || nextStatus === quotation.status || (nextStatus === "sent" && !quotation.customer_email)} className="rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">{statusSaving ? "Enviando…" : nextStatus === "sent" ? "Enviar por correo" : "Guardar"}</button>
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                    {nextStatus === "sent"
                                        ? quotation.customer_email
                                            ? `Se enviará el PDF adjunto a ${quotation.customer_email}.`
                                            : "Registra un correo en los datos del cliente para habilitar el envío."
                                        : "Registra el avance comercial de la propuesta."}
                                </p>
                                {quotation.sent_at && <p className="mt-2 text-xs text-emerald-700">Enviada el {new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" }).format(new Date(quotation.sent_at))}</p>}
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {cloneOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <form onSubmit={(event) => void handleClone(event)} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Clonar cotización</h2>
                            <p className="mt-1 text-sm text-slate-600">Crea una nueva cotización con las mismas partidas y datos comerciales para otro cliente.</p>
                        </div>
                        <label className="block text-sm font-semibold text-slate-700">Cliente destino *
                            <select required value={cloneCustomerId} onChange={(event) => setCloneCustomerId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 font-normal">
                                <option value="">Selecciona un cliente…</option>
                                {cloneCustomers.filter((customer) => customer.id !== quotation?.customer_id).map((customer) => (
                                    <option key={customer.id} value={customer.id}>{customer.name} · {customer.identification}{customer.id === quotation?.customer_id ? " (cliente actual)" : ""}</option>
                                ))}
                            </select>
                            {cloneCustomers.every((customer) => customer.id === quotation?.customer_id) && (
                                <span className="mt-2 block text-xs font-normal text-amber-800">No hay otros clientes activos disponibles para clonar.</span>
                            )}
                        </label>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => setCloneOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700">Cancelar</button>
                            <button disabled={cloneSaving || !cloneCustomerId} className="rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{cloneSaving ? "Clonando…" : "Crear copia"}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default QuotationPage;
