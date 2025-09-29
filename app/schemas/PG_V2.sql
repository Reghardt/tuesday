CREATE DATABASE tuesday;

\c tuesday -- selects db

\dt -- lists tables

\l -- list databases

DROP TABLE IF EXISTS update_files;
DROP TABLE IF EXISTS cell_files;
DROP TABLE IF EXISTS updates;
DROP TABLE IF EXISTS labels;
DROP TABLE IF EXISTS cells;
DROP TABLE IF EXISTS rows;
DROP TABLE IF EXISTS columns;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS boards;
DROP TABLE IF EXISTS workspaces;

-- auth tables
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS "user";

CREATE TABLE IF NOT EXISTS workspaces(
    id SERIAL PRIMARY KEY,
    name_ TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS boards(
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name_ TEXT NOT NULL,
    pos INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS groups(
    id SERIAL PRIMARY KEY,
    board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name_ TEXT NOT NULL,
    pos INTEGER NOT NULL,
    color TEXT NOT NULL,
    UNIQUE(board_id, pos)
);


CREATE TABLE IF NOT EXISTS columns(
    id SERIAL PRIMARY KEY,
    board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 0),
    name_ TEXT NOT NULL,
    column_type INTEGER NOT NULL,
    type_properties JSONB NOT NULL,
    pos INTEGER NOT NULL,
    UNIQUE(board_id, level, pos) -- prevents duplicate positions and levels
);

CREATE TABLE IF NOT EXISTS rows(
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 0),
    pos INTEGER NOT NULL,
    parent_row_id INTEGER REFERENCES rows(id) ON DELETE CASCADE,
    UNIQUE (group_id, pos, parent_row_id) -- prevent duplicate positions and levels
);

-- -- child row is 1 level deeper than parent
-- ALTER TABLE rows 
-- ADD CONSTRAINT check_parent_level 
-- CHECK (
--     parent_row_id IS NULL OR 
--     level = (SELECT level + 1 FROM rows p WHERE p.id = parent_row_id)
-- )

-- Level 0 rows should have no parent
ALTER TABLE rows 
ADD CONSTRAINT check_level_zero_no_parent 
CHECK (
    (level = 0 AND parent_row_id IS NULL) OR 
    (level > 0 AND parent_row_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS cells(
    row_id INTEGER NOT NULL REFERENCES rows(id) ON DELETE CASCADE,
    column_id INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    PRIMARY KEY (row_id, column_id) -- one cell per intersection
);

CREATE TABLE IF NOT EXISTS labels(
    id SERIAL PRIMARY KEY,
    column_id INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    name_ TEXT NOT NULL,
    color TEXT NOT NULL
);



-- auth tables
create table IF NOT EXISTS "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamp default CURRENT_TIMESTAMP not null, "updatedAt" timestamp default CURRENT_TIMESTAMP not null);

create table IF NOT EXISTS "session" ("id" text not null primary key, "expiresAt" timestamp not null, "token" text not null unique, "createdAt" timestamp default CURRENT_TIMESTAMP not null, "updatedAt" timestamp not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);

create table IF NOT EXISTS "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamp, "refreshTokenExpiresAt" timestamp, "scope" text, "password" text, "createdAt" timestamp default CURRENT_TIMESTAMP not null, "updatedAt" timestamp not null);

create table IF NOT EXISTS "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamp not null, "createdAt" timestamp default CURRENT_TIMESTAMP not null, "updatedAt" timestamp default CURRENT_TIMESTAMP not null);

CREATE TABLE IF NOT EXISTS updates(
    id SERIAL PRIMARY KEY,
    row_id INTEGER NOT NULL REFERENCES rows(id),  
    column_id INTEGER NOT NULL REFERENCES columns(id),
    is_draft BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT NOT NULL REFERENCES "user"(id), -- user should not be able to be deleted if they wrote an update, no cascade
    note TEXT,
    parent_update_id INTEGER REFERENCES updates(id) ON DELETE CASCADE,
    FOREIGN KEY (row_id, column_id) REFERENCES cells(row_id, column_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS update_files(
    id SERIAL PRIMARY KEY,
    update_id INTEGER NOT NULL REFERENCES updates(id) ON DELETE CASCADE,  
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    name_ TEXT NOT NULL,
    extension TEXT NOT NULL,
    UNIQUE(update_id, name_)
);

CREATE TABLE IF NOT EXISTS cell_files(
    id SERIAL PRIMARY KEY,
    row_id INTEGER NOT NULL REFERENCES rows(id) ON DELETE CASCADE,  
    column_id INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT NOT NULL REFERENCES "user"(id),
    name_ TEXT NOT NULL,
    extension TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY (row_id, column_id) REFERENCES cells(row_id, column_id) ON DELETE CASCADE,
    UNIQUE(column_id, row_id, name_)
);