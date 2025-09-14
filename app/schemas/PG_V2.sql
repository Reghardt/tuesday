CREATE DATABASE tuesday;

\c tuesday -- selects db

\dt -- lists tables

\l -- list databases

CREATE TABLE IF NOT EXISTS workspaces(
    id SERIAL PRIMARY KEY,
    name_ TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_boards(
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name_ TEXT NOT NULL,
    pos INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_board_statuses(
    id SERIAL PRIMARY KEY,
    workspace_board_id INTEGER NOT NULL REFERENCES workspace_boards(id) ON DELETE CASCADE,
    name_ TEXT NOT NULL,
    color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_board_priorities(
    id SERIAL PRIMARY KEY,
    workspace_board_id INTEGER NOT NULL REFERENCES workspace_boards(id) ON DELETE CASCADE,
    name_ TEXT NOT NULL,
    color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_board_groups(
    id SERIAL PRIMARY KEY,
    workspace_board_id INTEGER NOT NULL REFERENCES workspace_boards(id) ON DELETE CASCADE,
    name_ TEXT NOT NULL,
    pos INTEGER NOT NULL,
    UNIQUE(workspace_board_id, pos)
);


CREATE TABLE IF NOT EXISTS workspace_board_columns(
    id SERIAL PRIMARY KEY,
    workspace_board_id INTEGER NOT NULL REFERENCES workspace_boards(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 0),
    name_ TEXT NOT NULL,
    column_type INTEGER NOT NULL,
    type_properties JSONB NOT NULL,
    pos INTEGER NOT NULL,
    UNIQUE(workspace_board_id, level, pos) -- prevents duplicate positions and levels
);

CREATE TABLE IF NOT EXISTS workspace_board_group_rows(
    id SERIAL PRIMARY KEY,
    workspace_board_group_id INTEGER NOT NULL REFERENCES workspace_board_groups(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 0),
    pos INTEGER NOT NULL,
    parent_workspace_board_group_row_id INTEGER REFERENCES workspace_board_group_rows(id) ON DELETE CASCADE,
    UNIQUE (workspace_board_group_id, level, pos) -- prevent duplicate positions and levels
);

-- child row is 1 level deeper than parent
ALTER TABLE workspace_board_group_rows 
ADD CONSTRAINT check_parent_level 
CHECK (
    parent_workspace_board_group_row_id IS NULL OR 
    level = (SELECT level + 1 FROM workspace_board_group_rows p WHERE p.id = parent_workspace_board_group_row_id)
)

-- Level 0 rows should have no parent
ALTER TABLE workspace_board_group_rows 
ADD CONSTRAINT check_level_zero_no_parent 
CHECK (
    (level = 0 AND parent_workspace_board_group_row_id IS NULL) OR 
    (level > 0 AND parent_workspace_board_group_row_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS workspace_board_cells(
    workspace_board_group_row_id INTEGER NOT NULL REFERENCES workspace_board_group_rows(id) ON DELETE CASCADE,
    workspace_board_column_id INTEGER NOT NULL REFERENCES workspace_board_columns(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    PRIMARY KEY (workspace_board_group_row_id, workspace_board_column_id) -- one cell per intersection
);


-- auth tables
create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamp default CURRENT_TIMESTAMP not null, "updatedAt" timestamp default CURRENT_TIMESTAMP not null);

create table "session" ("id" text not null primary key, "expiresAt" timestamp not null, "token" text not null unique, "createdAt" timestamp default CURRENT_TIMESTAMP not null, "updatedAt" timestamp not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);

create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamp, "refreshTokenExpiresAt" timestamp, "scope" text, "password" text, "createdAt" timestamp default CURRENT_TIMESTAMP not null, "updatedAt" timestamp not null);

create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamp not null, "createdAt" timestamp default CURRENT_TIMESTAMP not null, "updatedAt" timestamp default CURRENT_TIMESTAMP not null);




