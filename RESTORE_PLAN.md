# Automatic Restore Feature Implementation Plan

Implement a mechanism to restore databases from backup files directly from the History page. This includes support for MySQL, PostgreSQL, and MongoDB, handling both plain SQL/folders and ZIP compressed backups.

## User Review Required

> [!WARNING]
> **Data Overwrite**: Restoring a backup will overwrite current database data. A prominent confirmation dialog will be added to prevent accidental data loss.

> [!IMPORTANT]
> **Binary Tools**: For PostgreSQL and MongoDB, the corresponding restore binaries (`psql.exe` and `mongorestore.exe`) must be added to the `bin/` directory for the "Zero Setup" experience to work for restoration.

## Proposed Changes

### [Backend] Database Services

#### [NEW] [restore.service.ts](file:///c:/Users/gunaw/.gemini/antigravity/scratch/db-backup-tool/src/services/restore.service.ts)
- Implement `restoreBackup(filePath, targetConnection)` logic.
- **MySQL**: Use `mysql2` or shell command.
- **PostgreSQL**: Use `psql` binary.
- **MongoDB**: Use `mongorestore` binary.
- Handle ZIP extraction to a temporary directory before restoration.

#### [MODIFY] [main.ts](file:///c:/Users/gunaw/.gemini/antigravity/scratch/db-backup-tool/src/main.ts)
- Register `restore-backup` IPC handler that takes `filePath` and `targetConnection`.

---

### [Frontend] UI Components

#### [MODIFY] [History.tsx](file:///c:/Users/gunaw/.gemini/antigravity/scratch/db-backup-tool/src/pages/History.tsx)
- Add a "Restore" button to successful backup logs.
- **New Feature**: Clicking Restore opens a **Target Connection Selection** modal.
- User can choose any existing connection (must match the database type of the backup).
- Implement a final confirmation warning: "Are you sure you want to overwrite [Target DB] on [Target Host]?"

---

## Verification Plan

### Automated Tests
- No automated test suite exists. I will perform manual verification.

### Manual Verification
1.  **MySQL Restore**: Create a backup, modify some data in the DB, then trigger "Restore" and verify the data is back to the original state.
2.  **ZIP Restore**: Enable compression, create a backup, then trigger "Restore" and verify it extracts and restores correctly.
3.  **Error Handling**: Attempt to restore a missing file or to a disconnected database and verify the error message is displayed in the UI.
