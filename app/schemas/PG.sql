CREATE DATABASE tuesday;

\c tuesday -- selects db

\dt -- lists tables

\l -- list databases

ALTER TABLE groups DROP CONSTRAINT IF EXISTS fk_groups_parent_row;

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS group_cells;
DROP TABLE IF EXISTS group_rows;
DROP TABLE IF EXISTS group_columns;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS workspace_statuses;
DROP TABLE IF EXISTS workspace_priorities;
DROP TABLE IF EXISTS workspaces;

CREATE TABLE IF NOT EXISTS workspaces(
    id SERIAL PRIMARY KEY,
    name_ TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_statuses(
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name_ TEXT NOT NULL,
    color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_priorities(
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name_ TEXT NOT NULL,
    color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS groups(
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER, -- REFERENCES workspaces(id) ON DELETE CASCADE
    parent_group_row_id INTEGER, -- REFERENCES group_rows(id) ON DELETE CASCADE
    name_ TEXT NOT NULL,
    pos INTEGER NOT NULL,
    -- Ensure exactly one of the two foreign keys is set
    CHECK (
        (workspace_id IS NOT NULL AND parent_group_row_id IS NULL) OR
        (workspace_id IS NULL AND parent_group_row_id IS NOT NULL)
    )
);


CREATE TABLE IF NOT EXISTS group_columns(
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name_ TEXT NOT NULL,
    column_type INTEGER NOT NULL,
    type_properties JSONB NOT NULL,
    pos INTEGER NOT NULL,
    UNIQUE(group_id, pos) -- prevents duplicate positions
);

CREATE TABLE IF NOT EXISTS group_rows(
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    pos INTEGER NOT NULL,
    UNIQUE (group_id, pos) -- prevent duplicate positions
);

ALTER TABLE groups 
ADD CONSTRAINT fk_groups_workspace 
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE groups 
ADD CONSTRAINT fk_groups_parent_row 
FOREIGN KEY (parent_group_row_id) REFERENCES group_rows(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX CONCURRENTLY idx_groups_workspace_pos 
ON groups (workspace_id, pos) 
WHERE parent_group_row_id IS NULL;

CREATE UNIQUE INDEX CONCURRENTLY idx_groups_parent_pos 
ON groups (parent_group_row_id, pos) 
WHERE workspace_id IS NULL;

CREATE TABLE IF NOT EXISTS group_cells(
    group_row_id INTEGER NOT NULL REFERENCES group_rows(id) ON DELETE CASCADE,
    group_column_id INTEGER NOT NULL REFERENCES group_columns(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    PRIMARY KEY (group_row_id, group_column_id) -- one cell per intersection
);




