-- Migration: 002_seed_items
-- Description: Seed initial items for the global item pool
-- Applied: Forward-only migration
-- Note: Uses INSERT OR IGNORE to be idempotent

INSERT OR IGNORE INTO global_items (id, text, emoji, created_at) VALUES
  ('seed_001', 'A warm cup of coffee on a rainy day', '☕', 1700000000000),
  ('seed_002', 'Finding money in your old jacket pocket', '💵', 1700000000001),
  ('seed_003', 'The smell of fresh bread', '🍞', 1700000000002),
  ('seed_004', 'Stubbing your toe on furniture', '🦶', 1700000000003),
  ('seed_005', 'Getting a haircut you hate', '💇', 1700000000004),
  ('seed_006', 'A perfectly ripe avocado', '🥑', 1700000000005),
  ('seed_007', 'Stepping in a puddle with socks', '💦', 1700000000006),
  ('seed_008', 'The first bite of pizza', '🍕', 1700000000007),
  ('seed_009', 'Forgetting someones name mid-conversation', '😰', 1700000000008),
  ('seed_010', 'Finding out your favorite show got renewed', '📺', 1700000000009),
  ('seed_011', 'Airport delays', '✈️', 1700000000010),
  ('seed_012', 'A dog that wants to be your friend', '🐕', 1700000000011),
  ('seed_013', 'Waking up thinking its Monday but its Saturday', '😴', 1700000000012),
  ('seed_014', 'Paper cuts', '📄', 1700000000013),
  ('seed_015', 'The perfect parking spot', '🅿️', 1700000000014),
  ('seed_016', 'Running into an ex at the grocery store', '🛒', 1700000000015),
  ('seed_017', 'Clean sheets after a shower', '🛏️', 1700000000016),
  ('seed_018', 'Your phone dying at 1%', '🔋', 1700000000017),
  ('seed_019', 'Free samples at Costco', '🧀', 1700000000018),
  ('seed_020', 'Getting rickrolled', '🎵', 1700000000019),
  ('seed_021', 'A sunset at the beach', '🌅', 1700000000020),
  ('seed_022', 'Realizing you sent a text to the wrong person', '📱', 1700000000021),
  ('seed_023', 'Fresh socks', '🧦', 1700000000022),
  ('seed_024', 'Mosquito bites', '🦟', 1700000000023),
  ('seed_025', 'The last slice of cake', '🍰', 1700000000024),
  ('seed_026', 'Slow WiFi', '📶', 1700000000025),
  ('seed_027', 'A hug from someone you love', '🤗', 1700000000026),
  ('seed_028', 'Sitting on a warm toilet seat in public', '🚽', 1700000000027),
  ('seed_029', 'Finally understanding a math problem', '🧮', 1700000000028),
  ('seed_030', 'When your food arrives at a restaurant', '🍽️', 1700000000029);
