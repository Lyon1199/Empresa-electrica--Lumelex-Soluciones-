import {
    useEffect,
    useState,
} from "react";
import { Link } from "react-router-dom";

import {
    getDashboard,
    type DashboardData,
} from "../../services/dashboardService";
import { getAuthenticatedUser } from "../../services/authService";


function Dashboard() {

    const [
        data,
        setData,
    ] = useState<DashboardData>({

        users: 0,
        customers: 0,
        projects: 0,
        quotations: 0,
        open_quotations: 0,
        open_quotation_value: 0,
        work_orders: 0,

    });


    const [
        loading,
        setLoading,
    ] = useState(true);


    const [
        error,
        setError,
    ] = useState("");

    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let mounted = true;
        getAuthenticatedUser()
            .then((user) => {
                if (mounted) setIsAdmin(user.roles.includes("admin"));
            })
            .catch((userError: unknown) => {
                console.error("No se pudo validar el rol para mostrar la gestión de usuarios:", userError);
            });

        return () => {
            mounted = false;
        };
    }, []);


    /*
    |--------------------------------------------------------------------------
    | CARGAR DASHBOARD
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        let mounted = true;


        const loadDashboard = async () => {

            try {

                setLoading(true);
                setError("");


                const result =
                    await getDashboard();


                if (mounted) {

                    setData(result);

                }


            } catch (error: any) {

                if (
                    error?.code ===
                    "ERR_CANCELED"
                ) {

                    return;

                }


                console.error(
                    "Error cargando dashboard:",
                    error
                );


                if (mounted) {

                    setError(
                        "No se pudo cargar el dashboard."
                    );

                }


            } finally {

                if (mounted) {

                    setLoading(false);

                }

            }

        };


        loadDashboard();


        return () => {

            mounted = false;

        };

    }, []);


    /*
    |--------------------------------------------------------------------------
    | CARGANDO
    |--------------------------------------------------------------------------
    */

    if (loading) {

        return (

            <div
                className="
                    flex
                    min-h-[400px]
                    items-center
                    justify-center
                "
            >

                <div className="text-center">

                    <div
                        className="
                            mx-auto
                            mb-4
                            h-8
                            w-8
                            animate-spin
                            rounded-full
                            border-4
                            border-slate-300
                            border-t-slate-900
                        "
                    />

                    <p
                        className="
                            text-sm
                            text-slate-500
                        "
                    >
                        Cargando dashboard...
                    </p>

                </div>

            </div>

        );

    }


    /*
    |--------------------------------------------------------------------------
    | TARJETAS
    |--------------------------------------------------------------------------
    */

    const cards = [

        {
            title: "Usuarios",
            value: data.users,
            icon: "👥",
            path: isAdmin ? "/admin/usuarios" : undefined,
        },

        {
            title: "Clientes",
            value: data.customers,
            icon: "🤝",
            path: "/admin/clientes",
        },

        {
            title: "Proyectos",
            value: data.projects,
            icon: "📁",
            path: "/admin/proyectos",
        },

        {
            title: "Cotizaciones",
            value: data.quotations,
            icon: "📜",
            path: "/admin/cotizaciones",
        },

        {
            title: "Cotizaciones en seguimiento",
            value: data.open_quotations,
            icon: "⏳",
            path: "/admin/cotizaciones",
        },

        {
            title: "Órdenes de trabajo",
            value: data.work_orders,
            icon: "🔧",
            path: "/admin/ordenes",
        },

    ];


    /*
    |--------------------------------------------------------------------------
    | INTERFAZ
    |--------------------------------------------------------------------------
    */

    return (

        <div
            className="
                space-y-8
            "
        >


            {/* =========================================================
                ENCABEZADO
            ========================================================= */}

            <div>

                <h1
                    className="
                        text-2xl
                        font-bold
                        text-slate-900
                    "
                >
                    Dashboard
                </h1>


                <p
                    className="
                        mt-1
                        text-sm
                        text-slate-500
                    "
                >
                    Resumen general del sistema Lumelex
                </p>

            </div>


            {/* =========================================================
                ERROR
            ========================================================= */}

            {error && (

                <div
                    className="
                        rounded-lg
                        border
                        border-red-200
                        bg-red-50
                        px-4
                        py-3
                        text-sm
                        text-red-700
                    "
                >
                    {error}
                </div>

            )}


            {/* =========================================================
                TARJETAS
            ========================================================= */}

            <div
                className="
                    grid
                    gap-5
                    sm:grid-cols-2
                "
            >

                {cards.map((card) => {
                    const content = (
                        <div
                            className="
                            flex
                            min-h-[128px]
                            items-center
                            justify-between
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            px-5
                            py-5
                            shadow-sm
                            transition
                            duration-200
                            hover:-translate-y-0.5
                            hover:shadow-md
                        "
                        >

                            {/* =================================================
                            INFORMACIÓN
                        ================================================= */}

                            <div>

                                <p
                                    className="
                                    text-sm
                                    font-medium
                                    text-slate-500
                                "
                                >
                                    {card.title}
                                </p>


                                <p
                                    className="
                                    mt-2
                                    text-3xl
                                    font-bold
                                    tracking-tight
                                    text-slate-900
                                "
                                >
                                    {card.value}
                                </p>

                            </div>


                            {/* =================================================
                            ICONO
                        ================================================= */}

                            <div
                                className="
                                flex
                                h-12
                                w-12
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-amber-50
                                text-2xl
                            "
                            >
                                {card.icon}
                            </div>

                        </div>
                    );

                    return typeof card.path === "string" ? (
                        <Link key={card.title} to={card.path} className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500">
                            {content}
                        </Link>
                    ) : (
                        <div key={card.title}>{content}</div>
                    );
                })}

            </div>

            <Link
                to="/admin/cotizaciones"
                className="flex flex-col justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-5 transition hover:bg-amber-100 sm:flex-row sm:items-center"
            >
                <div>
                    <h2 className="font-semibold text-slate-900">Cotizaciones pendientes de respuesta</h2>
                    <p className="mt-1 text-sm text-slate-600">Borradores y propuestas enviadas a clientes.</p>
                </div>
                <div className="text-xl font-bold text-slate-900">
                    {new Intl.NumberFormat("es-EC", {
                        style: "currency",
                        currency: "USD",
                    }).format(data.open_quotation_value)}
                </div>
            </Link>


            {/* =========================================================
                ACTIVIDAD RECIENTE
            ========================================================= */}

            <section
                className="
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-6
                    shadow-sm
                "
            >

                <h2
                    className="
                        text-base
                        font-semibold
                        text-slate-900
                    "
                >
                    Actividad reciente
                </h2>


                <p
                    className="
                        mt-2
                        text-sm
                        text-slate-500
                    "
                >
                    Próximamente mostraremos aquí
                    las actividades del sistema.
                </p>

            </section>

        </div>

    );
}


export default Dashboard;