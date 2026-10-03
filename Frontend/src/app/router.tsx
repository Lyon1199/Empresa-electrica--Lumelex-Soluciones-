import { lazy, Suspense } from "react";
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

const Login = lazy(() => import("../pages/auth/Login"));
const Dashboard = lazy(() => import("../pages/admin/Dashboard"));
const Users = lazy(() => import("../pages/admin/Users"));
const Customers = lazy(() => import("../pages/admin/Customers/Customers"));
const Quotations = lazy(() => import("../pages/admin/Quotations/Quotations"));
const Projects = lazy(() => import("../pages/admin/Projects/Projects"));
const Inventory = lazy(() => import("../pages/admin/Inventory/Inventory"));
const WorkOrders = lazy(() => import("../pages/admin/WorkOrders"));
const Reports = lazy(() => import("../pages/admin/Reports"));
const Finance = lazy(() => import("../pages/admin/Finance"));
const MailSettings = lazy(() => import("../pages/admin/MailSettings"));
const ElectronicSignatureSettings = lazy(() => import("../pages/admin/ElectronicSignatureSettings"));
const WorkerPortal = lazy(() => import("../pages/worker/WorkerPortal"));
const CustomerPortal = lazy(() => import("../pages/customer/CustomerPortal"));
const ChangePassword = lazy(() => import("../pages/customer/ChangePassword"));

import AdminLayout from "../layouts/AdminLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

function Router() {
    return (
        <BrowserRouter>
            <Suspense fallback={
                <div className="flex min-h-screen items-center justify-center bg-slate-100" role="status">
                    <span className="text-sm text-slate-600">Cargando módulo...</span>
                </div>
            }>
              <Routes>

                {/* ==========================================
                    LOGIN
                ========================================== */}

                <Route
                    path="/login"
                    element={<Login />}
                />


                {/* ==========================================
                    TODA LA ZONA ADMINISTRATIVA PROTEGIDA
                ========================================== */}

                <Route element={<ProtectedRoute allowedRoles={["admin", "gerente", "contabilidad", "supervisor", "bodega"]} />}>
                    <Route element={<AdminLayout />}>
                        <Route element={<ProtectedRoute allowedRoles={["admin", "gerente", "contabilidad"]} />}>
                            <Route path="/admin" element={<Dashboard />} />
                            <Route path="/admin/clientes" element={<Customers />} />
                            <Route path="/admin/cotizaciones" element={<Quotations />} />
                            <Route path="/admin/proyectos" element={<Projects />} />
                            <Route path="/admin/finanzas" element={<Finance />} />
                        </Route>
                        <Route element={<ProtectedRoute allowedRoles={["admin", "gerente"]} />}>
                            <Route path="/admin/firma-electronica" element={<ElectronicSignatureSettings />} />
                        </Route>
                        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                            <Route path="/admin/correo" element={<MailSettings />} />
                            <Route path="/admin/usuarios" element={<Users />} />
                        </Route>

                        <Route element={<ProtectedRoute allowedRoles={["admin", "gerente", "contabilidad", "supervisor"]} />}>
                            <Route path="/admin/ordenes" element={<WorkOrders />} />
                            <Route path="/admin/reportes" element={<Reports />} />
                        </Route>

                        <Route element={<ProtectedRoute allowedRoles={["admin", "gerente", "bodega"]} />}>
                            <Route path="/admin/inventario" element={<Inventory />} />
                        </Route>
                    </Route>
                </Route>

                <Route element={<ProtectedRoute allowedRoles={["cliente"]} />}>
                    <Route
                        path="/cliente"
                        element={<CustomerPortal />}
                    />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={["tecnico"]} />}>
                    <Route path="/trabajador" element={<WorkerPortal />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={["lider_proyecto"]} />}>
                    <Route path="/lider/proyectos" element={<WorkerPortal />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={["cliente"]} />}>
                    <Route
                        path="/cliente/cambiar-clave"
                        element={<ChangePassword />}
                    />
                </Route>


                {/* ==========================================
                    RUTA PRINCIPAL
                ========================================== */}

                <Route
                    path="/"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />


                {/* ==========================================
                    CUALQUIER RUTA DESCONOCIDA
                ========================================== */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/login"
                            replace
                        />
                    }
                />

              </Routes>
            </Suspense>

        </BrowserRouter>
    );
}

export default Router;