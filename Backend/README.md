<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework. You can also check out [Laravel Learn](https://laravel.com/learn), where you will be guided through building a modern Laravel application.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

## Órdenes de trabajo y reportes diarios

Las órdenes de trabajo se crean junto con los proyectos (una OT por proyecto); no se crean OTs sueltas. Ejecuta `php artisan migrate` para instalar asignaciones, reportes diarios y avances fotográficos. Las rutas requieren autenticación Sanctum.

| Ruta | Acceso | Uso |
| --- | --- | --- |
| `GET /api/work-orders` | admin, gerente, contabilidad, supervisor | Lista paginada; acepta `search`, `status` y `worker_id`. Cada OT incluye proyecto, cliente, cotización, técnicos, líderes y `latest_reports`. |
| `GET /api/work-orders/{id}` | admin, gerente, contabilidad, supervisor | Detalle de OT con reportes y fecha/hora de envío. |
| `PUT /api/work-orders/{id}` | admin, gerente, supervisor | Actualiza `status`, `description` y/o `worker_ids` (la lista reemplaza todas las asignaciones). Estados: `pending`, `in_progress`, `on_hold`, `completed`, `cancelled`. |
| `GET /api/workers` | admin, gerente, contabilidad, supervisor | Consulta las cuentas de técnicos y líderes de proyecto. |
| `POST /api/workers` | admin, gerente, supervisor | Crea una cuenta (`name`, `email`, cédula ecuatoriana de 10 dígitos; `phone` opcional) con `role=tecnico` o `role=lider_proyecto`. La contraseña inicial es la cédula. |
| `PUT /api/workers/{id}` | admin, gerente, supervisor | Actualiza nombre, correo, cédula, teléfono o rol. Cambiar la cédula también cambia la contraseña. |
| `GET /api/worker/work-orders` | técnico, líder de proyecto | OTs activas asignadas a la cuenta autenticada. Los líderes también reciben el progreso del proyecto y sus avances. |
| `GET /api/worker/daily-reports?month=YYYY-MM` | técnico, líder de proyecto | Reportes propios del mes; si se omite el mes, usa el actual. |
| `POST /api/worker/daily-reports` | técnico, líder de proyecto | Envía `work_order_id`, `report_date` (hoy), `work_done` y `location`; acepta además `hours_worked`, `start_time`, `end_time`, `materials_used`, `issues` y `notes`. El nombre y `submitted_at` se establecen desde la cuenta/servidor. Una persona solo puede enviar un reporte por OT y fecha, y la OT debe estar activa y asignada. |
| `POST /api/worker/projects/{id}/updates` | líder de proyecto | Publica título, descripción, progreso (0–100), visibilidad para el cliente y hasta 8 fotos JPG/PNG/WEBP de máximo 10 MB por foto. |
| `GET /api/worker/project-update-photos/{id}` | usuario autenticado autorizado | Sirve la foto privada para el líder asignado, administración/supervisión o el cliente del proyecto si el avance es visible para él. |
| `GET /api/daily-reports?month=YYYY-MM&worker_id=&work_order_id=` | admin, gerente, contabilidad, supervisor | Reportes con trabajador, OT, proyecto y `submitted_at`; incluye `summary.submitted`, `summary.overdue`, `summary.workers` y `summary.overdue_days`. |
| `GET /api/daily-reports/overview?month=YYYY-MM&worker_id=&work_order_id=` | admin, gerente, contabilidad, supervisor | Totales y horas reportadas agrupadas por trabajador y OT, además del resumen de atrasos. |
| `GET /api/daily-reports/export?month=YYYY-MM&worker_id=` | admin, gerente, contabilidad, supervisor | Descarga CSV mensual por trabajador. |

Un día sin reporte cuenta como atraso por cada día calendario transcurrido del mes para cada técnico o líder asignado a una OT `pending` o `in_progress`; el día actual también cuenta. Las OTs pausadas, completadas o canceladas no generan nuevos atrasos. Las descargas y reportes administrativos no están disponibles para trabajadores ni clientes. Los conteos del dashboard se almacenan en caché durante 15 segundos para acelerar la navegación.

## Finanzas internas — primera fase

El módulo inicial registra cuentas por cobrar, cuentas por pagar y gastos, con vencimiento opcional, categoría, cliente/proveedor como referencia libre y relación opcional con un proyecto. Cada movimiento se registra como pendiente y puede marcarse pagado (indicando el medio de pago) o anularse. Los movimientos pagados y anulados no se pueden modificar mediante el flujo normal; no se eliminan para conservar su trazabilidad básica.

| Ruta | Acceso | Uso |
| --- | --- | --- |
| `GET /api/finance/summary` | admin, gerente, contabilidad | Saldos pendientes por cobrar/pagar y totales cobrados/pagados en el mes actual. |
| `GET /api/finance/transactions?type=&status=&page=` | admin, gerente, contabilidad | Lista paginada (50 por página); tipos: `receivable`, `payable`, `expense`; estados: `pending`, `paid`, `cancelled`. |
| `POST /api/finance/transactions` | admin, gerente, contabilidad | Registra tipo, descripción, categoría, valor, fecha, vencimiento opcional y proyecto opcional. |
| `PATCH /api/finance/transactions/{id}/status` | admin, gerente, contabilidad | Marca un pendiente como `paid` (requiere `payment_method`: `cash`, `bank_transfer`, `card` u `other`) o `cancelled`. |

Esta primera fase es un registro financiero interno: no constituye un libro contable ni emite comprobantes tributarios. No integra firma electrónica, XML/RIDE ni servicios del SRI, y no crea todavía proveedores, conciliación bancaria, pagos parciales o reversos contables. La integración tributaria y la importación de XML deben implementarse aparte, con validaciones y requisitos oficiales correspondientes. Los reportes diarios de trabajadores son un módulo separado y se mantienen sin cambios.

## Envío de cotizaciones por correo

| Ruta | Acceso | Uso |
| --- | --- | --- |
| `POST /api/quotations/{id}/send` | admin, gerente, contabilidad | Recibe un `pdf` multipart y lo envía como adjunto al correo guardado en la cotización. Registra `sent` y `sent_at` solo si el transporte acepta el envío. |
| `GET /api/admin/mail-settings` | admin | Consulta host, puerto y remitente; nunca devuelve la contraseña SMTP. |
| `PUT /api/admin/mail-settings` | admin | Guarda la configuración SMTP. La contraseña se cifra con la clave de Laravel; omitirla conserva la contraseña ya guardada. |
| `POST /api/admin/mail-settings/test` | admin | Envía un mensaje de prueba al campo `to`. |

La configuración se administra en **Administración → Correo saliente**; los datos se almacenan en la base de datos y la contraseña SMTP queda cifrada con `APP_KEY`. Guarda los datos y usa **Enviar prueba** antes de enviar una cotización. El `.env` de producción debe tener un `APP_KEY` estable: rotarlo sin volver a guardar la configuración impedirá descifrar la contraseña SMTP.

Usa credenciales SMTP de aplicación. Gmail requiere contraseña de aplicación y verificación en dos pasos; Microsoft 365 y otros proveedores tienen sus propios hosts/puertos. El estado confirma que el servidor de correo aceptó el mensaje, no que haya llegado a la bandeja ni que el destinatario lo haya leído. La cotización debe tener un correo asociado antes de enviarse.

## Importación de cotizaciones

Las hojas de cálculo con columnas de cantidad, unidad, descripción y precio unitario se leen por columnas, no extrayendo todos los números del texto. Si el libro tiene varias hojas de cotización, la interfaz permite escoger la revisión correcta y solo importa esa hoja. Las filas de IVA/impuestos, subtotal y total se excluyen; el ERP calcula el IVA con su propia tasa y no agrega la línea fiscal importada como partida. Las filas explícitas de mano de obra también se excluyen del detalle para el cliente y deben registrarse en **Costos internos de mano de obra**. Los servicios ofertados que incluyen instalación o montaje en la descripción siguen siendo partidas de servicio visibles para el cliente.

## Imágenes de inventario

Los productos admiten una foto JPG, PNG o WEBP de máximo 5 MB y 3000 × 3000 píxeles. Solo administración, gerencia y bodega pueden cargar o quitar imágenes; el archivo se conserva en `storage/app/public/inventory-products` y se expone mediante `public/storage`.

| Ruta | Acceso | Uso |
| --- | --- | --- |
| `POST /api/inventory-products/{id}/image` | admin, gerente, bodega | Sube una imagen multipart en el campo `image` y reemplaza la anterior. |
| `DELETE /api/inventory-products/{id}/image` | admin, gerente, bodega | Quita la foto del producto. |

La respuesta de producto incluye `image_url`. Tras desplegar el backend, verifica que exista el enlace público ejecutando `php artisan storage:link`. Los productos del catálogo que no tengan una foto cargada muestran una ilustración vectorial de referencia generada localmente; esta ilustración no sustituye la foto del producto real.
