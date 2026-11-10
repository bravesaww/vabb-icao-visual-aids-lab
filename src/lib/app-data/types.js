export const CONNECTOR_TOKEN_HEADER = "x-connector-access-token";
export const CONNECTOR_TOKEN_PENDING_CODE = "connector_token_pending";
export const CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";
export const ConnectorType = {
    GoogleDrive: "GoogleDrive",
    Gmail: "Gmail",
    GoogleCalendar: "GoogleCalendar",
    Outlook: "Outlook",
    OutlookCalendar: "OutlookCalendar",
    MicrosoftTeams: "MicrosoftTeams",
    Mcp: "Mcp",
};
export const GoogleDriveTools = {
    search: "google_drive_search",
    readFile: "google_drive_read_file",
    listFolder: "google_drive_list_folder",
    createFolder: "google_drive_create_folder",
    trashFile: "google_drive_trash_file",
};
export const GoogleCalendarTools = {
    listCalendars: "google_calendar_list_calendars",
    search: "google_calendar_search",
    getEvent: "google_calendar_get_event",
    availability: "google_calendar_availability",
};
