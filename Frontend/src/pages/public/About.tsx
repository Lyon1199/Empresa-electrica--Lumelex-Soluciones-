import { Link } from "react-router-dom";
import lumelexLogo from "../../assets/lumelex-logo.png";
import terminalArmado from "../../assets/terminal-jipijapa-tablero-armado.jpg";
import terminalInstalacion from "../../assets/terminal-jipijapa-instalacion-previa.jpg";
import terminalCableado from "../../assets/terminal-jipijapa-cableado-previo.jpg";
import terminalMedidores from "../../assets/terminal-jipijapa-medidores-previos.jpg";
import terminalOrganizado from "../../assets/terminal-jipijapa-cableado-organizado.jpg";
import terminalFinal from "../../assets/terminal-jipijapa-tablero-final.jpg";

const services = [
    {
        number: "01",
        title: "Instalaciones eléctricas",
        description:
            "Planificación y ejecución de instalaciones para espacios comerciales e institucionales, con atención a las necesidades de cada lugar.",
    },
    {
        number: "02",
        title: "Tableros y distribución",
        description:
            "Armado, renovación y organización de tableros eléctricos, protecciones, canalizaciones y conexiones de distribución.",
    },
    {
        number: "03",
        title: "Mantenimiento y diagnóstico",
        description:
            "Revisión de instalaciones y equipos para identificar necesidades de mantenimiento y proponer acciones de mejora.",
    },
    {
        number: "04",
        title: "Ingeniería y gestión de proyectos",
        description:
            "Asesoría técnica, planificación de trabajos y seguimiento de materiales y avances según el alcance acordado.",
    },
];

const projectPhotos = [
    {
        src: terminalCableado,
        alt: "Detalle del cableado y la estructura existente del tablero",
        caption: "Condición del cableado antes de los trabajos",
        stage: "Antes",
    },
    {
        src: terminalMedidores,
        alt: "Gabinete de medidores del Terminal de Jipijapa antes de la intervención",
        caption: "Gabinete de medición previo a la intervención",
        stage: "Antes",
    },
    {
        src: terminalOrganizado,
        alt: "Gabinete antiguo de medidores del Terminal de Jipijapa antes de la intervención",
        caption: "Estado del tablero de medidores antes de la intervención",
        stage: "Antes",
    },
    {
        src: terminalArmado,
        alt: "Tablero de distribución eléctrico en proceso de armado",
        caption: "Armado de los componentes del nuevo tablero",
        stage: "Durante",
    },
    {
        src: terminalInstalacion,
        alt: "Tablero eléctrico nuevo instalado junto al gabinete existente",
        caption: "Montaje del tablero junto al área de medición",
        stage: "Durante",
    },
    {
        src: terminalFinal,
        alt: "Vista general del gabinete de medidores y el tablero instalados",
        caption: "Vista general del resultado documentado",
        stage: "Después",
    },
];

const projectStages = [
    {
        title: "Inspección de la condición existente",
        description:
            "Las fotografías iniciales muestran un gabinete de medición antiguo, cableado a la vista y una estructura que requería atención. La primera tarea fue reconocer el estado del conjunto y el espacio disponible para intervenir.",
    },
    {
        title: "Armado y adecuación del tablero",
        description:
            "La documentación del proceso muestra el armado de un tablero de distribución con interruptores, barras identificadas por color y canaletas para conducir y separar el cableado.",
    },
    {
        title: "Instalación y organización",
        description:
            "El nuevo tablero se integró al área de medición existente. En las imágenes finales se aprecia el cableado dispuesto de forma más ordenada y el tablero incorporado al conjunto.",
    },
];

export default function About() {
    return (
        <main className="min-h-screen bg-white text-slate-900">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
                <nav
                    aria-label="Navegación principal"
                    className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3 sm:px-8"
                >
                    <a href="#inicio" aria-label="Lumelex, inicio">
                        <img src={lumelexLogo} alt="Lumelex SAS" className="h-14 w-14 object-contain" />
                    </a>
                    <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
                        <a className="transition hover:text-slate-950" href="#empresa">Nosotros</a>
                        <a className="transition hover:text-slate-950" href="#servicios">Servicios</a>
                        <a className="transition hover:text-slate-950" href="#proyecto">Proyectos</a>
                        <a className="transition hover:text-slate-950" href="#contacto">Contacto</a>
                    </div>
                    <Link
                        to="/login"
                        className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 sm:px-5"
                    >
                        Iniciar sesión
                    </Link>
                </nav>
            </header>

            <section id="inicio" className="overflow-hidden bg-slate-950 text-white">
                <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
                    <div>
                        <p className="font-semibold uppercase tracking-[0.22em] text-amber-400">
                            Lumelex SAS · Soluciones eléctricas e ingeniería
                        </p>
                        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                            Energía, ingeniería y confianza para cada proyecto.
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                            Acompañamos a empresas e instituciones con soluciones eléctricas
                            planificadas para sus necesidades. Combinamos criterio técnico,
                            organización y seguimiento para llevar cada trabajo de la evaluación
                            a una solución concreta.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <a
                                href="#proyecto"
                                className="rounded-lg bg-amber-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-300"
                            >
                                Conoce nuestro trabajo
                            </a>
                            <Link
                                to="/login"
                                className="rounded-lg border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                            >
                                Mira tu proyecto
                            </Link>
                        </div>
                    </div>
                    <figure className="relative">
                        <img
                            src={terminalFinal}
                            alt="Tablero eléctrico renovado en el proyecto del Terminal de Jipijapa"
                            fetchPriority="high"
                            className="h-[340px] w-full rounded-2xl object-cover shadow-2xl sm:h-[440px]"
                        />
                        <figcaption className="absolute bottom-4 left-4 rounded-lg bg-slate-950/85 px-4 py-2 text-sm text-white">
                            Proyecto eléctrico · Terminal de Jipijapa
                        </figcaption>
                    </figure>
                </div>
            </section>

            <section id="empresa" className="scroll-mt-24 bg-slate-50">
                <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <p className="font-semibold uppercase tracking-[0.18em] text-amber-600">Quiénes somos</p>
                        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                            Soluciones pensadas para el entorno real de cada cliente.
                        </h2>
                    </div>
                    <div className="space-y-5 text-base leading-8 text-slate-600">
                        <p>
                            Lumelex SAS es una empresa de soluciones eléctricas e ingeniería.
                            Trabajamos para que cada intervención responda al uso, las
                            características y las prioridades de la instalación, con una
                            comunicación clara sobre el trabajo propuesto.
                        </p>
                        <p>
                            Antes de iniciar, revisamos las condiciones visibles, entendemos el
                            requerimiento y definimos el alcance técnico. Durante la ejecución,
                            cuidamos la coordinación de actividades y materiales; al finalizar,
                            dejamos registro del trabajo y de los aspectos que requieren seguimiento.
                        </p>
                        <p>
                            Nuestro compromiso es brindar una atención profesional, ordenada y
                            enfocada en la seguridad. Cada proyecto se cotiza y se planifica de
                            acuerdo con sus condiciones específicas.
                        </p>
                    </div>
                </div>
            </section>

            <section id="servicios" className="scroll-mt-24">
                <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
                    <div className="max-w-3xl">
                        <p className="font-semibold uppercase tracking-[0.18em] text-amber-600">Qué hacemos</p>
                        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                            Acompañamiento técnico en las etapas clave.
                        </h2>
                        <p className="mt-4 leading-7 text-slate-600">
                            Desde una necesidad puntual hasta la coordinación de un proyecto,
                            conversamos sobre el alcance y las alternativas antes de comenzar.
                        </p>
                    </div>
                    <div className="mt-10 grid gap-5 sm:grid-cols-2">
                        {services.map((service) => (
                            <article
                                key={service.number}
                                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                            >
                                <span className="text-sm font-bold tracking-widest text-amber-600">
                                    {service.number}
                                </span>
                                <h3 className="mt-3 text-xl font-semibold">{service.title}</h3>
                                <p className="mt-3 leading-7 text-slate-600">{service.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section id="proyecto" className="scroll-mt-24 bg-slate-950 text-white">
                <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
                    <div className="max-w-3xl">
                        <p className="font-semibold uppercase tracking-[0.18em] text-amber-400">
                            Proyecto destacado · Jipijapa
                        </p>
                        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                            Una instalación renovada, del estado inicial al resultado.
                        </h2>
                        <p className="mt-5 text-lg leading-8 text-slate-300">
                            En el Terminal de Jipijapa atendimos un problema eléctrico mediante
                            trabajos en el área de medición y distribución. Las fotos documentan
                            el estado previo del gabinete, el armado e instalación del tablero y
                            la organización final visible.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-5 lg:grid-cols-3">
                        {projectStages.map((stage, index) => (
                            <article key={stage.title} className="border-t-2 border-amber-400/80 pt-5">
                                <p className="text-sm font-semibold text-amber-400">ETAPA 0{index + 1}</p>
                                <h3 className="mt-3 text-lg font-semibold">{stage.title}</h3>
                                <p className="mt-3 leading-7 text-slate-300">{stage.description}</p>
                            </article>
                        ))}
                    </div>

                    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {projectPhotos.map((photo) => (
                            <figure key={photo.src} className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                                <img
                                    src={photo.src}
                                    alt={photo.alt}
                                    loading="lazy"
                                    className="h-64 w-full object-cover transition duration-300 hover:scale-[1.02]"
                                />
                                <figcaption className="px-4 py-4">
                                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                        {photo.stage}
                                    </span>
                                    <p className="mt-1 text-sm text-slate-200">{photo.caption}</p>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                    <p className="mt-5 text-sm leading-6 text-slate-400">
                        Imágenes del proyecto compartidas por Lumelex SAS. Las fotografías
                        ilustran el proceso y el resultado visible; el alcance técnico específico
                        corresponde a las condiciones y trabajos acordados para el proyecto.
                    </p>
                </div>
            </section>

            <section className="bg-amber-400">
                <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 md:grid-cols-3">
                    <div>
                        <h2 className="text-lg font-bold">Primero, escuchar</h2>
                        <p className="mt-2 leading-7 text-slate-800">
                            Entendemos el requerimiento y el contexto de la instalación.
                        </p>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Planificar con claridad</h2>
                        <p className="mt-2 leading-7 text-slate-800">
                            Acordamos el alcance, las actividades y los materiales del trabajo.
                        </p>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Dar seguimiento</h2>
                        <p className="mt-2 leading-7 text-slate-800">
                            Mantenemos una comunicación ordenada durante cada etapa del proyecto.
                        </p>
                    </div>
                </div>
            </section>

            <footer id="contacto" className="scroll-mt-24 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                        <p className="font-semibold uppercase tracking-[0.18em] text-amber-600">
                            Hablemos de tu proyecto
                        </p>
                        <h2 className="mt-2 text-2xl font-bold">
                            Cuéntanos qué necesitas y revisemos las opciones.
                        </h2>
                        <p className="mt-3 leading-7 text-slate-600">
                            Ingresa al portal para acceder a la gestión de clientes o solicitar
                            información sobre los servicios de Lumelex.
                        </p>
                    </div>
                    <Link
                        to="/login"
                        className="inline-flex shrink-0 justify-center rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700"
                    >
                        Ir al portal
                    </Link>
                </div>
                <div className="border-t border-slate-200 px-5 py-5 text-center text-sm text-slate-500">
                    Lumelex SAS · Soluciones Eléctricas e Ingeniería
                </div>
            </footer>
        </main>
    );
}
