-- Esquema inicial SQLite. Executar uma vez por migration versionada.
-- Habilitar foreign_keys em TODAS as conexões, inclusive fora deste script.
PRAGMA foreign_keys = ON;

CREATE TABLE users (
    id INTEGER PRIMARY KEY CHECK (id > 0),
    username TEXT NOT NULL UNIQUE
      CHECK (length(username) BETWEEN 3 AND 50)
      CHECK (username = lower(username))
      CHECK (username NOT GLOB '*[^a-z0-9_.-]*'),
    name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
    password_hash TEXT NOT NULL CHECK (length(password_hash) > 0),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT CHECK (id > 0),
    title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 120 AND title = trim(title)),
    description TEXT NOT NULL CHECK (length(description) BETWEEN 10 AND 5000 AND description = trim(description)),
    category TEXT NOT NULL CHECK (category IN ('TI', 'RH', 'COMPRAS', 'FINANCEIRO', 'INFRAESTRUTURA')),
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO', 'EM_ATENDIMENTO', 'CONCLUIDO')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_requests_created ON requests(created_at DESC, id DESC);
CREATE INDEX idx_requests_status_created ON requests(status, created_at DESC);
CREATE INDEX idx_requests_category_created ON requests(category, created_at DESC);
CREATE INDEX idx_requests_requester ON requests(requester_id);

CREATE TRIGGER requests_immutable_identity
BEFORE UPDATE OF requester_id, created_at ON requests
WHEN NEW.requester_id != OLD.requester_id OR NEW.created_at != OLD.created_at
BEGIN
    SELECT RAISE(ABORT, 'request_identity_immutable');
END;

CREATE TRIGGER requests_edit_only_open
BEFORE UPDATE OF title, description, category ON requests
WHEN OLD.status != 'ABERTO'
  AND (NEW.title != OLD.title OR NEW.description != OLD.description OR NEW.category != OLD.category)
BEGIN
    SELECT RAISE(ABORT, 'request_not_open');
END;

CREATE TRIGGER requests_delete_only_open
BEFORE DELETE ON requests
WHEN OLD.status != 'ABERTO'
BEGIN
    SELECT RAISE(ABORT, 'request_not_open');
END;

CREATE TRIGGER requests_forward_status
BEFORE UPDATE OF status ON requests
WHEN NOT (
    NEW.status = OLD.status
    OR (OLD.status = 'ABERTO' AND NEW.status = 'EM_ATENDIMENTO')
    OR (OLD.status = 'EM_ATENDIMENTO' AND NEW.status = 'CONCLUIDO')
)
BEGIN
    SELECT RAISE(ABORT, 'invalid_status_transition');
END;

CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY NOT NULL
      CHECK (length(token_hash) = 64 AND token_hash NOT GLOB '*[^a-f0-9]*'),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL CHECK (length(csrf_token) >= 32),
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL CHECK (expires_at > created_at)
);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);
