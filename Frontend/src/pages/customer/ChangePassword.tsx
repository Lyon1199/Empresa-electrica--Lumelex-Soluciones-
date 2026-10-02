import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { updateCustomerPassword } from "../../services/projectService";

function ChangePassword() {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState("");
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        if (password !== confirmation) {
            setError("La confirmación de la contraseña no coincide.");
            return;
        }
        try {
            setSaving(true);
            await updateCustomerPassword(currentPassword, password, confirmation);
            navigate("/cliente", { replace: true });
        } catch (changeError) {
            console.error("Error cambiando contraseña del portal:", changeError);
            const data = typeof changeError === "object" && changeError !== null
                ? (changeError as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data
                : undefined;
            setError(data?.message || (data?.errors ? Object.values(data.errors).flat().join(" ") : "") || "No se pudo cambiar la contraseña.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
            <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div>
                    <p className="text-xs font-bold tracking-wide text-amber-700">LUMELEX · PORTAL DEL CLIENTE</p>
                    <h1 className="mt-2 text-2xl font-bold text-slate-900">Cambia tu contraseña</h1>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Tu contraseña inicial corresponde a tu número de identificación. Cambiarla es recomendable para proteger tu cuenta, pero puedes seguir usando el portal sin hacerlo. La nueva contraseña debe tener al menos 10 caracteres e incluir letras y números.</p>
                </div>
                {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                <label className="block text-sm font-semibold text-slate-700">Contraseña temporal (número de identificación)
                    <input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">Nueva contraseña
                    <input required minLength={10} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                    <span className="mt-1 block text-xs font-normal text-slate-500">Al menos 10 caracteres, incluyendo letras y números.</span>
                </label>
                <label className="block text-sm font-semibold text-slate-700">Confirmar nueva contraseña
                    <input required minLength={10} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5" />
                </label>
                <button type="submit" disabled={saving} className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50">{saving ? "Guardando…" : "Actualizar contraseña"}</button>
                <button type="button" onClick={() => navigate("/cliente")} className="w-full rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50">Ahora no, volver al portal</button>
            </form>
        </main>
    );
}

export default ChangePassword;
