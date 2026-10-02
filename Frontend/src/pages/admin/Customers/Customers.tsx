import { useEffect, useState } from "react";

import {
    createCustomer,
    deleteCustomer,
    getCustomers,
    updateCustomer,
    type Customer,
    type CustomerType,
} from "../../../services/customerService";

const emptyForm = {
    name: "",
    customer_type: "person" as CustomerType,
    identification: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    contact_person: "",
    contact_phone: "",
    notes: "",
    active: true,
};

function Customers() {

    const [customers, setCustomers] = useState<Customer[]>([]);

    const [search, setSearch] = useState("");

    const [customerTypeFilter, setCustomerTypeFilter] =
        useState<CustomerType | "">("");

    const [loading, setLoading] = useState(true);

    const [saving, setSaving] = useState(false);

    const [showForm, setShowForm] = useState(false);

    const [editingId, setEditingId] =
        useState<number | null>(null);

    const [error, setError] = useState("");

    const [form, setForm] =
        useState(emptyForm);


    // ==========================================
    // CARGAR CLIENTES
    // ==========================================

    const loadCustomers = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await getCustomers(search, customerTypeFilter || undefined);

            setCustomers(
                response.data ?? []
            );

        } catch (error: any) {

            console.error(
                "Error cargando clientes:",
                error
            );

            setError(
                error?.response?.data?.message ||
                "No se pudieron cargar los clientes."
            );

        } finally {

            setLoading(false);

        }
    };


    // ==========================================
    // CARGA INICIAL
    // ==========================================

    useEffect(() => {

        let mounted = true;

        const load = async () => {

            try {

                setLoading(true);

                const response =
                    await getCustomers();

                if (mounted) {

                    setCustomers(
                        response.data ?? []
                    );

                }

            } catch (error: any) {

                if (
                    error?.code === "ERR_CANCELED" ||
                    error?.message === "canceled" ||
                    error?.message === "Request aborted"
                ) {
                    return;
                }

                console.error(
                    "Error cargando clientes:",
                    error
                );

                if (mounted) {

                    setError(
                        "No se pudieron cargar los clientes."
                    );

                }

            } finally {

                if (mounted) {
                    setLoading(false);
                }

            }

        };

        load();

        return () => {
            mounted = false;
        };

    }, []);


    // ==========================================
    // FORMULARIO
    // ==========================================

    const handleChange = (
        field: keyof typeof emptyForm,
        value: string | boolean
    ) => {

        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));

    };


    // ==========================================
    // NUEVO CLIENTE
    // ==========================================

    const handleNew = () => {

        setEditingId(null);

        setForm(emptyForm);

        setError("");

        setShowForm(true);

    };


    // ==========================================
    // EDITAR CLIENTE
    // ==========================================

    const handleEdit = (
        customer: Customer
    ) => {

        setEditingId(customer.id);

        setForm({
            name: customer.name,
            customer_type: customer.customer_type,
            identification:
                customer.identification,
            email: customer.email || "",
            phone: customer.phone || "",
            address: customer.address || "",
            city: customer.city || "",
            contact_person:
                customer.contact_person || "",
            contact_phone:
                customer.contact_phone || "",
            notes: customer.notes || "",
            active: customer.active,
        });

        setError("");

        setShowForm(true);

    };


    // ==========================================
    // GUARDAR / ACTUALIZAR
    // ==========================================

    const handleSubmit = async (
        event: React.FormEvent
    ) => {

        event.preventDefault();

        try {

            setSaving(true);
            setError("");

            if (editingId) {

                await updateCustomer(
                    editingId,
                    form
                );

            } else {

                await createCustomer(form);

            }

            setForm(emptyForm);

            setEditingId(null);

            setShowForm(false);

            await loadCustomers();

        } catch (error: any) {

            console.error(
                "Error guardando cliente:",
                error
            );

            setError(
                error?.response?.data?.message ||
                "No se pudo guardar el cliente."
            );

        } finally {

            setSaving(false);

        }
    };


    // ==========================================
    // ELIMINAR
    // ==========================================

    const handleDelete = async (
        id: number
    ) => {

        const confirmed =
            window.confirm(
                "¿Deseas eliminar este cliente?"
            );

        if (!confirmed) {
            return;
        }

        try {

            await deleteCustomer(id);

            await loadCustomers();

        } catch (error: any) {

            console.error(
                "Error eliminando cliente:",
                error
            );

            setError(
                error?.response?.data?.message ||
                "No se pudo eliminar el cliente."
            );

        }
    };


    return (
        <div className="space-y-6">

            {/* =====================================
                HEADER
            ===================================== */}

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div>

                    <h1 className="text-2xl font-bold text-slate-900">
                        Clientes
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Administración de clientes de Lumelex
                    </p>

                </div>

                <button
                    onClick={handleNew}
                    className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                    + Nuevo cliente
                </button>

            </div>


            {/* =====================================
                ERROR
            ===================================== */}

            {error && (

                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                    {error}

                </div>

            )}


            {/* =====================================
                FORMULARIO
            ===================================== */}

            {showForm && (

                <form
                    onSubmit={handleSubmit}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >

                    <div className="mb-6">

                        <h2 className="text-lg font-bold text-slate-900">

                            {editingId
                                ? "Editar cliente"
                                : "Nuevo cliente"}

                        </h2>

                        <p className="text-sm text-slate-500">

                            {editingId
                                ? "Modifica la información del cliente."
                                : "Registra un nuevo cliente."}

                        </p>

                    </div>


                    <div className="grid gap-5 md:grid-cols-2">

                        {/* TIPO DE CLIENTE */}

                        <fieldset className="md:col-span-2">

                            <legend className="mb-2 block text-sm font-semibold text-slate-700">
                                Tipo de cliente
                            </legend>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {([
                                    ["person", "Persona"],
                                    ["company", "Empresa"],
                                ] as const).map(([value, label]) => {
                                    const selected = form.customer_type === value;

                                    return (
                                        <label
                                            key={value}
                                            className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition ${
                                                selected
                                                    ? "border-amber-500 bg-amber-50 text-slate-900 ring-1 ring-amber-500"
                                                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                                            }`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    name="customer_type"
                                                    required
                                                    value={value}
                                                    checked={selected}
                                                    onChange={() =>
                                                        handleChange(
                                                            "customer_type",
                                                            value
                                                        )
                                                    }
                                                    className="accent-amber-600"
                                                />
                                                <span className="text-sm font-semibold">
                                                    {label}
                                                </span>
                                            </span>

                                            <span
                                                aria-hidden="true"
                                                className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${
                                                    selected
                                                        ? "bg-amber-500 text-white"
                                                        : "border border-slate-300 text-transparent"
                                                }`}
                                            >
                                                ✓
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                        </fieldset>


                        {/* NOMBRE */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Nombre / Empresa
                            </label>

                            <input
                                required
                                value={form.name}
                                onChange={(e) =>
                                    handleChange(
                                        "name",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                            />

                        </div>


                        {/* IDENTIFICACIÓN */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Cédula / RUC
                            </label>

                            <input
                                required
                                value={form.identification}
                                onChange={(e) =>
                                    handleChange(
                                        "identification",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                            />

                        </div>


                        {/* EMAIL */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Correo
                            </label>

                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) =>
                                    handleChange(
                                        "email",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                            />

                        </div>


                        {/* TELÉFONO */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Teléfono
                            </label>

                            <input
                                value={form.phone}
                                onChange={(e) =>
                                    handleChange(
                                        "phone",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                            />

                        </div>


                        {/* CIUDAD */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Ciudad
                            </label>

                            <input
                                value={form.city}
                                onChange={(e) =>
                                    handleChange(
                                        "city",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                            />

                        </div>


                        {/* DIRECCIÓN */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Dirección
                            </label>

                            <input
                                value={form.address}
                                onChange={(e) =>
                                    handleChange(
                                        "address",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                            />

                        </div>


                        {/* CONTACTO */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Persona de contacto
                            </label>

                            <input
                                value={form.contact_person}
                                onChange={(e) =>
                                    handleChange(
                                        "contact_person",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                            />

                        </div>


                        {/* TELÉFONO CONTACTO */}

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Teléfono de contacto
                            </label>

                            <input
                                value={form.contact_phone}
                                onChange={(e) =>
                                    handleChange(
                                        "contact_phone",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                            />

                        </div>

                    </div>


                    {/* NOTAS */}

                    <div className="mt-5">

                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Observaciones
                        </label>

                        <textarea
                            value={form.notes}
                            onChange={(e) =>
                                handleChange(
                                    "notes",
                                    e.target.value
                                )
                            }
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                        />

                    </div>


                    {/* ACTIVO */}

                    <div className="mt-5 flex items-center gap-3">

                        <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(e) =>
                                handleChange(
                                    "active",
                                    e.target.checked
                                )
                            }
                            className="h-4 w-4"
                        />

                        <label className="text-sm font-medium text-slate-700">
                            Cliente activo
                        </label>

                    </div>


                    {/* BOTONES */}

                    <div className="mt-6 flex gap-3">

                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                        >

                            {saving
                                ? "Guardando..."
                                : editingId
                                    ? "Actualizar cliente"
                                    : "Guardar cliente"}

                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setShowForm(false);
                                setEditingId(null);
                                setForm(emptyForm);
                            }}
                            className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>

                    </div>

                </form>

            )}


            {/* =====================================
                TABLA
            ===================================== */}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">


                {/* BUSCADOR */}

                <div className="mb-5 flex flex-col gap-3 md:flex-row">

                    <input
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                        onKeyDown={(e) => {

                            if (e.key === "Enter") {
                                loadCustomers();
                            }

                        }}
                        placeholder="Buscar cliente..."
                        className="flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                    />

                    <select
                        value={customerTypeFilter}
                        onChange={(e) =>
                            setCustomerTypeFilter(
                                e.target.value as CustomerType | ""
                            )
                        }
                        aria-label="Filtrar por tipo de cliente"
                        className="rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-amber-500"
                    >
                        <option value="">Todos los tipos</option>
                        <option value="person">Personas</option>
                        <option value="company">Empresas</option>
                    </select>

                    <button
                        type="button"
                        onClick={loadCustomers}
                        className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                    >
                        Buscar
                    </button>

                </div>


                {/* LOADING */}

                {loading ? (

                    <div className="py-10 text-center text-slate-500">

                        Cargando clientes...

                    </div>

                ) : customers.length === 0 ? (

                    <div className="py-10 text-center text-slate-500">

                        No existen clientes registrados.

                    </div>

                ) : (

                    <div className="overflow-x-auto">

                        <table className="w-full text-left text-sm">

                            <thead>

                                <tr className="border-b border-slate-200">

                                    <th className="px-4 py-3 font-semibold text-slate-600">
                                        Cliente
                                    </th>

                                    <th className="px-4 py-3 font-semibold text-slate-600">
                                        Tipo
                                    </th>

                                    <th className="px-4 py-3 font-semibold text-slate-600">
                                        Identificación
                                    </th>

                                    <th className="px-4 py-3 font-semibold text-slate-600">
                                        Contacto
                                    </th>

                                    <th className="px-4 py-3 font-semibold text-slate-600">
                                        Estado
                                    </th>

                                    <th className="px-4 py-3 text-right font-semibold text-slate-600">
                                        Acciones
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {customers.map(
                                    (customer) => (

                                        <tr
                                            key={customer.id}
                                            className="border-b border-slate-100 hover:bg-slate-50"
                                        >

                                            <td className="px-4 py-4">

                                                <div className="font-semibold text-slate-900">
                                                    {customer.name}
                                                </div>

                                                <div className="text-xs text-slate-500">
                                                    {customer.email ||
                                                        "Sin correo"}
                                                </div>

                                            </td>


                                            <td className="px-4 py-4">

                                                <span
                                                    className={
                                                        customer.customer_type === "company"
                                                            ? "rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700"
                                                            : "rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700"
                                                    }
                                                >
                                                    {customer.customer_type === "company"
                                                        ? "Empresa"
                                                        : "Persona"}
                                                </span>

                                            </td>


                                            <td className="px-4 py-4 text-slate-600">

                                                {
                                                    customer.identification
                                                }

                                            </td>


                                            <td className="px-4 py-4 text-slate-600">

                                                {customer.phone ||
                                                    "Sin teléfono"}

                                            </td>


                                            <td className="px-4 py-4">

                                                <span
                                                    className={
                                                        customer.active
                                                            ? "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                                                            : "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
                                                    }
                                                >

                                                    {customer.active
                                                        ? "Activo"
                                                        : "Inactivo"}

                                                </span>

                                            </td>


                                            {/* ACCIONES */}

                                            <td className="px-4 py-4">

                                                <div className="flex justify-end gap-3">

                                                    <button
                                                        onClick={() =>
                                                            handleEdit(
                                                                customer
                                                            )
                                                        }
                                                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            handleDelete(
                                                                customer.id
                                                            )
                                                        }
                                                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                                    >
                                                        Eliminar
                                                    </button>

                                                </div>

                                            </td>

                                        </tr>

                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>

        </div>
    );
}

export default Customers;