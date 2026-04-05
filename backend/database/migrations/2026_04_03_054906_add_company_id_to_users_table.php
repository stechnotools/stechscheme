<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // 📱 Mobile Login
            $table->string('mobile')->unique()->nullable()->after('email');

            // 🔐 Mobile Verification
            $table->boolean('mobile_verified')->default(false)->after('mobile');
            $table->timestamp('mobile_verified_at')->nullable()->after('mobile_verified');

            // 🏢 Company (Multi-tenant)
            $table->foreignId('company_id')
                ->nullable()
                ->after('id')
                ->constrained()
                ->nullOnDelete();

            // 👤 Basic Info
            $table->string('profile_photo')->nullable()->after('password');
            $table->date('dob')->nullable();
            $table->string('gender')->nullable();

            // 📊 Status
            $table->string('status')->default('active'); // active/inactive/blocked
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {

            // drop foreign key first
            $table->dropForeign(['company_id']);

            // drop columns
            $table->dropColumn([
                'mobile',
                'mobile_verified',
                'mobile_verified_at',
                'company_id',
                'profile_photo',
                'dob',
                'gender',
                'status'
            ]);
        });
    }
};
