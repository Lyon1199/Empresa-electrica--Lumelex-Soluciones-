import client from "../api/client";

export interface ElectronicSignatureSettings {
    signer_name: string;
    certificate_configured: boolean;
    certificate_subject: string | null;
    certificate_expires_at: string | null;
}

export async function getElectronicSignatureSettings() {
    const response = await client.get<{ data: ElectronicSignatureSettings }>(
        "/admin/electronic-signature-settings",
    );
    return response.data.data;
}

export async function saveElectronicSignatureSettings(
    signerName: string,
    certificate?: File,
    certificatePassword?: string,
) {
    const formData = new FormData();
    formData.append("signer_name", signerName);
    if (certificate) formData.append("certificate", certificate);
    if (certificatePassword) formData.append("certificate_password", certificatePassword);

    const response = await client.post<{ data: ElectronicSignatureSettings }>(
        "/admin/electronic-signature-settings",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data.data;
}
