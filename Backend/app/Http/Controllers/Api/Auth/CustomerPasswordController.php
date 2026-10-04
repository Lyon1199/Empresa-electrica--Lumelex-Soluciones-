<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class CustomerPasswordController extends Controller
{
    public function update(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(10)->letters()->numbers()],
        ]);

        $user = $request->user();
        $user->password = Hash::make($data['password']);
        $user->must_change_password = false;
        $user->save();
        $user->refresh();

        if ($request->hasSession()) {
            $request->session()->put(
                'password_hash_web',
                Auth::guard('web')->hashPasswordForCookie($user->getAuthPassword())
            );
        }
        Auth::guard('web')->setUser($user);

        return response()->json([
            'message' => 'Contraseña actualizada correctamente.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles()->where('active', true)->pluck('slug'),
                'must_change_password' => false,
            ],
        ]);
    }
}
