CREATE DATABASE tuesday;

\c tuesday // selects db

\dt // lists tables

DROP TABLE group_cells, group_rows, group_columns, workspace_groups, groups, workspaces;

CREATE TABLE IF NOT EXISTS workspaces(
    id SERIAL PRIMARY KEY,
    name_ TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS groups(
    id SERIAL PRIMARY KEY,
    pos INTEGER NOT NULL,
    parent_group_row_id INTEGER -- REFERENCES group_rows(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspace_groups(
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name_ TEXT NOT NULL,
    PRIMARY KEY (workspace_id, group_id) -- Prevents duplicate relationships, also makes these two fields implicitly not null
);


CREATE TABLE IF NOT EXISTS group_columns(
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    name_ TEXT NOT NULL,
    column_type INTEGER NOT NULL,
    type_properties JSONB NOT NULL,
    pos INTEGER NOT NULL,
    UNIQUE(group_id, pos), -- prevents duplicate positions
    UNIQUE(group_id, name_) -- prevents duplicate column names
);

CREATE TABLE IF NOT EXISTS group_rows(
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    pos INTEGER NOT NULL,
    UNIQUE (group_id, pos) -- prevent duplicate positions
);

CREATE TABLE IF NOT EXISTS group_cells(
    group_row_id INTEGER NOT NULL REFERENCES group_rows(id) ON DELETE CASCADE,
    group_column_id INTEGER NOT NULL REFERENCES group_columns(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    PRIMARY KEY (group_row_id, group_column_id) -- one cell per intersection
);

ALTER TABLE groups
ADD CONSTRAINT fk_groups_parent_group_row_id
FOREIGN KEY (parent_group_row_id) REFERENCES group_rows(id) ON DELETE CASCADE;


