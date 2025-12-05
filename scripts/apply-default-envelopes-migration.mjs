import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Missing DATABASE_URL environment variable');
  console.log('\nPlease run this migration manually in your Supabase SQL editor:');
  console.log('Navigate to: https://supabase.com/dashboard/project/_/sql');
  console.log('\nPaste the SQL from: supabase/migrations/0023_auto_create_default_envelopes.sql');
  process.exit(0);
}

const client = new pg.Client({ connectionString });

async function applyMigration() {
  console.log('Applying default envelopes migration...');

  try {
    await client.connect();

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'envelopes'
        AND column_name = 'is_system_envelope'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ is_system_envelope column already exists - checking for backfill...');

      // Check if default envelopes exist for all users
      const { rows: usersMissingEnvelopes } = await client.query(`
        SELECT p.id
        FROM public.profiles p
        WHERE NOT EXISTS (
          SELECT 1 FROM public.envelopes e
          WHERE e.user_id = p.id
          AND e.name = 'Surplus'
          AND e.is_system_envelope = true
        )
        OR NOT EXISTS (
          SELECT 1 FROM public.envelopes e
          WHERE e.user_id = p.id
          AND e.name = 'Credit Card Holding'
          AND e.is_system_envelope = true
        )
      `);

      if (usersMissingEnvelopes.length > 0) {
        console.log(`Found ${usersMissingEnvelopes.length} users missing default envelopes, backfilling...`);

        for (const user of usersMissingEnvelopes) {
          // Check and create Surplus
          const { rows: surplusCheck } = await client.query(`
            SELECT 1 FROM public.envelopes
            WHERE user_id = $1 AND name = 'Surplus' AND is_system_envelope = true
          `, [user.id]);

          if (surplusCheck.length === 0) {
            await client.query(`
              INSERT INTO public.envelopes (user_id, name, subtype, icon, is_system_envelope, notes, target_amount, current_amount)
              VALUES ($1, 'Surplus', 'savings', '💰', true, 'Auto-allocated unallocated funds from your budget', 0, 0)
            `, [user.id]);
            console.log(`  ✓ Created Surplus envelope for user ${user.id}`);
          }

          // Check and create Credit Card Holding
          const { rows: ccCheck } = await client.query(`
            SELECT 1 FROM public.envelopes
            WHERE user_id = $1 AND name = 'Credit Card Holding' AND is_system_envelope = true
          `, [user.id]);

          if (ccCheck.length === 0) {
            await client.query(`
              INSERT INTO public.envelopes (user_id, name, subtype, icon, is_system_envelope, notes, target_amount, current_amount)
              VALUES ($1, 'Credit Card Holding', 'savings', '💳', true, 'Holding funds for credit card payments', 0, 0)
            `, [user.id]);
            console.log(`  ✓ Created Credit Card Holding envelope for user ${user.id}`);
          }
        }
      } else {
        console.log('✓ All users have default envelopes');
      }

      await client.end();
      process.exit(0);
      return;
    }

    console.log('Adding is_system_envelope column...');

    // Add column
    await client.query(`
      ALTER TABLE public.envelopes
      ADD COLUMN IF NOT EXISTS is_system_envelope BOOLEAN DEFAULT FALSE
    `);

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_envelopes_is_system ON public.envelopes(is_system_envelope)
    `);

    // Add comment
    await client.query(`
      COMMENT ON COLUMN public.envelopes.is_system_envelope IS
        'Indicates whether this is a system-managed envelope (Surplus, Credit Card Holding, etc.)'
    `);

    console.log('✓ Column and index created');

    // Create function
    console.log('Creating trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION create_default_envelopes()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Create Surplus envelope
        INSERT INTO public.envelopes (
          user_id, name, subtype, icon, is_system_envelope, notes, target_amount, current_amount
        ) VALUES (
          NEW.id, 'Surplus', 'savings', '💰', TRUE,
          'Auto-allocated unallocated funds from your budget', 0, 0
        );

        -- Create Credit Card Holding envelope
        INSERT INTO public.envelopes (
          user_id, name, subtype, icon, is_system_envelope, notes, target_amount, current_amount
        ) VALUES (
          NEW.id, 'Credit Card Holding', 'savings', '💳', TRUE,
          'Holding funds for credit card payments', 0, 0
        );

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER
    `);

    // Create trigger
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_create_default_envelopes ON public.profiles
    `);

    await client.query(`
      CREATE TRIGGER trigger_create_default_envelopes
        AFTER INSERT ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION create_default_envelopes()
    `);

    console.log('✓ Trigger created');

    // Backfill existing users
    console.log('Backfilling existing users...');

    const { rows: allProfiles } = await client.query(`
      SELECT id FROM public.profiles
    `);

    for (const profile of allProfiles) {
      // Check and create Surplus
      const { rows: surplusCheck } = await client.query(`
        SELECT 1 FROM public.envelopes
        WHERE user_id = $1 AND name = 'Surplus' AND is_system_envelope = true
      `, [profile.id]);

      if (surplusCheck.length === 0) {
        await client.query(`
          INSERT INTO public.envelopes (user_id, name, subtype, icon, is_system_envelope, notes, target_amount, current_amount)
          VALUES ($1, 'Surplus', 'savings', '💰', true, 'Auto-allocated unallocated funds from your budget', 0, 0)
        `, [profile.id]);
        console.log(`  ✓ Created Surplus envelope for user ${profile.id}`);
      }

      // Check and create Credit Card Holding
      const { rows: ccCheck } = await client.query(`
        SELECT 1 FROM public.envelopes
        WHERE user_id = $1 AND name = 'Credit Card Holding' AND is_system_envelope = true
      `, [profile.id]);

      if (ccCheck.length === 0) {
        await client.query(`
          INSERT INTO public.envelopes (user_id, name, subtype, icon, is_system_envelope, notes, target_amount, current_amount)
          VALUES ($1, 'Credit Card Holding', 'savings', '💳', true, 'Holding funds for credit card payments', 0, 0)
        `, [profile.id]);
        console.log(`  ✓ Created Credit Card Holding envelope for user ${profile.id}`);
      }
    }

    // Mark existing envelopes with these names as system envelopes
    await client.query(`
      UPDATE public.envelopes
      SET is_system_envelope = TRUE
      WHERE (name = 'Surplus' OR name = 'Credit Card Holding')
        AND is_system_envelope = FALSE
    `);

    console.log('✓ Migration applied successfully');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err);
    await client.end();
    process.exit(1);
  }
}

applyMigration();
