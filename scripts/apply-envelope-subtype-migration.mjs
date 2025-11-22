import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Missing DATABASE_URL environment variable');
  console.log('\nPlease run this migration manually in your Supabase SQL editor:');
  console.log('Navigate to: https://supabase.com/dashboard/project/_/sql');
  console.log('\nPaste the following SQL:\n');
  console.log('-- Add subtype column');
  console.log('alter table public.envelopes add column if not exists subtype text');
  console.log('  check (subtype in (\'bill\', \'spending\', \'savings\', \'goal\')) default \'bill\';');
  console.log('\ncreate index if not exists idx_envelopes_subtype on public.envelopes(subtype);');
  console.log('\ncomment on column public.envelopes.subtype is \'Subtype classification: bill (recurring expense), spending (flexible budget), savings (accumulation), goal (targeted savings)\';');
  console.log('\n-- Migrate existing data');
  console.log('update public.envelopes set subtype = case');
  console.log('  when lower(name) like \'%surplus%\' or lower(name) like \'%emergency%\' or lower(name) like \'%savings%\' then \'savings\'');
  console.log('  when lower(name) like \'%groceries%\' or lower(name) like \'%entertainment%\' then \'spending\'');
  console.log('  else \'bill\'');
  console.log('end where subtype is null;');

  process.exit(0);
}

const client = new pg.Client({ connectionString });

async function applyMigration() {
  console.log('Applying envelope subtype migration...');

  try {
    await client.connect();

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'envelopes'
        AND column_name = 'subtype'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Subtype column already exists - migration already applied');
      await client.end();
      process.exit(0);
      return;
    }

    // Add column
    await client.query(`
      ALTER TABLE public.envelopes
      ADD COLUMN IF NOT EXISTS subtype TEXT
        CHECK (subtype IN ('bill', 'spending', 'savings', 'goal'))
        DEFAULT 'bill'
    `);

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_envelopes_subtype ON public.envelopes(subtype)
    `);

    // Add comment
    await client.query(`
      COMMENT ON COLUMN public.envelopes.subtype IS
        'Subtype classification: bill (recurring expense), spending (flexible budget), savings (accumulation), goal (targeted savings)'
    `);

    // Migrate existing data
    await client.query(`
      UPDATE public.envelopes
      SET subtype = CASE
        WHEN LOWER(name) LIKE '%surplus%' OR LOWER(name) LIKE '%emergency%' OR LOWER(name) LIKE '%savings%' THEN 'savings'
        WHEN LOWER(name) LIKE '%groceries%' OR LOWER(name) LIKE '%entertainment%' THEN 'spending'
        ELSE 'bill'
      END
      WHERE subtype IS NULL
    `);

    console.log('✓ Migration applied successfully');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
    process.exit(1);
  }
}

applyMigration();
