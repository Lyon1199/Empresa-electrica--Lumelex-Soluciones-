import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    login,
} from "../../services/authService";

import lumelexLogo from "../../assets/lumelex-logo.png";


function Login() {

    const navigate = useNavigate();


    /*
    |--------------------------------------------------------------------------
    | LIMPIAR MARCA LOCAL AL ENTRAR AL LOGIN
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        sessionStorage.removeItem(
            "lumelex_authenticated"
        );

    }, []);


    /*
    |--------------------------------------------------------------------------
    | ESTADOS
    |--------------------------------------------------------------------------
    */

    const [
        email,
        setEmail,
    ] = useState("");

    const [
        password,
        setPassword,
    ] = useState("");

    const [
        error,
        setError,
    ] = useState("");

    const [
        loading,
        setLoading,
    ] = useState(false);


    /*
    |--------------------------------------------------------------------------
    | LOGIN
    |--------------------------------------------------------------------------
    */

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {

        event.preventDefault();

        setError("");
        setLoading(true);


        try {

            const response = await login({
                email,
                password,
            });


            const user = response.user;
            const roles: string[] = user?.roles ?? [];
            navigate(
                roles.includes("cliente")
                    ? "/cliente"
                    : roles.includes("lider_proyecto")
                        ? "/lider/proyectos"
                    : roles.includes("tecnico")
                        ? "/trabajador"
                        : roles.includes("supervisor")
                            ? "/admin/ordenes"
                            : roles.includes("bodega")
                                ? "/admin/inventario"
                                : "/admin",
                { replace: true }
            );


        } catch (error: any) {

            console.error(
                "Error de login:",
                error
            );


            setError(
                error?.response?.data?.message ||
                "No se pudo iniciar sesión. Verifica tus credenciales."
            );


        } finally {

            setLoading(false);

        }

    };


    /*
    |--------------------------------------------------------------------------
    | INTERFAZ
    |--------------------------------------------------------------------------
    */

    return (

        <main
            className="
                min-h-screen
                w-full
                bg-slate-100
                px-4
                py-8
            "
        >

            <div
                className="
                    flex
                    min-h-[calc(100vh-4rem)]
                    items-center
                    justify-center
                "
            >

                <section
                    className="
                        w-full
                        max-w-md
                        overflow-hidden
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-8
                        shadow-[0_20px_50px_rgba(15,23,42,0.10)]
                        sm:p-10
                    "
                >


                    {/* =================================================
                        LOGO
                    ================================================= */}

                    <div
                        className="
                            mb-8
                            flex
                            justify-center
                        "
                    >

                        <img
                            src={lumelexLogo}
                            alt="
                                Lumelex Soluciones
                                Eléctricas e Ingeniería
                            "
                            className="
                                h-auto
                                w-[180px]
                                object-contain
                                sm:w-[200px]
                            "
                        />

                    </div>


                    {/* =================================================
                        TÍTULO
                    ================================================= */}

                    <div
                        className="
                            mb-8
                            text-center
                        "
                    >

                        <h1
                            className="
                                text-2xl
                                font-bold
                                tracking-tight
                                text-slate-900
                            "
                        >
                            Bienvenido
                        </h1>


                        <p
                            className="
                                mt-2
                                text-sm
                                leading-6
                                text-slate-500
                            "
                        >
                            Ingresa al sistema de gestión
                            de Lumelex
                        </p>

                    </div>


                    {/* =================================================
                        FORMULARIO
                    ================================================= */}

                    <form
                        onSubmit={handleSubmit}
                        className="
                            flex
                            flex-col
                            gap-5
                        "
                    >


                        {/* =============================================
                            CORREO
                        ============================================= */}

                        <div
                            className="
                                flex
                                flex-col
                                gap-2
                            "
                        >

                            <label
                                htmlFor="email"
                                className="
                                    text-sm
                                    font-semibold
                                    text-slate-700
                                "
                            >
                                Correo electrónico
                            </label>


                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(
                                        event.target.value
                                    )
                                }
                                placeholder="Ingresa tu correo electrónico"
                                disabled={loading}
                                required
                                className="
                                    h-12
                                    w-full
                                    rounded-lg
                                    border
                                    border-slate-300
                                    bg-white
                                    px-4
                                    text-sm
                                    text-slate-800
                                    outline-none
                                    transition-all
                                    duration-200
                                    placeholder:text-slate-400
                                    focus:border-amber-500
                                    focus:ring-4
                                    focus:ring-amber-500/10
                                    disabled:cursor-not-allowed
                                    disabled:bg-slate-50
                                    disabled:text-slate-500
                                "
                            />

                        </div>


                        {/* =============================================
                            CONTRASEÑA
                        ============================================= */}

                        <div
                            className="
                                flex
                                flex-col
                                gap-2
                            "
                        >

                            <label
                                htmlFor="password"
                                className="
                                    text-sm
                                    font-semibold
                                    text-slate-700
                                "
                            >
                                Contraseña
                            </label>


                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(
                                        event.target.value
                                    )
                                }
                                placeholder="Ingresa tu contraseña"
                                disabled={loading}
                                required
                                className="
                                    h-12
                                    w-full
                                    rounded-lg
                                    border
                                    border-slate-300
                                    bg-white
                                    px-4
                                    text-sm
                                    text-slate-800
                                    outline-none
                                    transition-all
                                    duration-200
                                    placeholder:text-slate-400
                                    focus:border-amber-500
                                    focus:ring-4
                                    focus:ring-amber-500/10
                                    disabled:cursor-not-allowed
                                    disabled:bg-slate-50
                                    disabled:text-slate-500
                                "
                            />

                        </div>


                        {/* =============================================
                            ERROR
                        ============================================= */}

                        {error && (

                            <div
                                role="alert"
                                className="
                                    rounded-lg
                                    border
                                    border-red-200
                                    bg-red-50
                                    px-4
                                    py-3
                                    text-sm
                                    leading-5
                                    text-red-700
                                "
                            >
                                {error}
                            </div>

                        )}


                        {/* =============================================
                            BOTÓN
                        ============================================= */}

                        <button
                            type="submit"
                            disabled={loading}
                            className="
                                mt-1
                                flex
                                h-12
                                w-full
                                items-center
                                justify-center
                                rounded-lg
                                bg-slate-900
                                px-4
                                text-sm
                                font-semibold
                                text-white
                                shadow-sm
                                transition-all
                                duration-200
                                hover:bg-slate-800
                                hover:shadow-md
                                focus:outline-none
                                focus:ring-4
                                focus:ring-slate-900/20
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >

                            {loading ? (

                                <>

                                    <span
                                        className="
                                            mr-2
                                            h-4
                                            w-4
                                            animate-spin
                                            rounded-full
                                            border-2
                                            border-white/30
                                            border-t-white
                                        "
                                    />

                                    Ingresando...

                                </>

                            ) : (

                                "Iniciar sesión"

                            )}

                        </button>

                    </form>


                    {/* =================================================
                        FOOTER
                    ================================================= */}

                    <div
                        className="
                            mt-8
                            text-center
                        "
                    >

                        <p
                            className="
                                text-xs
                                text-slate-400
                            "
                        >
                            Lumelex SAS · Soluciones
                            Eléctricas e Ingeniería
                        </p>

                    </div>

                </section>

            </div>

        </main>

    );
}


export default Login;