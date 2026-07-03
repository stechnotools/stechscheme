<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The image column was a varchar(255), fine for a short "/storage/..." path
     * but too small for the base64 SVG data URIs the demo seeder now stores.
     * Widening to text keeps both real uploaded paths and inline data URIs working.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->text('image')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('image')->nullable()->change();
        });
    }
};
