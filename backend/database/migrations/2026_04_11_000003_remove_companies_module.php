<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'company_id')) {
                DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_company_id_foreign');
                $table->dropColumn('company_id');
            }
        });

        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'company_id')) {
                DB::statement('ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_company_id_foreign');
                $table->dropColumn('company_id');
            }
        });

        Schema::table('schemes', function (Blueprint $table) {
            if (Schema::hasColumn('schemes', 'company_id')) {
                DB::statement('ALTER TABLE schemes DROP CONSTRAINT IF EXISTS schemes_company_id_foreign');
                $table->dropColumn('company_id');
            }
        });

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'company_id')) {
                DB::statement('ALTER TABLE products DROP CONSTRAINT IF EXISTS products_company_id_foreign');
                $table->dropColumn('company_id');
            }
        });

        Schema::table('chart_of_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('chart_of_accounts', 'company_id')) {
                DB::statement('ALTER TABLE chart_of_accounts DROP CONSTRAINT IF EXISTS chart_of_accounts_company_id_foreign');
                DB::statement('DROP INDEX IF EXISTS chart_of_accounts_company_id_account_type_index');
                DB::statement('DROP INDEX IF EXISTS chart_of_accounts_company_id_parent_id_index');
                $table->dropColumn('company_id');
                $table->index(['account_type']);
            }
        });

        Schema::table('app_settings', function (Blueprint $table) {
            if (Schema::hasColumn('app_settings', 'company_id')) {
                DB::statement('ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_company_id_foreign');
                DB::statement('ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_company_id_key_unique');
                $table->dropColumn('company_id');
                $table->unique('key');
            }
        });

        Schema::dropIfExists('companies');
    }

    public function down(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('logo')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        Schema::table('schemes', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->dropIndex(['account_type']);
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->index(['company_id', 'account_type']);
            $table->index(['company_id', 'parent_id']);
        });

        Schema::table('app_settings', function (Blueprint $table) {
            $table->dropUnique(['key']);
            $table->foreignId('company_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->unique(['company_id', 'key']);
        });
    }
};
