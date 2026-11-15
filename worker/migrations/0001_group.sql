CREATE TABLE travel_members (
  token_hash TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('member', 'organizer', 'guide')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
CREATE TABLE travel_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  sender TEXT NOT NULL,
  role TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX travel_messages_group ON travel_messages(group_id, id);
CREATE TABLE travel_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('meeting', 'program', 'notice')),
  title_sq TEXT NOT NULL,
  title_de TEXT NOT NULL,
  details_sq TEXT NOT NULL,
  details_de TEXT NOT NULL,
  starts_at TEXT,
  location TEXT,
  maps_url TEXT,
  organizer TEXT NOT NULL
);
CREATE INDEX travel_updates_group ON travel_updates(group_id, kind, starts_at);
CREATE TABLE travel_rsvps (
  update_id INTEGER NOT NULL REFERENCES travel_updates(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL REFERENCES travel_members(token_hash),
  PRIMARY KEY(update_id, token_hash)
);
