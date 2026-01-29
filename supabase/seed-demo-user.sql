-- ============================================================================
-- DEMO USER SEED SCRIPT
-- My Budget Mate - Comprehensive Demo Data
-- ============================================================================
--
-- INSTRUCTIONS:
-- 1. Sign up at /signup with email: futureproperty97@gmail.com
-- 2. Confirm the email (or disable email confirmation in Supabase)
-- 3. Run this SQL in Supabase SQL Editor (Dashboard > SQL Editor)
-- 4. Refresh the app
--
-- This script populates ALL features with realistic NZ data:
-- - Profile with onboarding NOT completed (so you can view all steps)
-- - Income sources (2 incomes: salary + partner)
-- - Full envelope set from master list with categories
-- - Debt Destroyer with 3 debts (credit card, student loan, hire purchase)
-- - Leveled bills (electricity with winter peak)
-- - Celebrations with gift recipients
-- - Kids module (2 children with chores, invoices, streaks)
-- - Life features (todos, recipes, meal plans, freezer meals, shopping)
-- - Transactions (mix of approved, pending, split)
-- - Achievements unlocked
-- - Financial position (assets, liabilities, net worth snapshots)
-- - Household setup
-- - Subscription (Pro trial)
-- - User preferences
-- - Beta access
-- ============================================================================

-- ============================================
-- STEP 0: Get the user ID
-- ============================================
DO $$
DECLARE
  v_user_id UUID;
  v_demo_email TEXT := 'futureproperty97@gmail.com';

  -- Category IDs
  v_cat_my_budget_way UUID;
  v_cat_household UUID;
  v_cat_insurance UUID;
  v_cat_phone_internet UUID;
  v_cat_vehicles UUID;
  v_cat_celebrations UUID;
  v_cat_personal UUID;
  v_cat_extras UUID;
  v_cat_health UUID;
  v_cat_school UUID;
  v_cat_subscriptions UUID;
  v_cat_bank UUID;
  v_cat_giving UUID;
  v_cat_hobbies UUID;

  -- Envelope IDs
  v_env_surplus UUID;
  v_env_cc_holding UUID;
  v_env_starter_stash UUID;
  v_env_debt_destroyer UUID;
  v_env_safety_net UUID;
  v_env_my_budget_mate UUID;
  v_env_rent UUID;
  v_env_groceries UUID;
  v_env_electricity UUID;
  v_env_water UUID;
  v_env_internet UUID;
  v_env_cellphone UUID;
  v_env_petrol UUID;
  v_env_car_maintenance UUID;
  v_env_car_rego UUID;
  v_env_wof UUID;
  v_env_car_insurance UUID;
  v_env_contents_insurance UUID;
  v_env_health_insurance UUID;
  v_env_christmas UUID;
  v_env_birthdays UUID;
  v_env_gifts UUID;
  v_env_clothing UUID;
  v_env_hair UUID;
  v_env_doctor UUID;
  v_env_dentist UUID;
  v_env_medication UUID;
  v_env_gym UUID;
  v_env_fun_money UUID;
  v_env_takeaways UUID;
  v_env_holidays UUID;
  v_env_netflix UUID;
  v_env_spotify UUID;
  v_env_school_fees UUID;
  v_env_school_uniform UUID;
  v_env_donations UUID;
  v_env_home_maintenance UUID;
  v_env_pet_care UUID;
  v_env_kids_pocket_money UUID;

  -- Income source IDs
  v_income_1 UUID;
  v_income_2 UUID;

  -- Account IDs
  v_account_transaction UUID;
  v_account_savings UUID;
  v_account_cc UUID;

  -- Child profile IDs
  v_child_1 UUID;
  v_child_2 UUID;

  -- Chore template IDs (custom ones)
  v_chore_wash_car UUID;
  v_chore_mow_lawn UUID;
  v_chore_tidy_room UUID;
  v_chore_feed_pets UUID;
  v_chore_dishes UUID;
  v_chore_homework UUID;

  -- Todo/Shopping/Recipe IDs
  v_todo_list_1 UUID;
  v_todo_list_2 UUID;
  v_shopping_list_1 UUID;
  v_shopping_list_2 UUID;
  v_recipe_1 UUID;
  v_recipe_2 UUID;
  v_recipe_3 UUID;
  v_recipe_4 UUID;

  -- Invoice IDs
  v_invoice_1 UUID;
  v_invoice_2 UUID;

  -- Household
  v_household_id UUID;

  -- Subscription plan
  v_free_plan_id UUID;
  v_pro_plan_id UUID;

BEGIN
  -- Find the user
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_demo_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Please sign up first at /signup', v_demo_email;
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- ============================================
  -- STEP 1: Profile
  -- ============================================
  INSERT INTO profiles (id, full_name, avatar_url, created_at, updated_at,
    onboarding_completed, celebration_reminder_weeks,
    onboarding_current_step, onboarding_highest_step, onboarding_started_at,
    onboarding_use_template)
  VALUES (
    v_user_id,
    'Demo User',
    NULL,
    NOW() - INTERVAL '30 days',
    NOW(),
    false,  -- NOT completed so onboarding steps are visible
    3,
    0,  -- Reset to 0 so onboarding wizard shows from start
    0,
    NOW() - INTERVAL '30 days',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = 'Demo User',
    onboarding_completed = false,
    celebration_reminder_weeks = 3,
    onboarding_current_step = 0,
    onboarding_highest_step = 0,
    onboarding_started_at = NOW() - INTERVAL '30 days',
    onboarding_use_template = true,
    updated_at = NOW();

  -- ============================================
  -- STEP 2: Beta access
  -- ============================================
  INSERT INTO feature_beta_access (user_email, user_type)
  VALUES (v_demo_email, 'adult')
  ON CONFLICT (user_email) DO NOTHING;

  -- ============================================
  -- STEP 3: Envelope Categories
  -- ============================================
  -- Delete existing categories for clean slate
  DELETE FROM envelope_categories WHERE user_id = v_user_id;

  v_cat_my_budget_way := gen_random_uuid();
  v_cat_household := gen_random_uuid();
  v_cat_insurance := gen_random_uuid();
  v_cat_phone_internet := gen_random_uuid();
  v_cat_vehicles := gen_random_uuid();
  v_cat_celebrations := gen_random_uuid();
  v_cat_personal := gen_random_uuid();
  v_cat_extras := gen_random_uuid();
  v_cat_health := gen_random_uuid();
  v_cat_school := gen_random_uuid();
  v_cat_subscriptions := gen_random_uuid();
  v_cat_bank := gen_random_uuid();
  v_cat_giving := gen_random_uuid();
  v_cat_hobbies := gen_random_uuid();

  INSERT INTO envelope_categories (id, user_id, name, icon, is_system, display_order) VALUES
    (v_cat_my_budget_way, v_user_id, 'The My Budget Way', 'envelope', true, 1),
    (v_cat_household, v_user_id, 'Household', 'house', true, 2),
    (v_cat_insurance, v_user_id, 'Insurance', 'shield-check', true, 3),
    (v_cat_phone_internet, v_user_id, 'Phone/Internet', 'cell-tower', true, 4),
    (v_cat_vehicles, v_user_id, 'Vehicles', 'tire', true, 5),
    (v_cat_celebrations, v_user_id, 'Celebrations', 'confetti', true, 6),
    (v_cat_personal, v_user_id, 'Personal', 'user-rectangle', true, 7),
    (v_cat_extras, v_user_id, 'Extras', 'bag', true, 8),
    (v_cat_health, v_user_id, 'Health', 'bandaids', true, 9),
    (v_cat_school, v_user_id, 'School', 'buildings', true, 10),
    (v_cat_subscriptions, v_user_id, 'Subscriptions', 'airplay', true, 11),
    (v_cat_bank, v_user_id, 'Bank', 'piggy-bank', true, 12),
    (v_cat_giving, v_user_id, 'Giving', 'tip-jar', true, 13),
    (v_cat_hobbies, v_user_id, 'Hobbies', 'person-simple', true, 14);

  -- ============================================
  -- STEP 4: Bank Accounts
  -- ============================================
  DELETE FROM accounts WHERE user_id = v_user_id;

  v_account_transaction := gen_random_uuid();
  v_account_savings := gen_random_uuid();
  v_account_cc := gen_random_uuid();

  INSERT INTO accounts (id, user_id, name, type, institution, current_balance) VALUES
    (v_account_transaction, v_user_id, 'Everyday Account', 'transaction', 'ANZ', 3245.67),
    (v_account_savings, v_user_id, 'Savings Account', 'savings', 'ANZ', 8500.00),
    (v_account_cc, v_user_id, 'ANZ Visa', 'debt', 'ANZ', -2847.50);

  -- ============================================
  -- STEP 5: Income Sources
  -- ============================================
  DELETE FROM income_sources WHERE user_id = v_user_id;

  v_income_1 := gen_random_uuid();
  v_income_2 := gen_random_uuid();

  INSERT INTO income_sources (id, user_id, name, pay_cycle, typical_amount, auto_allocate, is_active, next_pay_date) VALUES
    (v_income_1, v_user_id, 'My Salary', 'fortnightly', 2850.00, true, true, (CURRENT_DATE + INTERVAL '5 days')::date),
    (v_income_2, v_user_id, 'Partner Salary', 'monthly', 4200.00, true, true, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' + INTERVAL '14 days')::date);

  -- ============================================
  -- STEP 6: Envelopes (comprehensive list)
  -- ============================================
  DELETE FROM envelopes WHERE user_id = v_user_id;

  -- Generate all envelope UUIDs
  v_env_surplus := gen_random_uuid();
  v_env_cc_holding := gen_random_uuid();
  v_env_starter_stash := gen_random_uuid();
  v_env_debt_destroyer := gen_random_uuid();
  v_env_safety_net := gen_random_uuid();
  v_env_my_budget_mate := gen_random_uuid();
  v_env_rent := gen_random_uuid();
  v_env_groceries := gen_random_uuid();
  v_env_electricity := gen_random_uuid();
  v_env_water := gen_random_uuid();
  v_env_internet := gen_random_uuid();
  v_env_cellphone := gen_random_uuid();
  v_env_petrol := gen_random_uuid();
  v_env_car_maintenance := gen_random_uuid();
  v_env_car_rego := gen_random_uuid();
  v_env_wof := gen_random_uuid();
  v_env_car_insurance := gen_random_uuid();
  v_env_contents_insurance := gen_random_uuid();
  v_env_health_insurance := gen_random_uuid();
  v_env_christmas := gen_random_uuid();
  v_env_birthdays := gen_random_uuid();
  v_env_gifts := gen_random_uuid();
  v_env_clothing := gen_random_uuid();
  v_env_hair := gen_random_uuid();
  v_env_doctor := gen_random_uuid();
  v_env_dentist := gen_random_uuid();
  v_env_medication := gen_random_uuid();
  v_env_gym := gen_random_uuid();
  v_env_fun_money := gen_random_uuid();
  v_env_takeaways := gen_random_uuid();
  v_env_holidays := gen_random_uuid();
  v_env_netflix := gen_random_uuid();
  v_env_spotify := gen_random_uuid();
  v_env_school_fees := gen_random_uuid();
  v_env_school_uniform := gen_random_uuid();
  v_env_donations := gen_random_uuid();
  v_env_home_maintenance := gen_random_uuid();
  v_env_pet_care := gen_random_uuid();
  v_env_kids_pocket_money := gen_random_uuid();

  INSERT INTO envelopes (id, user_id, name, icon, category_id, target_amount, current_amount, opening_balance, due_date, frequency, subtype, priority, is_debt, is_tracking_only, is_celebration) VALUES
    -- THE MY BUDGET WAY
    (v_env_surplus, v_user_id, 'Surplus', 'tip-jar', v_cat_my_budget_way, 0, 245.30, 0, NULL, NULL, 'tracking', NULL, false, true, false),
    (v_env_cc_holding, v_user_id, 'Credit Card Holding', 'card', v_cat_my_budget_way, 0, 1200.00, 0, NULL, NULL, 'tracking', NULL, false, true, false),
    (v_env_starter_stash, v_user_id, 'Starter Stash', 'plant', v_cat_my_budget_way, 1000, 750.00, 500, NULL, NULL, 'goal', 'essential', false, false, false),
    (v_env_debt_destroyer, v_user_id, 'Debt Destroyer', 'chart-line-down', v_cat_my_budget_way, 0, 350.00, 0, NULL, 'monthly', 'debt', 'essential', true, false, false),
    (v_env_safety_net, v_user_id, 'Safety Net', 'potted-plant', v_cat_my_budget_way, 7500, 0, 0, NULL, NULL, 'goal', 'essential', false, false, false),
    (v_env_my_budget_mate, v_user_id, 'My Budget Mate', 'envelope-simple', v_cat_my_budget_way, 9.99, 9.99, 0, (CURRENT_DATE + INTERVAL '20 days')::date, 'monthly', 'bill', 'essential', false, false, false),

    -- HOUSEHOLD
    (v_env_rent, v_user_id, 'Rent', 'home', v_cat_household, 550, 550.00, 0, (CURRENT_DATE + INTERVAL '3 days')::date, 'weekly', 'bill', 'essential', false, false, false),
    (v_env_groceries, v_user_id, 'Groceries', 'basket', v_cat_household, 250, 180.45, 0, NULL, 'weekly', 'spending', 'essential', false, false, false),
    (v_env_electricity, v_user_id, 'Electricity', 'lightbulb', v_cat_household, 180, 245.00, 0, (CURRENT_DATE + INTERVAL '12 days')::date, 'monthly', 'bill', 'essential', false, false, false),
    (v_env_water, v_user_id, 'Water', 'water', v_cat_household, 65, 45.00, 0, (CURRENT_DATE + INTERVAL '18 days')::date, 'monthly', 'bill', 'essential', false, false, false),
    (v_env_home_maintenance, v_user_id, 'Home Maintenance', 'paint-brush-household', v_cat_household, 100, 320.00, 200, NULL, 'monthly', 'savings', 'essential', false, false, false),
    (v_env_pet_care, v_user_id, 'Pet Care', 'heart', v_cat_household, 80, 55.00, 0, NULL, 'monthly', 'spending', 'important', false, false, false),

    -- PHONE/INTERNET
    (v_env_internet, v_user_id, 'Internet', 'wifi-high', v_cat_phone_internet, 89, 89.00, 0, (CURRENT_DATE + INTERVAL '8 days')::date, 'monthly', 'bill', 'essential', false, false, false),
    (v_env_cellphone, v_user_id, 'Cellphone', 'device-mobile-speaker', v_cat_phone_internet, 45, 45.00, 0, (CURRENT_DATE + INTERVAL '15 days')::date, 'monthly', 'bill', 'essential', false, false, false),

    -- VEHICLES
    (v_env_petrol, v_user_id, 'Petrol', 'car', v_cat_vehicles, 120, 65.00, 0, NULL, 'fortnightly', 'bill', 'essential', false, false, false),
    (v_env_car_maintenance, v_user_id, 'Car Maintenance', 'car-battery', v_cat_vehicles, 50, 280.00, 100, NULL, 'monthly', 'savings', 'essential', false, false, false),
    (v_env_car_rego, v_user_id, 'Car Registration', 'road-horizon', v_cat_vehicles, 110, 55.00, 0, (CURRENT_DATE + INTERVAL '90 days')::date, 'quarterly', 'bill', 'essential', false, false, false),
    (v_env_wof, v_user_id, 'WOF', 'sticker', v_cat_vehicles, 60, 30.00, 0, (CURRENT_DATE + INTERVAL '120 days')::date, 'yearly', 'bill', 'essential', false, false, false),

    -- INSURANCE
    (v_env_car_insurance, v_user_id, 'Car Insurance', 'car-profile', v_cat_insurance, 85, 85.00, 0, (CURRENT_DATE + INTERVAL '10 days')::date, 'monthly', 'bill', 'essential', false, false, false),
    (v_env_contents_insurance, v_user_id, 'Contents Insurance', 'sketch-logo', v_cat_insurance, 45, 45.00, 0, (CURRENT_DATE + INTERVAL '22 days')::date, 'monthly', 'bill', 'essential', false, false, false),
    (v_env_health_insurance, v_user_id, 'Health Insurance', 'pulse', v_cat_insurance, 120, 120.00, 0, (CURRENT_DATE + INTERVAL '1 day')::date, 'monthly', 'bill', 'essential', false, false, false),

    -- CELEBRATIONS
    (v_env_christmas, v_user_id, 'Christmas', 'tree-evergreen', v_cat_celebrations, 600, 285.00, 0, '2026-12-25', 'yearly', 'savings', 'discretionary', false, false, true),
    (v_env_birthdays, v_user_id, 'Birthdays', 'cake', v_cat_celebrations, 400, 120.00, 0, NULL, 'yearly', 'savings', 'discretionary', false, false, true),
    (v_env_gifts, v_user_id, 'Gifts', 'gift', v_cat_celebrations, 300, 85.00, 0, NULL, 'yearly', 'savings', 'important', false, false, true),

    -- PERSONAL
    (v_env_clothing, v_user_id, 'Clothing', 'coat-hanger', v_cat_personal, 100, 45.00, 0, NULL, 'monthly', 'spending', 'important', false, false, false),
    (v_env_hair, v_user_id, 'Hair', 'scissors', v_cat_personal, 60, 30.00, 0, NULL, 'monthly', 'spending', 'important', false, false, false),

    -- HEALTH
    (v_env_doctor, v_user_id, 'Doctor', 'stethoscope', v_cat_health, 50, 75.00, 50, NULL, 'monthly', 'spending', 'essential', false, false, false),
    (v_env_dentist, v_user_id, 'Dentist', 'tooth', v_cat_health, 50, 150.00, 0, NULL, 'monthly', 'savings', 'essential', false, false, false),
    (v_env_medication, v_user_id, 'Medication', 'pills', v_cat_health, 30, 15.00, 0, NULL, 'monthly', 'spending', 'essential', false, false, false),
    (v_env_gym, v_user_id, 'Gym Membership', 'heart-beat', v_cat_health, 50, 50.00, 0, (CURRENT_DATE + INTERVAL '5 days')::date, 'monthly', 'bill', 'important', false, false, false),

    -- EXTRAS
    (v_env_fun_money, v_user_id, 'Fun Money', 'wallet', v_cat_extras, 100, 35.00, 0, NULL, 'fortnightly', 'spending', 'discretionary', false, false, false),
    (v_env_takeaways, v_user_id, 'Takeaways/Restaurants', 'cutlery', v_cat_extras, 80, 25.00, 0, NULL, 'fortnightly', 'spending', 'discretionary', false, false, false),
    (v_env_holidays, v_user_id, 'Holiday Goal', 'plane', v_cat_extras, 3000, 890.00, 500, NULL, NULL, 'goal', 'important', false, false, false),

    -- SUBSCRIPTIONS
    (v_env_netflix, v_user_id, 'Netflix', 'monitor-play', v_cat_subscriptions, 22.99, 22.99, 0, (CURRENT_DATE + INTERVAL '16 days')::date, 'monthly', 'bill', 'discretionary', false, false, false),
    (v_env_spotify, v_user_id, 'Spotify', 'spotify-logo', v_cat_subscriptions, 16.99, 16.99, 0, (CURRENT_DATE + INTERVAL '9 days')::date, 'monthly', 'bill', 'discretionary', false, false, false),

    -- SCHOOL
    (v_env_school_fees, v_user_id, 'School Fees', 'backpack', v_cat_school, 150, 75.00, 0, (CURRENT_DATE + INTERVAL '25 days')::date, 'monthly', 'bill', 'essential', false, false, false),
    (v_env_school_uniform, v_user_id, 'School Uniform', 'shirt-folded', v_cat_school, 200, 65.00, 0, NULL, 'yearly', 'bill', 'important', false, false, false),

    -- BANK
    (v_env_kids_pocket_money, v_user_id, 'Kids Pocket Money', 'hand-coins', v_cat_bank, 40, 20.00, 0, NULL, 'weekly', 'spending', 'important', false, false, false),

    -- GIVING
    (v_env_donations, v_user_id, 'Donations', 'heart', v_cat_giving, 30, 15.00, 0, NULL, 'monthly', 'spending', 'discretionary', false, false, false);

  -- Set leveled bill on electricity (winter peak pattern)
  UPDATE envelopes SET
    is_leveled = true,
    seasonal_pattern = 'winter-peak',
    leveling_data = '{"monthlyAmounts": [120, 110, 130, 150, 180, 220, 250, 240, 200, 170, 140, 120], "yearlyAverage": 169.17, "bufferPercent": 10, "estimationType": "seasonal", "lastUpdated": "2026-01-15"}'::jsonb
  WHERE id = v_env_electricity;

  -- ============================================
  -- STEP 7: Debt Items (Credit Card, Student Loan, Hire Purchase)
  -- ============================================
  DELETE FROM debt_items WHERE user_id = v_user_id;

  INSERT INTO debt_items (user_id, envelope_id, name, debt_type, linked_account_id, starting_balance, current_balance, interest_rate, minimum_payment, display_order) VALUES
    (v_user_id, v_env_debt_destroyer, 'ANZ Visa', 'credit_card', v_account_cc, 4500.00, 2847.50, 19.99, 85.00, 1),
    (v_user_id, v_env_debt_destroyer, 'Student Loan', 'student_loan', NULL, 12000.00, 8450.00, 0.00, 0, 2),
    (v_user_id, v_env_debt_destroyer, 'Harvey Norman HP - Fridge', 'hp', NULL, 1800.00, 1200.00, 12.50, 75.00, 3);

  -- ============================================
  -- STEP 8: Gift Recipients
  -- ============================================
  DELETE FROM gift_recipients WHERE user_id = v_user_id;

  -- Birthday recipients
  INSERT INTO gift_recipients (user_id, envelope_id, recipient_name, gift_amount, celebration_date) VALUES
    (v_user_id, v_env_birthdays, 'Mum', 50.00, '1965-03-15'),
    (v_user_id, v_env_birthdays, 'Dad', 50.00, '1963-07-22'),
    (v_user_id, v_env_birthdays, 'Sophie (daughter)', 40.00, '2014-05-10'),
    (v_user_id, v_env_birthdays, 'Jack (son)', 40.00, '2011-09-18'),
    (v_user_id, v_env_birthdays, 'Best Friend', 30.00, '1997-11-05'),
    (v_user_id, v_env_birthdays, 'Partner', 60.00, '1996-02-14');

  -- Christmas recipients
  INSERT INTO gift_recipients (user_id, envelope_id, recipient_name, gift_amount) VALUES
    (v_user_id, v_env_christmas, 'Mum & Dad', 80.00),
    (v_user_id, v_env_christmas, 'Sophie', 100.00),
    (v_user_id, v_env_christmas, 'Jack', 100.00),
    (v_user_id, v_env_christmas, 'Partner', 120.00),
    (v_user_id, v_env_christmas, 'Siblings', 60.00),
    (v_user_id, v_env_christmas, 'Secret Santa (work)', 25.00);

  -- General gifts
  INSERT INTO gift_recipients (user_id, envelope_id, recipient_name, gift_amount) VALUES
    (v_user_id, v_env_gifts, 'Wedding Fund', 100.00),
    (v_user_id, v_env_gifts, 'Baby Shower', 50.00),
    (v_user_id, v_env_gifts, 'Housewarming', 40.00);

  -- ============================================
  -- STEP 9: Envelope Income Allocations
  -- ============================================
  DELETE FROM envelope_income_allocations WHERE user_id = v_user_id;

  -- Allocations from "My Salary" (fortnightly $2850)
  INSERT INTO envelope_income_allocations (user_id, envelope_id, income_source_id, allocation_amount) VALUES
    (v_user_id, v_env_rent, v_income_1, 550.00),
    (v_user_id, v_env_groceries, v_income_1, 250.00),
    (v_user_id, v_env_petrol, v_income_1, 120.00),
    (v_user_id, v_env_fun_money, v_income_1, 100.00),
    (v_user_id, v_env_takeaways, v_income_1, 80.00),
    (v_user_id, v_env_starter_stash, v_income_1, 100.00),
    (v_user_id, v_env_debt_destroyer, v_income_1, 200.00),
    (v_user_id, v_env_kids_pocket_money, v_income_1, 40.00),
    (v_user_id, v_env_clothing, v_income_1, 50.00),
    (v_user_id, v_env_hair, v_income_1, 30.00);

  -- Allocations from "Partner Salary" (monthly $4200)
  INSERT INTO envelope_income_allocations (user_id, envelope_id, income_source_id, allocation_amount) VALUES
    (v_user_id, v_env_electricity, v_income_2, 180.00),
    (v_user_id, v_env_water, v_income_2, 65.00),
    (v_user_id, v_env_internet, v_income_2, 89.00),
    (v_user_id, v_env_cellphone, v_income_2, 45.00),
    (v_user_id, v_env_car_insurance, v_income_2, 85.00),
    (v_user_id, v_env_contents_insurance, v_income_2, 45.00),
    (v_user_id, v_env_health_insurance, v_income_2, 120.00),
    (v_user_id, v_env_netflix, v_income_2, 22.99),
    (v_user_id, v_env_spotify, v_income_2, 16.99),
    (v_user_id, v_env_my_budget_mate, v_income_2, 9.99),
    (v_user_id, v_env_gym, v_income_2, 50.00),
    (v_user_id, v_env_school_fees, v_income_2, 150.00),
    (v_user_id, v_env_christmas, v_income_2, 50.00),
    (v_user_id, v_env_birthdays, v_income_2, 35.00),
    (v_user_id, v_env_holidays, v_income_2, 100.00),
    (v_user_id, v_env_home_maintenance, v_income_2, 100.00),
    (v_user_id, v_env_doctor, v_income_2, 50.00),
    (v_user_id, v_env_dentist, v_income_2, 50.00),
    (v_user_id, v_env_car_maintenance, v_income_2, 50.00),
    (v_user_id, v_env_donations, v_income_2, 30.00);

  -- ============================================
  -- STEP 10: Transactions (mix of statuses)
  -- ============================================
  DELETE FROM transactions WHERE user_id = v_user_id;

  INSERT INTO transactions (user_id, envelope_id, account_id, merchant_name, description, amount, occurred_at, status) VALUES
    -- Approved transactions (recent)
    (v_user_id, v_env_groceries, v_account_transaction, 'Countdown', 'Weekly shop', -145.67, (CURRENT_DATE - INTERVAL '2 days')::date, 'approved'),
    (v_user_id, v_env_groceries, v_account_transaction, 'Pak n Save', 'Top-up shop', -34.50, (CURRENT_DATE - INTERVAL '5 days')::date, 'approved'),
    (v_user_id, v_env_petrol, v_account_transaction, 'Z Energy', 'Fuel', -89.00, (CURRENT_DATE - INTERVAL '3 days')::date, 'approved'),
    (v_user_id, v_env_fun_money, v_account_transaction, 'Event Cinemas', 'Movie night', -42.00, (CURRENT_DATE - INTERVAL '4 days')::date, 'approved'),
    (v_user_id, v_env_takeaways, v_account_transaction, 'Uber Eats', 'Friday pizza', -38.50, (CURRENT_DATE - INTERVAL '1 day')::date, 'approved'),
    (v_user_id, v_env_electricity, v_account_transaction, 'Mercury Energy', 'January power bill', -195.40, (CURRENT_DATE - INTERVAL '7 days')::date, 'approved'),
    (v_user_id, v_env_internet, v_account_transaction, 'Spark', 'Monthly internet', -89.00, (CURRENT_DATE - INTERVAL '8 days')::date, 'approved'),
    (v_user_id, v_env_netflix, v_account_transaction, 'Netflix', 'Monthly subscription', -22.99, (CURRENT_DATE - INTERVAL '10 days')::date, 'approved'),
    (v_user_id, v_env_spotify, v_account_transaction, 'Spotify', 'Family plan', -16.99, (CURRENT_DATE - INTERVAL '9 days')::date, 'approved'),
    (v_user_id, v_env_gym, v_account_transaction, 'Les Mills', 'Monthly membership', -50.00, (CURRENT_DATE - INTERVAL '5 days')::date, 'approved'),
    (v_user_id, v_env_medication, v_account_transaction, 'Chemist Warehouse', 'Prescriptions', -18.50, (CURRENT_DATE - INTERVAL '6 days')::date, 'approved'),
    (v_user_id, v_env_clothing, v_account_transaction, 'The Warehouse', 'Kids winter jackets', -65.00, (CURRENT_DATE - INTERVAL '12 days')::date, 'approved'),
    (v_user_id, v_env_rent, v_account_transaction, 'Landlord - Rent', 'Weekly rent', -550.00, (CURRENT_DATE - INTERVAL '1 day')::date, 'approved'),
    (v_user_id, v_env_car_insurance, v_account_transaction, 'AA Insurance', 'Monthly premium', -85.00, (CURRENT_DATE - INTERVAL '10 days')::date, 'approved'),

    -- Income transactions
    (v_user_id, NULL, v_account_transaction, 'Employer Ltd', 'Salary deposit', 2850.00, (CURRENT_DATE - INTERVAL '3 days')::date, 'approved'),
    (v_user_id, NULL, v_account_transaction, 'Partner Employer', 'Partner salary', 4200.00, (CURRENT_DATE - INTERVAL '14 days')::date, 'approved'),

    -- Pending transactions (need approval)
    (v_user_id, NULL, v_account_transaction, 'Kmart', 'Unknown purchase', -45.00, (CURRENT_DATE)::date, 'pending'),
    (v_user_id, NULL, v_account_transaction, 'McDonald''s', 'Lunch?', -18.90, (CURRENT_DATE)::date, 'pending'),
    (v_user_id, NULL, v_account_transaction, 'Bunnings', 'Hardware store', -67.50, (CURRENT_DATE - INTERVAL '1 day')::date, 'pending'),
    (v_user_id, NULL, v_account_transaction, 'Warehouse Stationery', 'School supplies?', -32.00, (CURRENT_DATE)::date, 'pending'),

    -- Older approved transactions
    (v_user_id, v_env_groceries, v_account_transaction, 'New World', 'Weekly shop', -167.89, (CURRENT_DATE - INTERVAL '14 days')::date, 'approved'),
    (v_user_id, v_env_hair, v_account_transaction, 'Just Cuts', 'Haircut', -35.00, (CURRENT_DATE - INTERVAL '20 days')::date, 'approved'),
    (v_user_id, v_env_doctor, v_account_transaction, 'City Medical', 'GP visit', -55.00, (CURRENT_DATE - INTERVAL '18 days')::date, 'approved'),
    (v_user_id, v_env_pet_care, v_account_transaction, 'Animates', 'Dog food', -42.00, (CURRENT_DATE - INTERVAL '15 days')::date, 'approved'),
    (v_user_id, v_env_school_fees, v_account_transaction, 'Primary School', 'Term 1 fees', -150.00, (CURRENT_DATE - INTERVAL '25 days')::date, 'approved');

  -- ============================================
  -- STEP 11: Achievements
  -- ============================================
  DELETE FROM achievements WHERE user_id = v_user_id;

  INSERT INTO achievements (user_id, achievement_type, unlocked_at) VALUES
    (v_user_id, 'first_envelope', NOW() - INTERVAL '28 days'),
    (v_user_id, 'emergency_fund_started', NOW() - INTERVAL '25 days'),
    (v_user_id, 'first_budget_month', NOW() - INTERVAL '15 days'),
    (v_user_id, 'onboarding_complete', NOW() - INTERVAL '28 days');

  -- ============================================
  -- STEP 12: Financial Position (Assets & Liabilities)
  -- ============================================
  DELETE FROM assets WHERE user_id = v_user_id;
  DELETE FROM liabilities WHERE user_id = v_user_id;
  DELETE FROM net_worth_snapshots WHERE user_id = v_user_id;

  INSERT INTO assets (user_id, name, asset_type, current_value, notes) VALUES
    (v_user_id, 'KiwiSaver', 'retirement', 45000.00, 'ANZ Growth Fund'),
    (v_user_id, '2018 Toyota Corolla', 'vehicle', 12000.00, 'Current market value'),
    (v_user_id, 'Everyday Account', 'cash', 3245.67, 'ANZ'),
    (v_user_id, 'Savings Account', 'cash', 8500.00, 'ANZ'),
    (v_user_id, 'Household Contents', 'property', 15000.00, 'Estimated value');

  INSERT INTO liabilities (user_id, name, liability_type, current_balance, interest_rate, notes) VALUES
    (v_user_id, 'ANZ Visa', 'credit_card', 2847.50, 19.99, 'Paying down'),
    (v_user_id, 'Student Loan', 'student_loan', 8450.00, 0, 'IRD - interest free'),
    (v_user_id, 'Harvey Norman HP', 'hire_purchase', 1200.00, 12.50, 'Fridge - 24 month term');

  -- Net worth snapshots (last 6 months)
  INSERT INTO net_worth_snapshots (user_id, snapshot_date, total_assets, total_liabilities, net_worth) VALUES
    (v_user_id, (CURRENT_DATE - INTERVAL '5 months')::date, 78000.00, 16500.00, 61500.00),
    (v_user_id, (CURRENT_DATE - INTERVAL '4 months')::date, 79200.00, 15800.00, 63400.00),
    (v_user_id, (CURRENT_DATE - INTERVAL '3 months')::date, 80500.00, 15100.00, 65400.00),
    (v_user_id, (CURRENT_DATE - INTERVAL '2 months')::date, 81800.00, 14200.00, 67600.00),
    (v_user_id, (CURRENT_DATE - INTERVAL '1 month')::date, 82900.00, 13500.00, 69400.00),
    (v_user_id, CURRENT_DATE, 83745.67, 12497.50, 71248.17);

  -- ============================================
  -- STEP 13: Kids Module
  -- ============================================
  -- Delete existing kids data (order matters for FK constraints)
  -- Chore assignments reference both child_profiles and chore_templates
  DELETE FROM chore_assignments WHERE parent_user_id = v_user_id;
  DELETE FROM chore_templates WHERE parent_user_id = v_user_id AND is_preset = false;
  DELETE FROM child_profiles WHERE parent_user_id = v_user_id;

  v_child_1 := gen_random_uuid();
  v_child_2 := gen_random_uuid();

  INSERT INTO child_profiles (id, parent_user_id, name, date_of_birth, family_access_code, pin_hash, money_mode,
    distribution_spend_pct, distribution_save_pct, distribution_invest_pct, distribution_give_pct, star_balance) VALUES
    (v_child_1, v_user_id, 'Jack', '2011-09-18', 'DEMO-2026', '$2a$10$dummyhashvalue1234567890abcdefghijklmnopqrstuv', 'virtual', 50, 25, 15, 10, 245),
    (v_child_2, v_user_id, 'Sophie', '2014-05-10', 'DEMO-2026', '$2a$10$dummyhashvalue1234567890abcdefghijklmnopqrstuv', 'virtual', 60, 20, 10, 10, 180);

  -- Child bank accounts (virtual)
  INSERT INTO child_bank_accounts (child_profile_id, envelope_type, account_name, current_balance, is_virtual, opening_balance) VALUES
    -- Jack's accounts
    (v_child_1, 'spend', 'Jack''s Spending', 45.00, true, 0),
    (v_child_1, 'save', 'Jack''s Savings', 120.00, true, 0),
    (v_child_1, 'invest', 'Jack''s Investments', 55.00, true, 0),
    (v_child_1, 'give', 'Jack''s Giving', 15.00, true, 0),
    -- Sophie's accounts
    (v_child_2, 'spend', 'Sophie''s Spending', 32.00, true, 0),
    (v_child_2, 'save', 'Sophie''s Savings', 85.00, true, 0),
    (v_child_2, 'invest', 'Sophie''s Investments', 30.00, true, 0),
    (v_child_2, 'give', 'Sophie''s Giving', 10.00, true, 0);

  -- Custom chore templates
  v_chore_wash_car := gen_random_uuid();
  v_chore_mow_lawn := gen_random_uuid();
  v_chore_tidy_room := gen_random_uuid();
  v_chore_feed_pets := gen_random_uuid();
  v_chore_dishes := gen_random_uuid();
  v_chore_homework := gen_random_uuid();

  INSERT INTO chore_templates (id, parent_user_id, name, description, frequency, currency_type, currency_amount, category, icon, is_preset, is_expected) VALUES
    (v_chore_wash_car, v_user_id, 'Wash the Car', 'Wash and dry the car properly', 'weekly', 'money', 10.00, 'outdoors', '🚗', false, false),
    (v_chore_mow_lawn, v_user_id, 'Mow the Lawn', 'Mow front and back lawn', 'weekly', 'money', 15.00, 'outdoors', '🌿', false, false),
    (v_chore_tidy_room, v_user_id, 'Tidy Your Room', 'Clean and tidy bedroom', 'daily', 'stars', 5, 'bedroom', '🛏️', false, true),
    (v_chore_feed_pets, v_user_id, 'Feed the Dog', 'Feed Rex breakfast and dinner', 'daily', 'stars', 5, 'pets', '🐕', false, true),
    (v_chore_dishes, v_user_id, 'Do the Dishes', 'Load and unload dishwasher', 'daily', 'stars', 10, 'kitchen', '🍽️', false, true),
    (v_chore_homework, v_user_id, 'Complete Homework', 'Finish all homework before screen time', 'daily', 'stars', 10, 'general', '📚', false, true);

  -- Chore assignments (current week)
  INSERT INTO chore_assignments (parent_user_id, chore_template_id, child_profile_id, week_starting, status, marked_done_at, approved_at, approved_by) VALUES
    -- Jack's chores this week
    (v_user_id, v_chore_tidy_room, v_child_1, DATE_TRUNC('week', CURRENT_DATE)::date, 'approved', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', v_user_id),
    (v_user_id, v_chore_feed_pets, v_child_1, DATE_TRUNC('week', CURRENT_DATE)::date, 'approved', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', v_user_id),
    (v_user_id, v_chore_dishes, v_child_1, DATE_TRUNC('week', CURRENT_DATE)::date, 'done', NOW() - INTERVAL '2 hours', NULL, NULL),
    (v_user_id, v_chore_wash_car, v_child_1, DATE_TRUNC('week', CURRENT_DATE)::date, 'pending', NULL, NULL, NULL),
    (v_user_id, v_chore_mow_lawn, v_child_1, DATE_TRUNC('week', CURRENT_DATE)::date, 'pending', NULL, NULL, NULL),
    (v_user_id, v_chore_homework, v_child_1, DATE_TRUNC('week', CURRENT_DATE)::date, 'approved', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', v_user_id),
    -- Sophie's chores this week
    (v_user_id, v_chore_tidy_room, v_child_2, DATE_TRUNC('week', CURRENT_DATE)::date, 'approved', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', v_user_id),
    (v_user_id, v_chore_feed_pets, v_child_2, DATE_TRUNC('week', CURRENT_DATE)::date, 'done', NOW() - INTERVAL '3 hours', NULL, NULL),
    (v_user_id, v_chore_dishes, v_child_2, DATE_TRUNC('week', CURRENT_DATE)::date, 'pending', NULL, NULL, NULL),
    (v_user_id, v_chore_homework, v_child_2, DATE_TRUNC('week', CURRENT_DATE)::date, 'approved', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', v_user_id);

  -- Kid income sources (pocket money)
  INSERT INTO kid_income_sources (child_profile_id, name, amount, frequency, next_pay_date, is_active, bank_transfer_confirmed) VALUES
    (v_child_1, 'Weekly Pocket Money', 20.00, 'weekly', (CURRENT_DATE + INTERVAL '3 days')::date, true, true),
    (v_child_2, 'Weekly Pocket Money', 15.00, 'weekly', (CURRENT_DATE + INTERVAL '3 days')::date, true, true);

  -- Kid invoices
  v_invoice_1 := gen_random_uuid();
  v_invoice_2 := gen_random_uuid();

  INSERT INTO kid_invoices (id, child_profile_id, invoice_number, status, total_amount, submitted_at, created_at) VALUES
    (v_invoice_1, v_child_1, 'INV-2026-001', 'submitted', 25.00, NOW() - INTERVAL '2 days', NOW() - INTERVAL '5 days'),
    (v_invoice_2, v_child_2, 'INV-2026-001', 'paid', 15.00, NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days');

  INSERT INTO kid_invoice_items (invoice_id, chore_name, amount, completed_at) VALUES
    (v_invoice_1, 'Wash the Car', 10.00, NOW() - INTERVAL '4 days'),
    (v_invoice_1, 'Mow the Lawn', 15.00, NOW() - INTERVAL '3 days'),
    (v_invoice_2, 'Wash the Car', 10.00, NOW() - INTERVAL '11 days'),
    (v_invoice_2, 'Extra Cleaning', 5.00, NOW() - INTERVAL '11 days');

  -- Expected chore streaks
  INSERT INTO expected_chore_streaks (child_profile_id, chore_template_id, current_streak, longest_streak, last_completed_date, week_starting, completed_days) VALUES
    (v_child_1, v_chore_tidy_room, 12, 18, (CURRENT_DATE - INTERVAL '1 day')::date, DATE_TRUNC('week', CURRENT_DATE)::date, ARRAY[true, true, true, false, false, false, false]),
    (v_child_1, v_chore_feed_pets, 8, 14, (CURRENT_DATE - INTERVAL '1 day')::date, DATE_TRUNC('week', CURRENT_DATE)::date, ARRAY[true, true, false, false, false, false, false]),
    (v_child_2, v_chore_tidy_room, 6, 10, (CURRENT_DATE - INTERVAL '1 day')::date, DATE_TRUNC('week', CURRENT_DATE)::date, ARRAY[true, true, false, false, false, false, false]),
    (v_child_2, v_chore_homework, 15, 15, (CURRENT_DATE - INTERVAL '1 day')::date, DATE_TRUNC('week', CURRENT_DATE)::date, ARRAY[true, true, true, false, false, false, false]);

  -- Hub permissions
  INSERT INTO kid_hub_permissions (child_profile_id, feature_name, permission_level) VALUES
    (v_child_1, 'shopping_lists', 'view'),
    (v_child_1, 'recipes', 'view'),
    (v_child_1, 'meal_planner', 'none'),
    (v_child_1, 'todos', 'edit'),
    (v_child_1, 'calendar', 'view'),
    (v_child_1, 'birthdays', 'view'),
    (v_child_2, 'shopping_lists', 'view'),
    (v_child_2, 'recipes', 'view'),
    (v_child_2, 'meal_planner', 'none'),
    (v_child_2, 'todos', 'edit'),
    (v_child_2, 'calendar', 'view'),
    (v_child_2, 'birthdays', 'view');

  -- Star transactions
  INSERT INTO star_transactions (child_profile_id, amount, source, description) VALUES
    (v_child_1, 50, 'chore_completion', 'Perfect week bonus!'),
    (v_child_1, 10, 'chore_completion', 'Tidy room'),
    (v_child_1, 10, 'chore_completion', 'Feed the dog'),
    (v_child_1, -20, 'shop_purchase', 'Baseball Cap from Avatar Shop'),
    (v_child_2, 30, 'chore_completion', 'Week warrior streak'),
    (v_child_2, 5, 'chore_completion', 'Tidy room'),
    (v_child_2, 10, 'chore_completion', 'Homework done');

  -- ============================================
  -- STEP 14: Life Features - Todo Lists
  -- ============================================
  DELETE FROM todo_lists WHERE parent_user_id = v_user_id;

  v_todo_list_1 := gen_random_uuid();
  v_todo_list_2 := gen_random_uuid();

  INSERT INTO todo_lists (id, parent_user_id, name, icon) VALUES
    (v_todo_list_1, v_user_id, 'Weekend Chores', '🏠'),
    (v_todo_list_2, v_user_id, 'Holiday Packing List', '🧳');

  INSERT INTO todo_items (todo_list_id, text, is_completed, category, assigned_to_type, sort_order) VALUES
    -- Weekend Chores
    (v_todo_list_1, 'Clean bathroom', true, 'Bathroom', 'parent', 1),
    (v_todo_list_1, 'Vacuum lounge', false, 'Lounge', 'parent', 2),
    (v_todo_list_1, 'Wash sheets', false, 'Laundry', 'parent', 3),
    (v_todo_list_1, 'Mow lawn', false, 'Outdoors', 'family', 4),
    (v_todo_list_1, 'Clean windows', false, 'General', 'family', 5),
    (v_todo_list_1, 'Organise garage', false, 'Outdoors', 'parent', 6),
    -- Holiday Packing List
    (v_todo_list_2, 'Passports', false, 'Documents', NULL, 1),
    (v_todo_list_2, 'Sunscreen', false, 'Toiletries', NULL, 2),
    (v_todo_list_2, 'Chargers', false, 'Electronics', NULL, 3),
    (v_todo_list_2, 'Swimmers', false, 'Clothing', NULL, 4),
    (v_todo_list_2, 'First aid kit', false, 'Health', NULL, 5),
    (v_todo_list_2, 'Snacks for car', false, 'Food', NULL, 6),
    (v_todo_list_2, 'Travel insurance', true, 'Documents', NULL, 7),
    (v_todo_list_2, 'Booking confirmations', true, 'Documents', NULL, 8);

  -- ============================================
  -- STEP 15: Life Features - Recipes
  -- ============================================
  DELETE FROM recipes WHERE parent_user_id = v_user_id;

  v_recipe_1 := gen_random_uuid();
  v_recipe_2 := gen_random_uuid();
  v_recipe_3 := gen_random_uuid();
  v_recipe_4 := gen_random_uuid();

  INSERT INTO recipes (id, parent_user_id, title, source_type, ingredients, instructions, servings, prep_time_minutes, cook_time_minutes, tags, is_favorite) VALUES
    (v_recipe_1, v_user_id, 'Spaghetti Bolognese', 'typed',
     '[{"item": "mince", "amount": "500g"}, {"item": "onion", "amount": "1 large"}, {"item": "garlic", "amount": "3 cloves"}, {"item": "tinned tomatoes", "amount": "2 cans"}, {"item": "spaghetti", "amount": "400g"}, {"item": "carrot", "amount": "2"}, {"item": "celery", "amount": "2 sticks"}]'::jsonb,
     'Brown mince in a large pot. Add diced onion, garlic, carrot, and celery. Cook until soft. Add tinned tomatoes and simmer for 30 minutes. Season with salt, pepper, and Italian herbs. Cook spaghetti according to packet directions. Serve with parmesan.',
     4, 15, 45, ARRAY['family-favourite', 'kid-friendly', 'freezer-friendly'], true),
    (v_recipe_2, v_user_id, 'Chicken Stir Fry', 'typed',
     '[{"item": "chicken breast", "amount": "500g"}, {"item": "broccoli", "amount": "1 head"}, {"item": "capsicum", "amount": "2"}, {"item": "soy sauce", "amount": "3 tbsp"}, {"item": "sesame oil", "amount": "1 tbsp"}, {"item": "rice", "amount": "2 cups"}, {"item": "ginger", "amount": "1 thumb"}]'::jsonb,
     'Slice chicken into strips. Heat oil in wok. Cook chicken until golden. Add vegetables and stir fry for 3-4 minutes. Add soy sauce, ginger, and sesame oil. Serve over steamed rice.',
     4, 10, 15, ARRAY['quick', 'healthy', 'kid-friendly'], true),
    (v_recipe_3, v_user_id, 'Fish and Chips', 'typed',
     '[{"item": "fish fillets", "amount": "4"}, {"item": "potatoes", "amount": "6 large"}, {"item": "flour", "amount": "1 cup"}, {"item": "beer", "amount": "1 cup"}, {"item": "oil for frying", "amount": "plenty"}]'::jsonb,
     'Cut potatoes into chips. Par-boil for 5 minutes, drain. Make batter with flour and beer. Coat fish in batter. Deep fry chips until golden. Deep fry fish until crispy and cooked through. Serve with lemon and tartar sauce.',
     4, 20, 30, ARRAY['friday-night', 'kiwi-classic', 'kid-friendly'], false),
    (v_recipe_4, v_user_id, 'Banana Muffins', 'typed',
     '[{"item": "ripe bananas", "amount": "3"}, {"item": "flour", "amount": "2 cups"}, {"item": "sugar", "amount": "3/4 cup"}, {"item": "butter", "amount": "100g melted"}, {"item": "egg", "amount": "1"}, {"item": "baking soda", "amount": "1 tsp"}]'::jsonb,
     'Mash bananas. Mix with melted butter, egg, and sugar. Fold in flour and baking soda. Spoon into muffin tins. Bake at 180C for 20-25 minutes until golden.',
     12, 10, 25, ARRAY['baking', 'kid-friendly', 'lunchbox', 'freezer-friendly'], true);

  -- ============================================
  -- STEP 16: Life Features - Meal Plans
  -- ============================================
  DELETE FROM meal_plans WHERE parent_user_id = v_user_id;

  INSERT INTO meal_plans (parent_user_id, date, meal_type, recipe_id, meal_name, notes) VALUES
    (v_user_id, CURRENT_DATE, 'dinner', v_recipe_1, NULL, 'Use up mince from freezer'),
    (v_user_id, CURRENT_DATE + 1, 'dinner', v_recipe_2, NULL, NULL),
    (v_user_id, CURRENT_DATE + 2, 'dinner', NULL, 'Leftovers', 'Clean out fridge'),
    (v_user_id, CURRENT_DATE + 3, 'dinner', v_recipe_3, NULL, 'Fish and chip Friday!'),
    (v_user_id, CURRENT_DATE + 4, 'dinner', NULL, 'BBQ', 'Weather permitting'),
    (v_user_id, CURRENT_DATE + 5, 'dinner', NULL, 'Pizza Night', 'Homemade pizzas with kids'),
    (v_user_id, CURRENT_DATE + 6, 'dinner', NULL, 'Roast Chicken', 'Sunday roast'),
    (v_user_id, CURRENT_DATE, 'breakfast', NULL, 'Toast & Eggs', NULL),
    (v_user_id, CURRENT_DATE, 'lunch', NULL, 'Sandwiches', NULL),
    (v_user_id, CURRENT_DATE + 1, 'lunch', NULL, 'Wraps', 'Use leftover chicken');

  -- ============================================
  -- STEP 17: Life Features - Freezer Meals
  -- ============================================
  DELETE FROM freezer_meals WHERE parent_user_id = v_user_id;

  INSERT INTO freezer_meals (parent_user_id, name, description, servings, date_frozen, expiry_date, is_used, tags) VALUES
    (v_user_id, 'Bolognese Sauce', 'Big batch from last Sunday', 6, (CURRENT_DATE - INTERVAL '5 days')::date, (CURRENT_DATE + INTERVAL '85 days')::date, false, ARRAY['pasta', 'mince', 'kid-friendly']),
    (v_user_id, 'Chicken Pie Filling', 'Creamy chicken and veg', 4, (CURRENT_DATE - INTERVAL '10 days')::date, (CURRENT_DATE + INTERVAL '80 days')::date, false, ARRAY['chicken', 'pie', 'comfort-food']),
    (v_user_id, 'Banana Muffins (x12)', 'Sophie helped make these', 12, (CURRENT_DATE - INTERVAL '3 days')::date, (CURRENT_DATE + INTERVAL '27 days')::date, false, ARRAY['baking', 'snack', 'lunchbox']),
    (v_user_id, 'Lamb Shanks', 'Slow cooked with red wine', 4, (CURRENT_DATE - INTERVAL '15 days')::date, (CURRENT_DATE + INTERVAL '75 days')::date, false, ARRAY['lamb', 'slow-cook', 'winter']),
    (v_user_id, 'Butter Chicken', 'Mild version for kids', 6, (CURRENT_DATE - INTERVAL '8 days')::date, (CURRENT_DATE + INTERVAL '82 days')::date, false, ARRAY['curry', 'chicken', 'kid-friendly']),
    (v_user_id, 'Pumpkin Soup', 'From the garden pumpkins', 8, (CURRENT_DATE - INTERVAL '20 days')::date, (CURRENT_DATE + INTERVAL '70 days')::date, true, ARRAY['soup', 'vegetarian', 'healthy']);

  -- ============================================
  -- STEP 18: Life Features - Shopping Lists
  -- ============================================
  DELETE FROM shopping_lists WHERE parent_user_id = v_user_id;

  v_shopping_list_1 := gen_random_uuid();
  v_shopping_list_2 := gen_random_uuid();

  INSERT INTO shopping_lists (id, parent_user_id, name, is_active) VALUES
    (v_shopping_list_1, v_user_id, 'Weekly Shop', true),
    (v_shopping_list_2, v_user_id, 'Bulk Buy List', true);

  INSERT INTO shopping_items (shopping_list_id, text, quantity, is_checked, aisle_name) VALUES
    -- Weekly Shop
    (v_shopping_list_1, 'Milk', '2L', false, 'Dairy'),
    (v_shopping_list_1, 'Bread', '2 loaves', false, 'Bakery'),
    (v_shopping_list_1, 'Bananas', '1 bunch', false, 'Produce'),
    (v_shopping_list_1, 'Chicken breast', '1kg', false, 'Meat'),
    (v_shopping_list_1, 'Broccoli', '2 heads', false, 'Produce'),
    (v_shopping_list_1, 'Rice', '1kg', false, 'Pantry'),
    (v_shopping_list_1, 'Pasta', '500g', true, 'Pantry'),
    (v_shopping_list_1, 'Cheese', '500g', false, 'Dairy'),
    (v_shopping_list_1, 'Eggs', '12 pack', true, 'Dairy'),
    (v_shopping_list_1, 'Apples', '6', false, 'Produce'),
    -- Bulk Buy
    (v_shopping_list_2, 'Toilet Paper', '24 pack', false, NULL),
    (v_shopping_list_2, 'Laundry Powder', '4kg', false, NULL),
    (v_shopping_list_2, 'Dishwasher Tablets', '60 pack', false, NULL),
    (v_shopping_list_2, 'Dog Food', '15kg bag', false, NULL);

  -- ============================================
  -- STEP 19: Household
  -- ============================================
  DELETE FROM households WHERE EXISTS (
    SELECT 1 FROM household_members hm WHERE hm.household_id = households.id AND hm.user_id = v_user_id
  );

  v_household_id := gen_random_uuid();

  INSERT INTO households (id, name) VALUES
    (v_household_id, 'The Demo Family');

  INSERT INTO household_members (household_id, user_id, role, display_name, joined_at, invited_by) VALUES
    (v_household_id, v_user_id, 'owner', 'Demo User', NOW() - INTERVAL '30 days', NULL);

  -- ============================================
  -- STEP 20: Subscription (Pro with trial)
  -- ============================================
  SELECT id INTO v_free_plan_id FROM subscription_plans WHERE slug = 'free' LIMIT 1;
  SELECT id INTO v_pro_plan_id FROM subscription_plans WHERE slug = 'pro' LIMIT 1;

  DELETE FROM subscriptions WHERE user_id = v_user_id;

  IF v_pro_plan_id IS NOT NULL THEN
    INSERT INTO subscriptions (user_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end) VALUES
      (v_user_id, v_pro_plan_id, 'trialing', NOW(), NOW() + INTERVAL '14 days', NOW(), NOW() + INTERVAL '14 days');
  ELSIF v_free_plan_id IS NOT NULL THEN
    INSERT INTO subscriptions (user_id, plan_id, status) VALUES
      (v_user_id, v_free_plan_id, 'active');
  END IF;

  -- ============================================
  -- STEP 21: User Preferences
  -- ============================================
  INSERT INTO user_preferences (user_id, currency_display, date_format, number_format, show_cents, dashboard_layout,
    email_weekly_summary, email_bill_reminders, email_low_balance, email_achievement_unlocked,
    auto_approve_rules, confirm_transfers)
  VALUES (
    v_user_id, 'NZD', 'dd/MM/yyyy', 'space', true, 'default',
    true, true, true, true,
    false, true
  )
  ON CONFLICT (user_id) DO UPDATE SET
    currency_display = 'NZD',
    date_format = 'dd/MM/yyyy',
    updated_at = NOW();

  -- ============================================
  -- STEP 22: Transaction Rules (for auto-assign)
  -- ============================================
  DELETE FROM transaction_rules WHERE user_id = v_user_id;

  INSERT INTO transaction_rules (user_id, merchant_normalized, envelope_id, notes) VALUES
    (v_user_id, 'countdown', v_env_groceries, 'Groceries'),
    (v_user_id, 'pak n save', v_env_groceries, 'Groceries'),
    (v_user_id, 'new world', v_env_groceries, 'Groceries'),
    (v_user_id, 'z energy', v_env_petrol, 'Fuel'),
    (v_user_id, 'bp', v_env_petrol, 'Fuel'),
    (v_user_id, 'netflix', v_env_netflix, 'Subscription'),
    (v_user_id, 'spotify', v_env_spotify, 'Subscription'),
    (v_user_id, 'mercury energy', v_env_electricity, 'Power bill'),
    (v_user_id, 'spark', v_env_internet, 'Internet'),
    (v_user_id, 'uber eats', v_env_takeaways, 'Takeaway'),
    (v_user_id, 'les mills', v_env_gym, 'Gym'),
    (v_user_id, 'aa insurance', v_env_car_insurance, 'Insurance');

  -- ============================================
  -- STEP 23: Labels for transactions
  -- ============================================
  DELETE FROM labels WHERE user_id = v_user_id;

  INSERT INTO labels (user_id, name, colour) VALUES
    (v_user_id, 'Needs Review', '#6B9ECE'),
    (v_user_id, 'Recurring', '#7A9E9A'),
    (v_user_id, 'One-off', '#D4A853'),
    (v_user_id, 'Reimbursable', '#9CA3AF');

  -- ============================================
  -- DONE!
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'DEMO USER SEED COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'User: %', v_demo_email;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Data created:';
  RAISE NOTICE '  - Profile (onboarding NOT completed)';
  RAISE NOTICE '  - 2 income sources (salary + partner)';
  RAISE NOTICE '  - 3 bank accounts (everyday, savings, credit card)';
  RAISE NOTICE '  - 14 envelope categories';
  RAISE NOTICE '  - 38 envelopes across all categories';
  RAISE NOTICE '  - 3 debt items (CC, student loan, HP)';
  RAISE NOTICE '  - 15 gift recipients (birthdays + christmas + general)';
  RAISE NOTICE '  - 20+ envelope allocations';
  RAISE NOTICE '  - 25 transactions (approved + pending)';
  RAISE NOTICE '  - 4 achievements';
  RAISE NOTICE '  - 5 assets + 3 liabilities + 6 net worth snapshots';
  RAISE NOTICE '  - 2 children (Jack 14, Sophie 11) with chores and invoices';
  RAISE NOTICE '  - 2 todo lists with items';
  RAISE NOTICE '  - 4 recipes';
  RAISE NOTICE '  - 10 meal plan entries';
  RAISE NOTICE '  - 6 freezer meals';
  RAISE NOTICE '  - 2 shopping lists with items';
  RAISE NOTICE '  - 1 household';
  RAISE NOTICE '  - Pro trial subscription';
  RAISE NOTICE '  - User preferences (NZ defaults)';
  RAISE NOTICE '  - 12 transaction rules';
  RAISE NOTICE '  - 4 labels';
  RAISE NOTICE '  - Beta access granted';
  RAISE NOTICE '';
  RAISE NOTICE 'ACCESS: Go to /signup, register with %', v_demo_email;
  RAISE NOTICE 'Then run this script. The login page is at /login';
  RAISE NOTICE '============================================';

END $$;
