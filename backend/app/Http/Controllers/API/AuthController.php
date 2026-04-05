<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $req)
    {
        $user = User::create([
            'name' => $req->name,
            'mobile' => $req->mobile,
            'password' => bcrypt($req->password)
        ]);

        $user->assignRole('customer');

        Customer::create([
            'user_id' => $user->id,
            'mobile' => $user->mobile,
            'name' => $user->name
        ]);

        return ['message'=>'Registered'];
    }

    public function login(Request $req)
    {
        $user = User::where('mobile',$req->mobile)->first();

        if(!$user || !Hash::check($req->password,$user->password)){
            return response()->json(['error'=>'Invalid'],401);
        }

        return [
            'token'=>$user->createToken('api')->plainTextToken,
            'user'=>$user
        ];
    }
}
