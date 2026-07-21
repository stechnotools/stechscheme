<?php

use App\Models\Membership;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('memberships', function (Blueprint $table) {
            $table->json('scheme_snapshot')->nullable()->after('status');
        });

        // Best-effort backfill: existing memberships never had their scheme
        // terms locked in, so we snapshot whatever the scheme currently says.
        // This can't recover the *original* terms for memberships whose
        // scheme was already edited before this migration ran, but it stops
        // any further drift going forward.
        Membership::query()
            ->whereNull('scheme_snapshot')
            ->with('scheme')
            ->chunkById(200, function ($memberships) {
                foreach ($memberships as $membership) {
                    if (! $membership->scheme) {
                        continue;
                    }

                    $membership->update([
                        'scheme_snapshot' => $membership->scheme->only(Membership::SCHEME_SNAPSHOT_FIELDS),
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('memberships', function (Blueprint $table) {
            $table->dropColumn('scheme_snapshot');
        });
    }
};
