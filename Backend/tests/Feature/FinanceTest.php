<?php

namespace Tests\Feature;

use App\Models\FinancialTransaction;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_register_a_financial_transaction_and_mark_it_paid(): void
    {
        $this->actingAs($this->createStaff());

        $response = $this->postJson('/api/finance/transactions', [
            'type' => 'receivable',
            'description' => 'Instalación eléctrica',
            'category' => 'Ventas',
            'counterparty' => 'Cliente de prueba',
            'amount' => 1150,
            'issue_date' => '2026-10-01',
            'due_date' => '2026-10-30',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $id = $response->json('data.id');

        $this->patchJson("/api/finance/transactions/{$id}/status", [
            'status' => 'paid',
            'payment_method' => 'bank_transfer',
        ])->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.payment_method', 'bank_transfer');

        $this->getJson('/api/finance/summary')
            ->assertOk()
            ->assertJsonPath('data.receivables_pending', 0);
    }

    public function test_financial_transactions_require_valid_data_and_payment_method(): void
    {
        $this->actingAs($this->createStaff());

        $this->postJson('/api/finance/transactions', [
            'type' => 'invoice',
            'description' => '',
            'category' => '',
            'amount' => -1,
            'issue_date' => 'not-a-date',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['type', 'description', 'category', 'amount', 'issue_date']);

        $transaction = FinancialTransaction::create([
            'type' => 'expense',
            'description' => 'Compra de materiales',
            'category' => 'Materiales',
            'amount' => 80,
            'issue_date' => '2026-10-01',
            'status' => 'pending',
        ]);

        $this->patchJson("/api/finance/transactions/{$transaction->id}/status", [
            'status' => 'paid',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('payment_method');
    }

    public function test_paid_movements_cannot_be_cancelled_or_paid_twice(): void
    {
        $this->actingAs($this->createStaff());
        $transaction = FinancialTransaction::create([
            'type' => 'expense',
            'description' => 'Compra',
            'category' => 'Materiales',
            'amount' => 20,
            'issue_date' => '2026-10-01',
            'status' => 'paid',
            'payment_method' => 'cash',
            'paid_at' => now(),
        ]);

        $this->patchJson("/api/finance/transactions/{$transaction->id}/status", [
            'status' => 'cancelled',
        ])->assertUnprocessable();

        $this->getJson('/api/finance/summary')
            ->assertOk()
            ->assertJsonPath('data.paid_out_this_month', 20);
    }

    private function createStaff(): User
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(
            ['slug' => 'contabilidad'],
            ['name' => 'Contabilidad', 'active' => true]
        );
        $user->roles()->syncWithoutDetaching([$role->id]);

        return $user;
    }
}
