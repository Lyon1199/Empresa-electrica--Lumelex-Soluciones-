import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import {
    getAuthenticatedUser,
    type AuthenticatedUser,
} from "../../services/authService";

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

function ProtectedRoute({
    allowedRoles,
}: ProtectedRouteProps) {
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<AuthenticatedUser | null>(null);
    const [sessionExists, setSessionExists] = useState(false);

    useEffect(() => {
        let mounted = true;

        const verifySession = async () => {
            const hasSession = sessionStorage.getItem("lumelex_authenticated") === "true";
            if (!hasSession) {
                if (mounted) {
                    setSessionExists(false);
                    setLoading(false);
                }
                return;
            }

            if (mounted) setSessionExists(true);

            try {
                const authenticatedUser = await getAuthenticatedUser();
                if (mounted) setUser(authenticatedUser);
            } catch (error) {
                console.error("No se pudo validar la sesión:", error);
                sessionStorage.removeItem("lumelex_authenticated");
                if (mounted) {
                    setSessionExists(false);
                    setUser(null);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        void verifySession();

        return () => {
            mounted = false;
        };
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
                    <p className="text-sm text-slate-500">Verificando sesión…</p>
                </div>
            </div>
        );
    }

    if (!sessionExists || !user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (allowedRoles && !user.roles.some((role) => allowedRoles.includes(role))) {
        const fallback = user.roles.includes("cliente")
            ? "/cliente"
            : user.roles.includes("lider_proyecto")
                ? "/lider/proyectos"
                : user.roles.includes("tecnico")
                ? "/trabajador"
                : user.roles.includes("supervisor")
                    ? "/admin/ordenes"
            : user.roles.includes("bodega")
                ? "/admin/inventario"
                : "/admin";
        return <Navigate to={fallback} replace />;
    }

    return <Outlet />;
}

export default ProtectedRoute;
