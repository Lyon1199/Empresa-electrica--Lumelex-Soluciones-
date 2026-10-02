<?php

use App\Http\Controllers\Api\Admin\CustomerController;
use App\Http\Controllers\Api\Admin\DailyReportController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\DepositReceiptController;
use App\Http\Controllers\Api\Admin\FinanceController;
use App\Http\Controllers\Api\Admin\InventoryProductController;
use App\Http\Controllers\Api\Admin\MailSettingsController;
use App\Http\Controllers\Api\Admin\ProjectController;
use App\Http\Controllers\Api\Admin\ProjectMaterialController;
use App\Http\Controllers\Api\Admin\QuotationController;
use App\Http\Controllers\Api\Admin\WorkerController;
use App\Http\Controllers\Api\Admin\WorkOrderController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\Auth\CustomerPasswordController;
use App\Http\Controllers\Api\Customer\CustomerProjectController;
use App\Http\Controllers\Api\Worker\DailyReportController as WorkerDailyReportController;
use App\Http\Controllers\Api\Worker\ProjectUpdateController;
use App\Http\Controllers\Api\Worker\WorkOrderController as WorkerWorkOrderController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| HEALTH
|--------------------------------------------------------------------------
*/

Route::get('/health', function () {

    return response()->json([
        'status' => 'ok',
        'message' => 'Lumelex API is running',
        'timestamp' => now(),
    ]);

});

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

Route::post('/login', function (Request $request) {

    $credentials = $request->validate([

        'email' => [
            'bail',
            'required',
            'string',
            'max:254',
            'email:rfc',
        ],

        'password' => [
            'required',
            'string',
        ],

    ]);

    $guard = Auth::guard('web');

    if (! $guard->attempt($credentials)) {

        return response()->json([
            'message' => 'Las credenciales son incorrectas.',
        ], 401);

    }

    $request->session()->regenerate();

    $user = $guard->user();
    if (! ($user instanceof User)) {
        $guard->logout();

        return response()->json([
            'message' => 'No se pudo cargar el usuario autenticado.',
        ], 401);
    }

    $user->load(['roles.permissions']);

    return response()->json([

        'message' => 'Inicio de sesión exitoso.',

        'user' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->where('active', true)->pluck('slug')->values(),
            'customer_id' => $user->customer_id,
            'must_change_password' => $user->must_change_password,
        ],

    ]);

})->middleware('throttle:5,1');

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
|
| IMPORTANTE:
| Se utiliza explícitamente el guard WEB porque Sanctum
| para SPA utiliza autenticación mediante sesión/cookies.
|
|--------------------------------------------------------------------------
*/

Route::post('/logout', function (Request $request) {

    Auth::guard('web')->logout();

    if ($request->hasSession()) {

        $request->session()->invalidate();

        $request->session()->regenerateToken();

    }

    return response()->json([

        'message' => 'Sesión cerrada correctamente.',

    ]);

})->middleware('auth:web');

/*
|--------------------------------------------------------------------------
| RUTAS AUTENTICADAS
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/user', function (Request $request) {
        $user = $request->user();

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles()->where('active', true)->pluck('slug'),
                'customer_id' => $user->customer_id,
                'must_change_password' => $user->must_change_password,
            ],
        ]);
    });

    Route::middleware('role:cliente')->group(function () {
        Route::put('/customer/password', [CustomerPasswordController::class, 'update']);
    });

    Route::middleware('role:tecnico,lider_proyecto')->prefix('worker')->group(function () {
        Route::get('/work-orders', [WorkerWorkOrderController::class, 'index']);
        Route::get('/daily-reports', [WorkerDailyReportController::class, 'index']);
        Route::post('/daily-reports', [WorkerDailyReportController::class, 'store']);
        Route::post('/projects/{project}/updates', [ProjectUpdateController::class, 'store'])
            ->middleware('role:lider_proyecto');
    });

    Route::middleware('role:admin,gerente,contabilidad,supervisor,cliente,tecnico,lider_proyecto')
        ->get('/worker/project-update-photos/{photo}', [ProjectUpdateController::class, 'photo']);

    /*
    |--------------------------------------------------------------------------
    | CLIENTES
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | PORTAL DEL CLIENTE
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:cliente')->prefix('customer')->group(function () {
        Route::get('/projects', [CustomerProjectController::class, 'index']);
        Route::get('/projects/{project}', [CustomerProjectController::class, 'show']);
        Route::post('/projects/{project}/deposit-receipts', [DepositReceiptController::class, 'store']);
        Route::get('/deposit-receipts/{receipt}/download', [DepositReceiptController::class, 'download']);
    });

    /*
    |--------------------------------------------------------------------------
    | ADMINISTRACIÓN Y CONTABILIDAD
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:admin,gerente,contabilidad')->group(function () {
        Route::get('/finance/summary', [FinanceController::class, 'summary']);
        Route::get('/finance/transactions', [FinanceController::class, 'index']);
        Route::post('/finance/transactions', [FinanceController::class, 'store']);
        Route::patch('/finance/transactions/{transaction}/status', [FinanceController::class, 'updateStatus']);

        Route::apiResource(
            'customers',
            CustomerController::class
        );

        Route::apiResource(
            'quotations',
            QuotationController::class
        );
        Route::post('/quotations/{quotation}/send', [QuotationController::class, 'send']);
        Route::post('/quotations/{quotation}/clone', [
            QuotationController::class,
            'clone',
        ]);

        Route::get('/projects', [ProjectController::class, 'index']);
        Route::get('/projects/{project}', [ProjectController::class, 'show']);
        Route::put('/projects/{project}', [ProjectController::class, 'update']);
        Route::get('/projects/{project}/materials', [ProjectMaterialController::class, 'index']);
        Route::post('/projects/{project}/materials', [ProjectMaterialController::class, 'store']);
        Route::put('/projects/{project}/materials/{material}', [ProjectMaterialController::class, 'update']);
        Route::delete('/projects/{project}/materials/{material}', [ProjectMaterialController::class, 'destroy']);

        Route::get('/deposit-receipts', [DepositReceiptController::class, 'index']);
        Route::get('/deposit-receipts/{receipt}/download', [DepositReceiptController::class, 'download']);
        Route::put('/deposit-receipts/{receipt}/review', [DepositReceiptController::class, 'review']);

    });

    Route::middleware('role:admin')->prefix('admin/mail-settings')->group(function () {
        Route::get('/', [MailSettingsController::class, 'show']);
        Route::put('/', [MailSettingsController::class, 'update']);
        Route::post('/test', [MailSettingsController::class, 'test']);
        Route::put('/microsoft/app', [MailSettingsController::class, 'updateMicrosoftApp']);
        Route::post('/microsoft/connect', [MailSettingsController::class, 'connectMicrosoft']);
        Route::put('/microsoft/activate', [MailSettingsController::class, 'useMicrosoft']);
    });

    Route::middleware('role:admin')->prefix('admin/users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::put('/{user}/role', [UserController::class, 'updateRole']);
    });

    Route::middleware('role:admin,gerente,contabilidad,supervisor')->group(function () {
        Route::get('/admin/dashboard', [DashboardController::class, 'index']);
        Route::get('/work-orders', [WorkOrderController::class, 'index']);
        Route::get('/work-orders/{workOrder}', [WorkOrderController::class, 'show']);
        Route::get('/daily-reports', [DailyReportController::class, 'index']);
        Route::get('/daily-reports/overview', [DailyReportController::class, 'overview']);
        Route::get('/daily-reports/export', [DailyReportController::class, 'export']);
        Route::get('/workers', [WorkerController::class, 'index']);
        Route::post('/worker-payroll-payments', [DailyReportController::class, 'storePayment']);
    });

    Route::middleware('role:admin,gerente,supervisor')->group(function () {
        Route::put('/work-orders/{workOrder}', [WorkOrderController::class, 'update']);
        Route::post('/workers', [WorkerController::class, 'store']);
        Route::put('/workers/{worker}', [WorkerController::class, 'update']);
    });

    Route::middleware('role:admin,gerente,contabilidad,supervisor')->put(
        '/workers/{worker}/daily-rate',
        [WorkerController::class, 'updateDailyRate']
    );

    Route::middleware('role:admin,gerente,bodega')->group(function () {
        Route::post('/inventory-products/{inventory_product}/image', [
            InventoryProductController::class,
            'uploadImage',
        ]);
        Route::delete('/inventory-products/{inventory_product}/image', [
            InventoryProductController::class,
            'deleteImage',
        ]);
        Route::get('/inventory-products/low-stock', [
            InventoryProductController::class,
            'lowStock',
        ]);
        Route::post('/inventory-products/{inventory_product}/adjustments', [
            InventoryProductController::class,
            'adjust',
        ]);
        Route::apiResource('inventory-products', InventoryProductController::class);
    });

});
