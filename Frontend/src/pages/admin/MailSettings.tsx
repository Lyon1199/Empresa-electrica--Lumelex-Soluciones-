import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
    activateMicrosoftMail,
    getMailSettings,
    saveMailSettings,
    saveMicrosoftAppCredentials,
    sendTestEmail,
    startMicrosoftMailConnection,
} from "../../services/mailSettingsService";
import type { MailSettings } from "../../services/mailSettingsService";

const initialForm = {
    host: "",
    port: "587",
    scheme: "smtp" as "smtp" | "smtps",
    username: "",
    password: "",
    from_address: "",
    from_name: "Lumelex",
};

function messageFromError(error: unknown) {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response;
        if (response?.data?.errors) return Object.values(response.data.errors).flat().join(" ");
        if (response?.data?.message) return response.data.message;
    }
    return "No se pudo completar la operación.";
}

export default function MailSettingsPage() {
    const microsoftResult = new URLSearchParams(window.location.search).get("microsoft");
    const microsoftErrorReason = new URLSearchParams(window.location.search).get("reason");
    const [form, setForm] = useState(initialForm);
    const [settings, setSettings] = useState<MailSettings | null>(null);
    const [microsoftClientId, setMicrosoftClientId] = useState("");
    const [microsoftClientSecret, setMicrosoftClientSecret] = useState("");
    const [testAddress, setTestAddress] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [connectingMicrosoft, setConnectingMicrosoft] = useState(false);
    const [switchingProvider, setSwitchingProvider] = useState(false);
    const [error, setError] = useState(() => microsoftResult === "error"
        ? microsoftErrorReason === "state"
            ? "La solicitud de conexión caducó o no es válida. Intenta conectar la cuenta otra vez."
            : "No se pudo conectar la cuenta Microsoft. Revisa la configuración de la aplicación y vuelve a intentarlo."
        : "");
    const [notice, setNotice] = useState(() => microsoftResult === "connected"
        ? "Cuenta Microsoft conectada y activada para enviar correos."
        : "");

    useEffect(() => {
        let active = true;
        getMailSettings()
            .then((result) => {
                if (!active) return;
                setSettings(result);
                setMicrosoftClientId(result.microsoft_client_id ?? "");
                setForm({
                    host: result.host ?? "",
                    port: String(result.port ?? 587),
                    scheme: result.scheme,
                    username: result.username ?? "",
                    password: "",
                    from_address: result.from_address ?? "",
                    from_name: result.from_name ?? "Lumelex",
                });
            })
            .catch((cause: unknown) => { if (active) setError(messageFromError(cause)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (microsoftResult) {
            window.history.replaceState({}, "", window.location.pathname);
        }
    }, [microsoftResult]);

    const connectMicrosoft = async () => {
        setConnectingMicrosoft(true);
        setError("");
        try {
            const authorizationUrl = await startMicrosoftMailConnection();
            window.location.assign(authorizationUrl);
        } catch (cause) {
            setError(messageFromError(cause));
            setConnectingMicrosoft(false);
        }
    };

    const saveMicrosoftApp = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const result = await saveMicrosoftAppCredentials({
                client_id: microsoftClientId.trim(),
                ...(microsoftClientSecret ? { client_secret: microsoftClientSecret } : {}),
            });
            setSettings(result);
            setMicrosoftClientSecret("");
            setNotice("Aplicación Microsoft guardada de forma segura. Ahora puedes conectar tu cuenta Outlook/Hotmail.");
        } catch (cause) {
            setError(messageFromError(cause));
        } finally {
            setSaving(false);
        }
    };

    const switchToMicrosoft = async () => {
        setSwitchingProvider(true);
        setError("");
        setNotice("");
        try {
            const result = await activateMicrosoftMail();
            setSettings(result);
            setForm((current) => ({
                ...current,
                from_address: result.from_address ?? current.from_address,
            }));
            setNotice("La cuenta Microsoft conectada quedó activa para enviar correos.");
        } catch (cause) {
            setError(messageFromError(cause));
        } finally {
            setSwitchingProvider(false);
        }
    };

    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const result = await saveMailSettings({
                host: form.host.trim(),
                port: Number(form.port),
                scheme: form.scheme,
                username: form.username.trim(),
                ...(form.password ? { password: form.password } : {}),
                from_address: form.from_address.trim(),
                from_name: form.from_name.trim(),
            });
            setSettings(result);
            setForm((current) => ({ ...current, password: "" }));
            setNotice("Configuración guardada. Envía un correo de prueba antes de usarla con clientes.");
        } catch (cause) {
            setError(messageFromError(cause));
        } finally {
            setSaving(false);
        }
    };

    const test = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setTesting(true);
        setError("");
        setNotice("");
        try {
            setNotice(await sendTestEmail(testAddress.trim()));
        } catch (cause) {
            setError(messageFromError(cause));
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <p className="py-12 text-center text-slate-500">Cargando configuración de correo…</p>;

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-slate-900">Correo saliente</h1>
                <p className="mt-1 text-sm text-slate-600">Conecta una cuenta Outlook/Hotmail o configura el servidor SMTP que enviará cotizaciones desde Lumelex ERP.</p>
            </header>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
            <section className="rounded-xl border border-sky-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="font-semibold text-slate-900">Cuenta Microsoft</h2>
                        <p className="mt-1 text-sm text-slate-600">
                            {settings?.microsoft_connected
                                ? `Cuenta conectada: ${settings.microsoft_email}.`
                                : "Inicia sesión con Hotmail, Outlook.com o Microsoft 365 para autorizar el envío seguro."}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Proveedor activo: {settings?.provider === "microsoft"
                                ? "Microsoft Graph"
                                : settings?.password_configured
                                    ? "SMTP"
                                    : "Sin configurar"}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void connectMicrosoft()}
                            disabled={connectingMicrosoft || !settings?.microsoft_app_configured}
                            className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {connectingMicrosoft ? "Conectando…" : settings?.microsoft_connected ? "Cambiar cuenta" : "Conectar Hotmail / Outlook"}
                        </button>
                        {settings?.microsoft_connected && settings.provider !== "microsoft" && (
                            <button
                                type="button"
                                onClick={() => void switchToMicrosoft()}
                                disabled={switchingProvider}
                                className="rounded-lg border border-sky-700 px-4 py-2.5 text-sm font-semibold text-sky-800 disabled:opacity-50"
                            >
                                {switchingProvider ? "Activando…" : "Usar cuenta Microsoft"}
                            </button>
                        )}
                    </div>
                </div>
                {!settings?.microsoft_app_configured && (
                    <div className="mt-5 space-y-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
                        <p className="font-semibold">Configuración inicial de Microsoft (se hace una sola vez)</p>
                        <ol className="list-decimal space-y-2 pl-5">
                            <li>
                                <a
                                    className="font-semibold text-sky-800 underline"
                                    href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Abre el portal oficial de Microsoft Entra
                                </a>
                                {" "}e inicia sesión con tu cuenta Microsoft.
                            </li>
                            <li>Crea un registro de aplicación. En tipos de cuenta, selecciona <strong>cuentas personales de Microsoft y cuentas de cualquier organización</strong>.</li>
                            <li>En <strong>Autenticación → Agregar plataforma → Web</strong>, agrega esta URI de retorno:</li>
                        </ol>
                        <code className="block break-all rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-xs">
                            {settings?.microsoft_redirect_uri || "http://localhost:8000/microsoft-mail/callback"}
                        </code>
                        <ol start={4} className="list-decimal space-y-2 pl-5">
                            <li>En <strong>Permisos de API</strong>, agrega Microsoft Graph → permisos delegados <code>User.Read</code> y <code>Mail.Send</code>.</li>
                            <li>En <strong>Certificados y secretos</strong>, crea un secreto de cliente y copia su <strong>Valor</strong> antes de salir. No es la contraseña de Hotmail.</li>
                            <li>En esta pantalla pega el <strong>Id. de aplicación (cliente)</strong> y el valor del secreto y pulsa guardar. Después podrás iniciar sesión con Hotmail.</li>
                        </ol>
                    </div>
                )}
                <form onSubmit={(event) => void saveMicrosoftApp(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">
                        Id. de aplicación (cliente)
                        <input
                            required
                            value={microsoftClientId}
                            onChange={(event) => setMicrosoftClientId(event.target.value)}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            autoComplete="off"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                        Secreto de cliente {settings?.microsoft_client_secret_configured && <span className="font-normal text-slate-400">(guardado; vacío lo conserva)</span>}
                        <input
                            type="password"
                            required={!settings?.microsoft_client_secret_configured}
                            value={microsoftClientSecret}
                            onChange={(event) => setMicrosoftClientSecret(event.target.value)}
                            autoComplete="new-password"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                    </label>
                    <div className="sm:col-span-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-50"
                        >
                            {saving ? "Guardando…" : "Guardar configuración Microsoft"}
                        </button>
                        <p className="mt-2 text-xs text-slate-500">
                            El secreto se cifra en el backend, no se vuelve a mostrar y nunca se envía a Microsoft desde el navegador.
                        </p>
                    </div>
                </form>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                    Puedes conectar otra cuenta en cualquier momento. La cuenta conectada reemplazará la anterior; si guardas la configuración SMTP de abajo, podrás volver a usar SMTP.
                </p>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div><h2 className="font-semibold text-slate-900">Configuración SMTP alternativa</h2><p className="mt-1 text-sm text-slate-500">Guardar este formulario activa SMTP. Puedes reemplazarlo luego por una cuenta Microsoft.</p></div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${settings?.provider === "smtp" && settings.configured && settings.password_configured ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{settings?.provider === "smtp" && settings?.configured && settings.password_configured ? "Activo" : "Alternativo"}</span>
                </div>
                <form onSubmit={(event) => void save(event)} className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">Servidor / host *
                        <input required placeholder="smtp.gmail.com" value={form.host} onChange={(event) => setForm({ ...form, host: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                    </label>
                    <label className="text-sm font-medium text-slate-700">Puerto *
                        <input required type="number" min="1" max="65535" value={form.port} onChange={(event) => setForm({ ...form, port: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                    </label>
                    <label className="text-sm font-medium text-slate-700">Seguridad *
                        <select value={form.scheme} onChange={(event) => setForm({ ...form, scheme: event.target.value as "smtp" | "smtps" })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
                            <option value="smtp">STARTTLS (usualmente puerto 587)</option>
                            <option value="smtps">SSL/TLS (usualmente puerto 465)</option>
                        </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700">Usuario SMTP
                        <input autoComplete="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                    </label>
                    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Contraseña SMTP {settings?.password_configured && <span className="font-normal text-slate-400">(guardada; déjala vacía para conservarla)</span>}
                        <input type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                        <span className="mt-1 block text-xs font-normal text-slate-500">Se guarda cifrada en el backend y nunca se vuelve a mostrar.</span>
                    </label>
                    <label className="text-sm font-medium text-slate-700">Correo remitente *
                        <input required type="email" value={form.from_address} onChange={(event) => setForm({ ...form, from_address: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                    </label>
                    <label className="text-sm font-medium text-slate-700">Nombre remitente *
                        <input required maxLength={150} value={form.from_name} onChange={(event) => setForm({ ...form, from_name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                    </label>
                    <div className="sm:col-span-2"><button disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? "Guardando…" : "Guardar configuración"}</button></div>
                </form>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="font-semibold text-slate-900">Probar conexión</h2>
                <p className="mt-1 text-sm text-slate-600">Guarda la configuración y envía un mensaje de prueba antes de mandar cotizaciones a clientes.</p>
                <form onSubmit={(event) => void test(event)} className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input required type="email" placeholder="tu-correo@dominio.com" value={testAddress} onChange={(event) => setTestAddress(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5" />
                    <button disabled={testing || !settings?.configured} className="rounded-lg bg-amber-400 px-5 py-2.5 font-semibold text-slate-950 disabled:opacity-50">{testing ? "Enviando…" : "Enviar prueba"}</button>
                </form>
            </section>
            <aside className="rounded-lg bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                Microsoft solicita autorización OAuth y no almacena la contraseña de Hotmail en Lumelex. Registra la URL de retorno mostrada en MICROSOFT_MAIL_REDIRECT_URI como URI Web en la aplicación de Microsoft Entra.
            </aside>
        </div>
    );
}
