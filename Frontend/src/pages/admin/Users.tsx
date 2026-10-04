import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { isAxiosError, isCancel } from "axios";
import { getAuthenticatedUser } from "../../services/authService";
import {
    createUser,
    getUsers,
    updateUserRole,
    type ManagedRole,
    type ManagedUser,
    type UserCategory,
} from "../../services/userService";

const categories: { label: string; value: UserCategory }[] = [
    { label: "Todos", value: "all" },
    { label: "Administradores", value: "admins" },
    { label: "Trabajadores", value: "workers" },
    { label: "Clientes", value: "customers" },
    { label: "Personal", value: "staff" },
    { label: "Sin rol", value: "unassigned" },
];

const initialAccountForm = {
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "bodega" as "gerente" | "contabilidad" | "bodega" | "supervisor",
};

function Users() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [roles, setRoles] = useState<ManagedRole[]>([]);
    const [category, setCategory] = useState<UserCategory>("all");
    const [roleFilter, setRoleFilter] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [selectedRoles, setSelectedRoles] = useState<Record<number, string>>({});
    const [savingUserId, setSavingUserId] = useState<number | null>(null);
    const [refresh, setRefresh] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [accountForm, setAccountForm] = useState(initialAccountForm);
    const [creatingAccount, setCreatingAccount] = useState(false);

    useEffect(() => {
        let active = true;
        getAuthenticatedUser()
            .then((user) => {
                if (active) setCurrentUserId(user.id);
            })
            .catch((loadError: unknown) => {
                console.error("No se pudo identificar al usuario administrador:", loadError);
            });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            setLoading(true);
            setError("");
            getUsers({ category, role: roleFilter, search, page }, controller.signal)
                .then((result) => {
                    setUsers(result.data);
                    setRoles(result.roles);
                    setLastPage(result.pagination.last_page);
                    setTotal(result.pagination.total);
                    setSelectedRoles({});
                })
                    .catch((loadError: unknown) => {
                        if (isCancel(loadError)) return;
                    console.error("No se pudo cargar la lista de usuarios:", loadError);
                        setError(isAxiosError<{ message?: string }>(loadError)
                            ? loadError.response?.data?.message ?? "No se pudo cargar la lista de usuarios."
                            : "No se pudo cargar la lista de usuarios.");
                })
                .finally(() => {
                    if (!controller.signal.aborted) setLoading(false);
                });
        }, 250);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [category, roleFilter, search, page, refresh]);

    const changeCategory = (value: UserCategory) => {
        setCategory(value);
        setRoleFilter("");
        setPage(1);
    };

    const changeRoleFilter = (event: FormEvent<HTMLSelectElement>) => {
        setRoleFilter(event.currentTarget.value);
        setPage(1);
    };

    const saveRole = async (user: ManagedUser) => {
        const role = selectedRoles[user.id] ?? user.roles[0]?.slug ?? "";
        if (!role || role === user.roles[0]?.slug) return;

        setSavingUserId(user.id);
        setError("");
        setNotice("");
        try {
            await updateUserRole(user.id, role);
            setNotice(`Se actualizó el rol de ${user.name}.`);
            setRefresh((value) => value + 1);
        } catch (saveError: unknown) {
            console.error("No se pudo actualizar el rol del usuario:", saveError);
            setError(isAxiosError<{ message?: string }>(saveError)
                ? saveError.response?.data?.message ?? "No se pudo actualizar el rol."
                : "No se pudo actualizar el rol.");
        } finally {
            setSavingUserId(null);
        }
    };

    const submitAccount = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCreatingAccount(true);
        setError("");
        setNotice("");
        try {
            await createUser({
                ...accountForm,
                name: accountForm.name.trim(),
                email: accountForm.email.trim(),
                phone: accountForm.phone.trim() || undefined,
            });
            setAccountForm(initialAccountForm);
            setNotice("Cuenta creada. Ya puede iniciar sesión con el correo y la contraseña asignada.");
            setRefresh((value) => value + 1);
        } catch (cause: unknown) {
            setError(isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(cause)
                ? Object.values(cause.response?.data?.errors ?? {}).flat().join(" ")
                    || cause.response?.data?.message
                    || "No se pudo crear la cuenta."
                : "No se pudo crear la cuenta.");
        } finally {
            setCreatingAccount(false);
        }
    };

    return (
        <main className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-slate-900">Usuarios del sistema</h1>
                <p className="mt-1 text-sm text-slate-600">
                    Consulta las cuentas por tipo y administra sus roles.
                </p>
            </header>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                    <h2 className="font-semibold text-slate-900">Crear cuenta de personal</h2>
                    <p className="mt-1 text-sm text-slate-600">Bodega, contabilidad, gerencia o supervisión. El usuario podrá iniciar sesión de inmediato.</p>
                </div>
                <form onSubmit={(event) => void submitAccount(event)} className="grid gap-3 sm:grid-cols-2">
                    <input required maxLength={255} aria-label="Nombre" placeholder="Nombre completo" value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                    <input required type="email" maxLength={254} aria-label="Correo" placeholder="Correo" value={accountForm.email} onChange={(event) => setAccountForm({ ...accountForm, email: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                    <input type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} aria-label="Teléfono" placeholder="Teléfono (10 dígitos, opcional)" value={accountForm.phone} onChange={(event) => setAccountForm({ ...accountForm, phone: event.target.value.replace(/\D/g, "").slice(0, 10) })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                    <input required type="password" minLength={10} aria-label="Contraseña inicial" autoComplete="new-password" placeholder="Contraseña (mínimo 10 caracteres)" value={accountForm.password} onChange={(event) => setAccountForm({ ...accountForm, password: event.target.value })} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
                    <select aria-label="Rol de cuenta" value={accountForm.role} onChange={(event) => setAccountForm({ ...accountForm, role: event.target.value as typeof accountForm.role })} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
                        <option value="bodega">Bodega</option>
                        <option value="contabilidad">Contabilidad</option>
                        <option value="gerente">Gerencia</option>
                        <option value="supervisor">Supervisor</option>
                    </select>
                    <button type="submit" disabled={creatingAccount} className="rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60">{creatingAccount ? "Creando..." : "Crear cuenta"}</button>
                </form>
                <p className="text-xs text-slate-500">El acceso de clientes al portal se crea al aceptar su cotización; los clientes sin proyecto todavía no son cuentas de usuario.</p>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap gap-2" aria-label="Clasificar usuarios">
                    {categories.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => changeCategory(item.value)}
                            aria-pressed={category === item.value}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                category === item.value
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
                    <label className="sr-only" htmlFor="user-search">Buscar usuarios</label>
                    <input
                        id="user-search"
                        type="search"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.currentTarget.value);
                            setPage(1);
                        }}
                        placeholder="Buscar por nombre, correo, teléfono o identificación"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    />
                    <label className="sr-only" htmlFor="role-filter">Filtrar por rol específico</label>
                    <select
                        id="role-filter"
                        value={roleFilter}
                        onChange={changeRoleFilter}
                        className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    >
                        <option value="">Todos los roles</option>
                        {roles.map((role) => (
                            <option key={role.slug} value={role.slug}>{role.name}</option>
                        ))}
                    </select>
                </div>

                <p className="text-sm text-slate-500" aria-live="polite">
                    {loading ? "Cargando usuarios..." : `${total} usuario${total === 1 ? "" : "s"}`}
                </p>
                {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
                {notice && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Usuario</th>
                                <th className="px-4 py-3 font-semibold">Contacto</th>
                                <th className="px-4 py-3 font-semibold">Clasificación</th>
                                <th className="px-4 py-3 font-semibold">Rol</th>
                                <th className="px-4 py-3 font-semibold">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!loading && users.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No se encontraron usuarios.</td></tr>
                            )}
                            {users.map((user) => {
                                const currentRole = user.roles[0]?.slug ?? "";
                                const selectedRole = selectedRoles[user.id] ?? currentRole;
                                const isSelf = user.id === currentUserId;
                                return (
                                    <tr key={user.id} className="align-top">
                                        <td className="px-4 py-4">
                                            <p className="font-semibold text-slate-900">{user.name}</p>
                                            {user.identification && <p className="mt-1 text-xs text-slate-500">ID: {user.identification}</p>}
                                            {user.customer && <p className="mt-1 text-xs text-slate-500">Cliente: {user.customer.name}</p>}
                                        </td>
                                        <td className="px-4 py-4 text-slate-600">
                                            <p>{user.email}</p>
                                            <p className="mt-1 text-xs">{user.phone || "Sin teléfono"}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {user.roles.length
                                                    ? user.roles.map((role) => (
                                                        <span key={role.slug} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                                                            {role.name}
                                                        </span>
                                                    ))
                                                    : <span className="text-xs text-slate-500">Sin rol asignado</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <select
                                                aria-label={`Rol de ${user.name}`}
                                                value={selectedRole}
                                                disabled={isSelf || savingUserId === user.id}
                                                onChange={(event) => {
                                                    const role = event.currentTarget.value;
                                                    setSelectedRoles((current) => ({
                                                        ...current,
                                                        [user.id]: role,
                                                    }));
                                                }}
                                                className="min-w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                                            >
                                                <option value="">Seleccionar rol</option>
                                                {roles.map((role) => (
                                                    <option key={role.slug} value={role.slug}>{role.name}</option>
                                                ))}
                                            </select>
                                            {isSelf && <p className="mt-1 text-xs text-slate-500">Tu propio rol está protegido.</p>}
                                            {user.roles.length > 1 && <p className="mt-1 max-w-48 text-xs text-amber-700">Al guardar se asignará únicamente el rol seleccionado.</p>}
                                        </td>
                                        <td className="px-4 py-4">
                                            <button
                                                type="button"
                                                disabled={isSelf || !selectedRole || selectedRole === currentRole || savingUserId === user.id}
                                                onClick={() => void saveRole(user)}
                                                className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                            >
                                                {savingUserId === user.id ? "Guardando..." : "Guardar rol"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <button
                        type="button"
                        disabled={loading || page <= 1}
                        onClick={() => setPage((value) => Math.max(1, value - 1))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <span className="text-sm text-slate-500">Página {page} de {lastPage}</span>
                    <button
                        type="button"
                        disabled={loading || page >= lastPage}
                        onClick={() => setPage((value) => Math.min(lastPage, value + 1))}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
                    >
                        Siguiente
                    </button>
                </div>
            </section>
        </main>
    );
}

export default Users;
