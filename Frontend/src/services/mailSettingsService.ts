import client from "../api/client";

export interface MailSettings {
    configured: boolean;
    provider: "smtp" | "microsoft";
    host: string | null;
    port: number | null;
    scheme: "smtp" | "smtps";
    username: string | null;
    from_address: string | null;
    from_name: string | null;
    password_configured: boolean;
    microsoft_connected: boolean;
    microsoft_email: string | null;
    microsoft_app_configured: boolean;
    microsoft_client_id: string | null;
    microsoft_client_secret_configured: boolean;
    microsoft_redirect_uri: string;
}

export interface MailSettingsPayload {
    host: string;
    port: number;
    scheme: "smtp" | "smtps";
    username: string;
    password?: string;
    from_address: string;
    from_name: string;
}

export async function getMailSettings() {
    const response = await client.get<{ data: MailSettings }>("/admin/mail-settings");
    return response.data.data;
}

export async function saveMailSettings(payload: MailSettingsPayload) {
    const response = await client.put<{ data: MailSettings }>("/admin/mail-settings", payload);
    return response.data.data;
}

export async function sendTestEmail(to: string) {
    const response = await client.post<{ message: string }>("/admin/mail-settings/test", { to });
    return response.data.message;
}

export async function startMicrosoftMailConnection() {
    const response = await client.post<{ authorization_url: string }>("/admin/mail-settings/microsoft/connect");
    return response.data.authorization_url;
}

export async function saveMicrosoftAppCredentials(payload: {
    client_id: string;
    client_secret?: string;
}) {
    const response = await client.put<{ data: MailSettings }>("/admin/mail-settings/microsoft/app", payload);
    return response.data.data;
}

export async function activateMicrosoftMail() {
    const response = await client.put<{ data: MailSettings }>("/admin/mail-settings/microsoft/activate");
    return response.data.data;
}
