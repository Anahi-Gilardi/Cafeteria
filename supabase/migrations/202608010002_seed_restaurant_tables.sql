-- Idempotent baseline required by reservations and the salon map.
insert into public.restaurant_tables(name, capacity, active)
values
  ('Mesa 1', 2, true),
  ('Mesa 2', 4, true),
  ('Mesa 3', 2, true),
  ('Mesa 4', 4, true),
  ('Mesa 5', 2, true),
  ('Mesa 6', 4, true),
  ('Mesa 7', 2, true),
  ('Mesa 8', 4, true),
  ('Mesa 9', 2, true),
  ('Mesa 10', 4, true),
  ('Mesa 11', 2, true),
  ('Mesa 12', 4, true)
on conflict (name) do update
set
  capacity = excluded.capacity,
  active = true,
  updated_at = now();
