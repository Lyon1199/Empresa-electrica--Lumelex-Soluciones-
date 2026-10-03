import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
    getElectronicSignatureSettings,
    saveElectronicSignatureSettings,
} from "../../services/electronicSignatureService";
import type { ElectronicSignatureSettings } from "../../services/electronicSignatureService";

function messageFromError(error: unknown): string {
    if (typeof error === "object" && error !== null && "response" in error) {
        const response = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response;
        if (response?.data?.errors) return Object.values(response.data.errors).flat().join(" ");
        if (response?.data?.message) return response.data.message;
    }
    return "No se pudo guardar la configuración de firma electrónica.";
}

export default function ElectronicSignatureSettingsPage() {
    const [settings, setSettings] = useState<ElectronicSignatureSettings | null>(null);
    const [signerName, setSignerName] = useState("Alex Lucas");
    const [certificate, setCertificate] = useState<File | null>(null);
    const [certificatePassword, setCertificatePassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        let active = true;
        getElectronicSignatureSettings()
            .then((result) => {
                if (!active) return;
                setSettings(result);
                setSignerName(result.signer_name);
            })
            .catch((cause: unknown) => {
                if (active) setError(messageFromError(cause));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, []);

    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setNotice("");
        try {
            const updated = await saveElectronicSignatureSettings(
                signerName.trim(),
                certificate ?? undefined,
                certificatePassword || undefined,
            );
            setSettings(updated);
            setSignerName(updated.signer_name);
            setCertificate(null);
            setCertificatePassword("");
            setNotice("Configuración de firma electrónica guardada de forma segura.");
        } catch (cause) {
            setError(messageFromError(cause));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p className="py-12 text-center text-slate-500">Cargando certificado del gerente…</p>;

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-slate-900">Firma electrónica del gerente</h1>
                <p className="mt-1 text-sm text-slate-600">
                    Conserva cifrados los datos del certificado para futuras funciones de firma electrónica. No firma ni envía documentos todavía.
                </p>
            </header>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
            {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                    <h2 className="font-semibold text-slate-900">Certificado personal .p12 / .pfx</h2>
                    <p className="mt-1 text-sm text-slate-600">
                        El archivo y su contraseña se cifran con APP_KEY. Solo administradores y gerencia pueden gestionar esta configuración.
                    </p>
                </div>
                <form onSubmit={(event) => void save(event)} className="space-y-4">
                    <label className="block text-sm font-medium text-slate-700">
                        Nombre del gerente
                        <input
                            required
                            maxLength={150}
                            value={signerName}
                            onChange={(event) => setSignerName(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                    </label>
                    {settings?.certificate_configured && (
                        <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
                            <p className="font-semibold">Certificado configurado</p>
                            {settings.certificate_subject && <p>Identidad del certificado: {settings.certificate_subject}</p>}
                            {settings.certificate_expires_at && (
                                <p>Vence: {new Date(settings.certificate_expires_at).toLocaleDateString("es-EC")}</p>
                            )}
                            <p>Déjalo sin seleccionar para conservar el archivo actual.</p>
                        </div>
                    )}
                    <label className="block text-sm font-medium text-slate-700">
                        Certificado electrónico
                        <input
                            type="file"
                            accept=".p12,.pfx,application/x-pkcs12"
                            required={!settings?.certificate_configured}
                            onChange={(event) => setCertificate(event.target.files?.[0] ?? null)}
                            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                        Contraseña del certificado
                        <input
                            type="password"
                            autoComplete="new-password"
                            required={Boolean(certificate) || !settings?.certificate_configured}
                            value={certificatePassword}
                            onChange={(event) => setCertificatePassword(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-slate-900 px-5 py-2.5 font-semibold text-white disabled:opacity-60"
                    >
                        {saving ? "Validando y guardando…" : "Guardar certificado"}
                    </button>
                </form>
            </section>
            <aside className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                Las cotizaciones muestran únicamente la firma dibujada “Alex Lucas”; no se firman con este certificado. La configuración aquí guardada no constituye una firma electrónica aplicada a un documento.
            </aside>
        </div>
    );
}
