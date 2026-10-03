import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import {
    Link,
    Outlet,
    useLocation,
} from "react-router-dom";

import {
    logout,
    getAuthenticatedUser,
} from "../services/authService";


interface AdminLayoutProps {
    children?: ReactNode;
}


function AdminLayout({
    children,
}: AdminLayoutProps) {

    const location = useLocation();
    const [roles, setRoles] = useState<string[]>([]);

    const [
        sidebarOpen,
        setSidebarOpen,
    ] = useState(true);

    const [
        loggingOut,
        setLoggingOut,
    ] = useState(false);

    useEffect(() => {
        let active = true;
        getAuthenticatedUser()
            .then((user) => { if (active) setRoles(user.roles); })
            .catch(() => { if (active) setRoles([]); });
        return () => { active = false; };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | MENÚ ADMINISTRATIVO
    |--------------------------------------------------------------------------
    */

    const menu = [

        {
            name: "Dashboard",
            path: "/admin",
            icon: "🏠",
            roles: ["admin", "gerente", "contabilidad"],
        },

        {
            name: "Usuarios",
            path: "/admin/usuarios",
            icon: "👤",
            roles: ["admin"],
        },

        {
            name: "Clientes",
            path: "/admin/clientes",
            icon: "👥",
            roles: ["admin", "gerente", "contabilidad"],
        },

        {
            name: "Proyectos",
            path: "/admin/proyectos",
            icon: "📁",
            roles: ["admin", "gerente", "contabilidad"],
        },

        {
            name: "Cotizaciones",
            path: "/admin/cotizaciones",
            icon: "🧾",
            roles: ["admin", "gerente", "contabilidad"],
        },

        {
            name: "Finanzas",
            path: "/admin/finanzas",
            icon: "💰",
            roles: ["admin", "gerente", "contabilidad"],
        },

        {
            name: "Correo saliente",
            path: "/admin/correo",
            icon: "✉️",
            roles: ["admin"],
        },

        {
            name: "Firma electrónica",
            path: "/admin/firma-electronica",
            icon: "✍️",
            roles: ["admin", "gerente"],
        },

        {
            name: "Órdenes de trabajo",
            path: "/admin/ordenes",
            icon: "🔧",
            roles: ["admin", "gerente", "contabilidad", "supervisor"],
        },

        {
            name: "Inventario",
            path: "/admin/inventario",
            icon: "📦",
            roles: ["admin", "gerente", "bodega"],
        },

        {
            name: "Reportes",
            path: "/admin/reportes",
            icon: "📊",
            roles: ["admin", "gerente", "contabilidad", "supervisor"],
        },

    ];


    /*
    |--------------------------------------------------------------------------
    | CERRAR SESIÓN
    |--------------------------------------------------------------------------
    */

    const handleLogout = async () => {

        if (loggingOut) {
            return;
        }

        setLoggingOut(true);

        try {

            await logout();

        } catch (error) {

            console.error(
                "Error cerrando sesión:",
                error
            );

        } finally {

            /*
            |--------------------------------------------------------------------------
            | ELIMINAR SESIÓN LOCAL
            |--------------------------------------------------------------------------
            */

            sessionStorage.removeItem(
                "lumelex_authenticated"
            );


            /*
            |--------------------------------------------------------------------------
            | IR AL LOGIN
            |--------------------------------------------------------------------------
            */

            window.location.replace(
                "/login"
            );

        }

    };


    /*
    |--------------------------------------------------------------------------
    | RENDER
    |--------------------------------------------------------------------------
    */

    return (

        <div className="min-h-screen bg-slate-100">


            {/* =========================================================
                SIDEBAR
            ========================================================= */}

            <aside
                className={`
                    fixed
                    left-0
                    top-0
                    z-40
                    h-screen
                    bg-slate-900
                    text-white
                    transition-all
                    duration-300
                    ${sidebarOpen
                        ? "w-64"
                        : "w-20"
                    }
                `}
            >


                {/* =====================================================
                    LOGO
                ===================================================== */}

                <div
                    className="
                        flex
                        h-20
                        items-center
                        border-b
                        border-slate-800
                        px-5
                    "
                >

                    {sidebarOpen ? (

                        <div>

                            <div
                                className="
                                    text-xl
                                    font-bold
                                    tracking-wide
                                "
                            >
                                LUMELEX
                            </div>

                            <div
                                className="
                                    text-[10px]
                                    text-amber-400
                                "
                            >
                                SOLUCIONES ELÉCTRICAS
                                E INGENIERÍA
                            </div>

                        </div>

                    ) : (

                        <div
                            className="
                                mx-auto
                                text-xl
                                font-bold
                                text-amber-400
                            "
                        >
                            L
                        </div>

                    )}

                </div>


                {/* =====================================================
                    MENÚ
                ===================================================== */}

                <nav
                    className="
                        space-y-1
                        p-3
                    "
                >

                    {menu.filter((item) => item.roles.some((role) => roles.includes(role))).map((item) => {

                        const active =
                            location.pathname === item.path ||
                            (item.path !== "/admin" && location.pathname.startsWith(`${item.path}/`));


                        return (

                            <Link
                                key={item.path}
                                to={item.path}
                                className={`
                                    flex
                                    items-center
                                    gap-3
                                    rounded-xl
                                    px-3
                                    py-3
                                    text-sm
                                    transition
                                    ${
                                        active

                                            ? `
                                                bg-amber-500
                                                font-semibold
                                                text-slate-950
                                            `

                                            : `
                                                text-slate-300
                                                hover:bg-slate-800
                                                hover:text-white
                                            `
                                    }
                                `}
                            >

                                <span
                                    className="
                                        text-lg
                                    "
                                >
                                    {item.icon}
                                </span>


                                {sidebarOpen && (

                                    <span>
                                        {item.name}
                                    </span>

                                )}

                            </Link>

                        );

                    })}

                </nav>


                {/* =====================================================
                    PARTE INFERIOR
                ===================================================== */}

                <div
                    className="
                        absolute
                        bottom-0
                        w-full
                        border-t
                        border-slate-800
                        p-3
                    "
                >


                    {/* =================================================
                        CONFIGURACIÓN
                    ================================================= */}

                    {/* =================================================
                        CERRAR SESIÓN
                    ================================================= */}

                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="
                            mt-1
                            flex
                            w-full
                            items-center
                            gap-3
                            rounded-xl
                            px-3
                            py-3
                            text-left
                            text-sm
                            text-red-400
                            transition
                            hover:bg-red-500/10
                            hover:text-red-300
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >

                        <span>

                            {loggingOut
                                ? "⏳"
                                : "🚪"
                            }

                        </span>


                        {sidebarOpen && (

                            <span>

                                {loggingOut
                                    ? "Cerrando sesión..."
                                    : "Cerrar sesión"
                                }

                            </span>

                        )}

                    </button>

                </div>

            </aside>


            {/* =========================================================
                CONTENIDO PRINCIPAL
            ========================================================= */}

            <div
                className={`
                    min-h-screen
                    transition-all
                    duration-300
                    ${
                        sidebarOpen
                            ? "ml-64"
                            : "ml-20"
                    }
                `}
            >


                {/* =====================================================
                    HEADER
                ===================================================== */}

                <header
                    className="
                        sticky
                        top-0
                        z-30
                        flex
                        h-20
                        items-center
                        justify-between
                        border-b
                        border-slate-200
                        bg-white
                        px-6
                        shadow-sm
                    "
                >


                    {/* =================================================
                        BOTÓN SIDEBAR
                    ================================================= */}

                    <button
                        type="button"
                        onClick={() =>
                            setSidebarOpen(
                                !sidebarOpen
                            )
                        }
                        className="
                            rounded-lg
                            p-2
                            text-xl
                            text-slate-600
                            transition
                            hover:bg-slate-100
                        "
                        aria-label={
                            sidebarOpen
                                ? "Contraer menú"
                                : "Expandir menú"
                        }
                    >

                        ☰

                    </button>


                    {/* =================================================
                        PARTE DERECHA
                    ================================================= */}

                    <div
                        className="
                            flex
                            items-center
                            gap-4
                        "
                    >


                        {/* =============================================
                            NOTIFICACIONES
                        ============================================= */}

                        <button
                            type="button"
                            className="
                                relative
                                rounded-lg
                                p-2
                                text-xl
                                transition
                                hover:bg-slate-100
                            "
                            aria-label="Notificaciones"
                        >

                            🔔

                            <span
                                className="
                                    absolute
                                    right-1
                                    top-1
                                    h-2
                                    w-2
                                    rounded-full
                                    bg-red-500
                                "
                            />

                        </button>


                        {/* =============================================
                            USUARIO
                        ============================================= */}

                        <div
                            className="
                                flex
                                items-center
                                gap-3
                                border-l
                                border-slate-200
                                pl-4
                            "
                        >

                            {/* Avatar */}

                            <div
                                className="
                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-full
                                    bg-slate-800
                                    font-bold
                                    text-white
                                "
                            >
                                A
                            </div>


                            {/* Información */}

                            <div
                                className="
                                    hidden
                                    sm:block
                                "
                            >

                                <p
                                    className="
                                        text-sm
                                        font-semibold
                                        text-slate-800
                                    "
                                >
                                    Administrador
                                </p>

                                <p
                                    className="
                                        text-xs
                                        text-slate-400
                                    "
                                >
                                    Administrador del sistema
                                </p>

                            </div>

                        </div>

                    </div>

                </header>


                {/* =====================================================
                    CONTENIDO
                ===================================================== */}

                <main
                    className="
                        p-6
                        lg:p-8
                    "
                >

                    {children ?? <Outlet />}

                </main>

            </div>

        </div>

    );
}


export default AdminLayout;