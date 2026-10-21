CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  started_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX runs_expiry ON runs(expires_at);
CREATE TABLE scores (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE REFERENCES runs(id),
  name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 16),
  elapsed_seconds INTEGER NOT NULL CHECK(elapsed_seconds BETWEEN 1 AND 86400),
  goodwill INTEGER NOT NULL CHECK(goodwill BETWEEN 0 AND 100),
  submitted_at INTEGER NOT NULL
);
CREATE INDEX scores_ranking ON scores(elapsed_seconds ASC, goodwill DESC, submitted_at ASC, id ASC);
CREATE TABLE request_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX limits_expiry ON request_limits(expires_at);
