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
        Schema::create('scheme_join_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            // No DB-level FK to schemes — the schemes table has no primary key in this
            // database (pre-existing gap; memberships.scheme_id has the same omission),
            // so Postgres rejects a FK reference to it. Validated at the app layer instead.
            $table->unsignedBigInteger('scheme_id');
            $table->timestamp('terms_accepted_at');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->foreignId('converted_membership_id')->nullable()->constrained('memberships')->onDelete('set null');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index('customer_id');
            $table->index('scheme_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scheme_join_requests');
    }
};
