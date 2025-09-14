-- Check if there are any references to old tiers in the database constraints
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%subscription_tier%';

-- Also check the current constraint definition
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE table_name = 'subscribers' AND constraint_name LIKE '%tier%';