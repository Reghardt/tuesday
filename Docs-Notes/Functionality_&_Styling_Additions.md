# Functionality & Styling Additions

Date: 2025-09-22

This document summarizes the recent functional changes and styling improvements added to the project, along with quick usage notes and enabling/disabling options where applicable.

## Database provisioning (auto-setup)

- Added automatic Postgres provisioning on server startup.
- Utility: `app/utils/dbProvision.server.ts`
  - Ensures target DB exists (creates it if missing).
  - Applies SQL migrations from `app/schemas/migrations/` in order.
  - Statement-by-statement execution with detailed `[db]` logs.
  - Fallback: when no migrations are present, runs sanitized `PG_V2.sql` or `PG.sql`.
- Wired via `app/utils/pool.server.ts` using env vars:
  - `PG_HOST`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`
  - Optional: `PG_PORT`, `PG_SSL`
- Env typings updated in `node-env.d.ts`.
- Docs: See `Docs-Notes/DB_Additions.md` for deep details and troubleshooting.

## Migrations

- Initial migration: `app/schemas/migrations/001_init.sql`
  - Tables: workspaces, boards, groups, columns, rows, cells, updates, and auth tables.
  - Constraint compatibility fix (removed `IF NOT EXISTS` on `ADD CONSTRAINT`).

## Board page improvements

- Sticky header with always-visible create-group form
  - File: `app/routes/workspaces+/$workspace_id+/board.$board_id+/_route.tsx`
  - The "Group name" input and "Create Group" button live in a sticky header that remains in view while scrolling.
  - Bottom duplicate form removed; empty-state text updated accordingly.

- Cleaner layout and spacing to match dark theme aesthetic.

## Column creation UX

- Inline add-column dropdown anchored to the plus icon
  - File: `app/components/Group.tsx`
  - The dropdown opens directly under the plus icon per group, instead of floating on the far right.

- Modular supported column types
  - Config: `app/enums/supportedColumnTypes.ts`
  - Source of truth lists all column types with `{ key, label, enabled }`.
  - Enabled by default: Text, Number, Date, Status, Priority, People, Updates.
  - Disabled/hidden: Time, File, Timeline, Tags, Checkbox (can be turned on later).
  - To enable a type, flip `enabled: true` for that entry.

- Full-screen modal route updated to match
  - File: `app/routes/workspaces+/$workspace_id+/board.$board_id+/createColumn.$group_id.$level.tsx`
  - Uses the same supported-types config; hides unsupported types.

## Group deletion with confirmation

- Server: delete group mutation
  - File: `app/schemas/groups.ts`
  - `deleteGroup` mutation; cascades via DB FKs to rows/cells/updates.

- UI: nice confirmation dialog
  - File: `app/components/ConfirmDialog.tsx`
  - Integrated in `app/components/GroupName.tsx` to replace `window.confirm`.
  - Shows loading while deleting; cancel/confirm actions; accessible modal.

## Dev server noise reduction

- Added static file to satisfy Chrome DevTools probe and silence 404 spam
  - File: `public/.well-known/appspecific/com.chrome.devtools.json`

## How to use

- Provisioning: Start the server with proper PG_* env vars; DB and schema will be ensured automatically.
- Creating groups: Use the header form on the board page.
- Adding columns: Click the plus icon in a group header; select from supported types.
- Deleting groups: Click the Delete action near the group name; confirm in the dialog.

## Enabling additional column types

- Edit `app/enums/supportedColumnTypes.ts` and set `enabled: true` for the type(s) you want to expose.
- Both the inline dropdown and the modal will reflect the change automatically.

## Next steps (optional)

- Add a protected admin tRPC mutation to trigger provisioning on demand.
- Add seed migrations for default statuses/priorities and useful indexes.
- Further a11y: focus management for dialogs and dropdowns, ARIA roles refinement.
