-- Seed: vaste, geordende lijst van schoolgroepen voor lesplannen (po + vo).

INSERT INTO doelgroepen (naam, volgorde) VALUES
  ('Peuters',    1),
  ('Groep 1-2',  2),
  ('Groep 3',    3),
  ('Groep 4',    4),
  ('Groep 5',    5),
  ('Groep 6',    6),
  ('Groep 7',    7),
  ('Groep 8',    8),
  ('VO 1',       9),
  ('VO 2',       10),
  ('VO 3',       11),
  ('VO 4',       12),
  ('VO 5',       13),
  ('VO 6',       14)
ON CONFLICT (naam) DO NOTHING;
