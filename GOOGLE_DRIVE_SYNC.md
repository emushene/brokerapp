# Google Drive Synchronization Feature

This application includes an automated synchronization service that maps a Google Drive folder structure directly into the BrokerApp database.

## How it Works

1.  **Advisors (Folders):** Every top-level folder within the configured `RootFolderId` is treated as an **Advisor**. 
    *   If a folder name matches an existing Advisor in the database, files are synced to them.
    *   If the Advisor does not exist, the system creates a new Advisor record automatically.
2.  **Submissions (Files):** PDF files inside an advisor's folder are parsed and converted into **Submissions**.
3.  **Documents:** The tool captures the Google Drive `webViewLink` for each PDF, making them clickable and viewable directly from the application.

## Synchronization Schedule

*   **Automated:** The system runs a full sync every **6 hours** (4 times a day) as long as the API is running.
*   **Manual:** You can trigger an immediate sync at any time by sending a `POST` request to:
    `{{BaseUrl}}/api/Sync/trigger`

## Filename Convention

To ensure client data is captured correctly, PDF files should follow this naming pattern:
`[ID_NUMBER] [SURNAME] [INITIALS].pdf`

**Examples:**
*   `9005160370086 NGWENYA ZZ.pdf`
*   `8210245063081 SMITH J.pdf`

The system is flexible and can handle ID numbers between 10 and 15 digits, as well as variations in whitespace or separators (spaces, underscores, or dashes).

## Configuration

Settings are managed in `brokerApp.API/appsettings.json`:

```json
"GoogleDrive": {
  "KeyFilePath": "broker-app-key.json",
  "RootFolderIds": [
    "1-0SxxYnKTE7KvHyGIqKqkT6Lu1E_ejhY",
    "1yzKn1dbmK2beyGuY-u1U08kFfE-IJxNB"
  ],
  "ReportsFolderId": "1f8SeFmgi6e5J1wAzR6GpJoH7UKa2WrgT",
  "SyncIntervalMinutes": 180
}
```

*   **KeyFilePath:** The path to the Google Service Account JSON key.
*   **RootFolderIds:** An array of parent folder IDs in Google Drive. Each folder contains advisor subfolders that will be synchronized.
*   **ReportsFolderId:** The ID of the folder where generated reports (like spreadsheets) are stored.
*   **SyncIntervalMinutes:** Frequency of the automated synchronization in minutes.

## Technical Architecture

*   **`GoogleDriveSyncService`**: Contains the core logic for communicating with the Drive API and updating the database.
*   **`GoogleDriveSyncWorker`**: A `BackgroundService` that manages the 6-hour timer.
*   **`SyncController`**: Provides the API endpoint for manual triggers.
