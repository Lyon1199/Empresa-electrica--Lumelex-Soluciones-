import { Link } from "react-router-dom";
import lumelexLogo from "../../assets/lumelex-logo.png";

const services = [
    {
        title: "Ingeniería eléctrica",
        description: "Asesoría y soluciones técnicas para las necesidades de cada proyecto.",
    },
    {
        title: "Instalaciones y mantenimiento",
        description: "Planificación y atención de trabajos eléctricos con enfoque en seguridad.",
    },
    {
        title: "Gestión de proyectos",
        description: "Seguimiento de actividades, materiales y avances durante cada trabajo.",
    },
];

export default function About() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
            <header className="border-b border-slate-200 bg-white">
                <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <Link to="/nosotros" aria-label="Lumelex, inicio">
                        <img src={lumelexLogo} alt="Lumelex SAS" className="h-14 w-14 object-contain" />
                    </Link>
                    <Link
                        to="/login"
                        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                        Acceso de clientes
                    </Link>
                </nav>
            </header>

            <section className="bg-slate-900 px-6 py-20 text-white sm:py-28">
                <div className="mx-auto max-w-6xl">
                    <p className="font-semibold uppercase tracking-[0.2em] text-amber-400">
                        Lumelex SAS
                    </p>
                    <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
                        Soluciones eléctricas e ingeniería para tus proyectos.
                    </h1>
                    <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
                        Acompañamos a nuestros clientes con planificación, ejecución y seguimiento
                        de proyectos eléctricos, priorizando la calidad y la seguridad.
                    </p>
                    <Link
                        to="/login"
                        className="mt-9 inline-flex rounded-lg bg-amber-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-amber-300"
                    >
                        Ingresar al portal
                    </Link>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20" id="servicios">
                <div className="max-w-2xl">
                    <p className="font-semibold uppercase tracking-widest text-amber-600">Qué hacemos</p>
                    <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Un equipo para acompañar tu proyecto</h2>
                    <p className="mt-4 leading-7 text-slate-600">
                        En Lumelex SAS trabajamos en soluciones eléctricas e ingeniería, desde la
                        organización del trabajo hasta el seguimiento de sus avances.
                    </p>
                </div>
                <div className="mt-10 grid gap-5 md:grid-cols-3">
                    {services.map((service) => (
                        <article key={service.title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold">{service.title}</h3>
                            <p className="mt-3 leading-6 text-slate-600">{service.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-sm text-slate-500">
                Lumelex SAS · Soluciones Eléctricas e Ingeniería
            </footer>
        </main>
    );
}
