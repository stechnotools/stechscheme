<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Audit trail for CustomerMergeService::merge() — records exactly what
     * moved so a wrong merge can be reversed via undo(). One row per merge
     * operation (a group merge of N duplicates into one primary produces N
     * rows, one per duplicate absorbed).
     */
    public function up(): void
    {
        Schema::create('customer_merges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('primary_customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('duplicate_customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('merged_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reversed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reversed_at')->nullable();

            // Snapshot of the duplicate at merge time — kept even if the
            // duplicate row is later force-deleted for good.
            $table->string('duplicate_name')->nullable();
            $table->string('duplicate_mobile')->nullable();

            // [{table: 'memberships', id: 12}, ...] — every row whose
            // customer_id moved from duplicate to primary, so undo() can
            // move back exactly (and only) those rows.
            $table->json('moved_records');

            // {field: previous_value_on_primary_before_backfill, ...} for
            // KYC fields copied from the duplicate's KYC into the primary's
            // because the primary's was blank — undo() reverts just these.
            $table->json('kyc_backfilled_fields')->nullable();

            // True when the primary had no KYC at all and the duplicate's
            // KYC row was reassigned to it wholesale (undo re-detaches it).
            $table->boolean('kyc_reassigned')->default(false);

            // The duplicate's original customer_kycs.id — set whenever this
            // merge touched a KYC row (reassigned or soft-deleted after
            // backfill), so undo() knows exactly which row to restore/detach
            // without guessing from the primary's current KYC relation.
            $table->unsignedBigInteger('duplicate_kyc_id')->nullable();

            // True when the duplicate's mobile was written into
            // primary.alternate_mobile during this merge (undo clears it).
            $table->boolean('alternate_mobile_set')->default(false);

            $table->timestamps();

            $table->index(['primary_customer_id']);
            $table->index(['duplicate_customer_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_merges');
    }
};
