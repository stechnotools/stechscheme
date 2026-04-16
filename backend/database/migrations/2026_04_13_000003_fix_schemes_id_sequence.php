<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("
            WITH base AS (
                SELECT COALESCE(MAX(id), 0) AS max_id
                FROM schemes
                WHERE id IS NOT NULL
            ),
            numbered AS (
                SELECT
                    s.ctid,
                    (SELECT max_id FROM base) + ROW_NUMBER() OVER (
                        ORDER BY s.created_at NULLS LAST, s.code, s.name, s.ctid
                    ) AS new_id
                FROM schemes s
                WHERE s.id IS NULL
            )
            UPDATE schemes AS s
            SET id = numbered.new_id
            FROM numbered
            WHERE s.ctid = numbered.ctid
        ");

        DB::statement('CREATE SEQUENCE IF NOT EXISTS schemes_id_seq');
        DB::statement("ALTER TABLE schemes ALTER COLUMN id SET DEFAULT nextval('schemes_id_seq')");
        DB::statement("ALTER SEQUENCE schemes_id_seq OWNED BY schemes.id");
        DB::statement('ALTER TABLE schemes ALTER COLUMN id SET NOT NULL');
        DB::statement("SELECT setval('schemes_id_seq', COALESCE((SELECT MAX(id) FROM schemes), 0) + 1, false)");
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE schemes ALTER COLUMN id DROP DEFAULT');
    }
};
