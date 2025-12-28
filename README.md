# 🛡️ Advanced DB Backup Tool

A professional, zero-setup database backup utility built with Electron, React, and TypeScript. Designed for reliability, ease of use, and background execution.

## 🚀 Key Features

-   **Zero-Setup MySQL Backups**: Built-in JavaScript-native backup logic for MySQL—no external tools required.
-   **Bundled Binaries**: Support for PostgreSQL and MongoDB using bundled binaries for "portable" execution.
-   **Advanced Scheduling**: 
    -   Daily, Weekly, Monthly frequencies.
    -   **Multiple Times Daily**: Schedule backups at specific times throughout the day (e.g., 08:00, 14:00, 20:00).
-   **Retention Policy**: Automatically clean up old backup files after a user-defined number of days to save disk space.
-   **Background Execution**:
    -   **Minimize to Tray**: Closing the window hides the app in the System Tray (near the clock), keeping your schedules active.
    -   **Auto-Launch**: Automatically starts with Windows (minimized) so your backups are always running.
-   **Real-time Monitoring**:
    -   Interactive Dashboard with success rates and total counts.
    -   Detailed History logs with error reporting and folder shortcuts.
-   **Manual Control**: "Run Backup Now" button for immediate, ad-hoc backups.

## 🛠️ Compatibility

| Database | Method | Compatibility |
| :--- | :--- | :--- |
| **MySQL** | Native JS (Library) | **Zero Setup** (Built-in) |
| **PostgreSQL** | `pg_dump` | Professional (Requires `bin/` files) |
| **MongoDB** | `mongodump` | Professional (Requires `bin/` files) |

## 📦 Setup & Installation

### 1. Developer Environment
```bash
npm install
npm start
```

### 2. Binary Tools (For PostgreSQL & MongoDB)
To make the application fully portable without requiring users to install database tools globally, place the required binaries in the project's `bin/` folder:

-   **PostgreSQL**: Copy `pg_dump.exe` and its associated `.dll` files (from your Postgres `bin` folder) into `projectName/bin/`.
-   **MongoDB**: Copy `mongodump.exe` into `projectName/bin/`.

The application will automatically detect these files and use them without any manual path configuration.

## 🛡️ Background Mode
-   **Minimize**: Clicking the `X` button will hide the application to the System Tray.
-   **Restore**: Double-click the Tray Icon or right-click -> "Open Dashboard".
-   **Quit**: Right-click the Tray Icon and select "Quit" to fully terminate the process and scheduler.

## 💻 Tech Stack
-   **Backend**: Electron (Node.js)
-   **Frontend**: React, Tailwind CSS, Lucide Icons
-   **Storage**: `electron-store` for persistent configuration and history.
-   **Scheduling**: `node-schedule` for cron-based automation.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Built with ❤️ for reliable data protection.
