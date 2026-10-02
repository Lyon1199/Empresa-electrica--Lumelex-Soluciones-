import client from "../api/client";
import type { DailyReport, Paginated, Worker } from "./workOrderService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ReportSummary {
    submitted?: number;
    overdue?: number;
    workers?: Array<unknown>;
    payroll?: {
        workers: Array<{
            worker: { id: number; name: string };
            daily_rate: number;
            worked_days: number;
            amount_due: number;
            paid: number;
            balance: number;
            status: "pending" | "partial" | "paid";
            payments: Array<{
                id: number;
                amount: string | number;
                payment_date: string;
                notes?: string | null;
                creator?: { id: number; name: string } | null;
            }>;
        }>;
        total_due: number;
        total_paid: number;
        total_balance: number;
    };
    overdue_days?: Array<{
        worker_id?: number;
        worker_name?: string;
        work_order_id?: number;
        work_order?: { id?: number; number?: string };
        work_order_number?: string;
        report_date?: string;
        date?: string;
    }>;
}

export async function recordWorkerPayment(payload: {
    worker_id: number;
    month: string;
    amount: number;
    payment_date: string;
    notes?: string;
}) {
    const response = await client.post("/worker-payroll-payments", payload);
    return response.data?.data;
}

export interface DailyReportResults {
    data: DailyReport[];
    summary?: ReportSummary;
}

export async function getDailyReports(params: {
    month: string;
    worker_id?: number;
    work_order_id?: number;
}) {
    const response = await client.get("/daily-reports", { params });
    const body = response.data?.data ?? response.data;
    if (Array.isArray(body)) {
        return { data: body as DailyReport[], summary: response.data?.summary as ReportSummary | undefined };
    }
    const result = body as DailyReportResults | Paginated<DailyReport>;
    return {
        data: result?.data ?? [],
        summary: (result as DailyReportResults)?.summary ?? response.data?.summary,
    };
}

const reportDate = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("es-EC");
};

const workerReportFileName = (workerName: string, month: string) => {
    const [year, monthNumber] = month.split("-");
    const monthName = new Intl.DateTimeFormat("es-EC", { month: "long", timeZone: "UTC" })
        .format(new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1)));
    const safeName = workerName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${safeName}-${monthName}-${year}.pdf`;
};

export async function downloadWorkerReport(month: string, workerId: number, workerName: string) {
    const { data: reports } = await getDailyReports({ month, worker_id: workerId });
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setProperties({
        title: `Reporte de ${workerName} - ${month}`,
        subject: `Reportes diarios de ${workerName}`,
        author: "Lumelex",
    });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(`Reporte de trabajo: ${workerName}`, 14, 16);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Periodo: ${new Intl.DateTimeFormat("es-EC", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`))}`, 14, 23);

    autoTable(pdf, {
        startY: 29,
        margin: { left: 10, right: 10, bottom: 14 },
        head: [["Fecha", "Orden de trabajo", "Trabajador", "Trabajo realizado", "Ubicación", "Hora inicio", "Hora fin", "Enviado el"]],
        body: reports.map((report) => [
            reportDate(report.report_date),
            report.work_order?.number ?? `OT #${report.work_order_id}`,
            report.worker?.name ?? workerName,
            report.work_done,
            report.location ?? "—",
            report.start_time?.slice(0, 5) ?? "—",
            report.end_time?.slice(0, 5) ?? "—",
            report.submitted_at
                ? new Intl.DateTimeFormat("es-EC", { dateStyle: "short", timeStyle: "short" }).format(new Date(report.submitted_at))
                : "—",
        ]),
        theme: "grid",
        styles: {
            font: "helvetica",
            fontSize: 7,
            cellPadding: 2,
            overflow: "linebreak",
        },
        headStyles: {
            fillColor: [15, 35, 58],
            textColor: [255, 255, 255],
            fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 30 },
            2: { cellWidth: 34 },
            3: { cellWidth: 72 },
            4: { cellWidth: 43 },
            5: { cellWidth: 20 },
            6: { cellWidth: 20 },
            7: { cellWidth: 35 },
        },
        didDrawPage: () => {
            const page = pdf.getNumberOfPages();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);
            pdf.text(`Lumelex · Página ${page}`, pageWidth - 10, pageHeight - 6, { align: "right" });
        },
    });

    const url = URL.createObjectURL(pdf.output("blob"));
    const link = document.createElement("a");
    link.href = url;
    link.download = workerReportFileName(workerName, month);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export function reportWorkerName(report: DailyReport, workers: Worker[] = []) {
    return report.worker?.name ?? workers.find((worker) => worker.id === report.worker_id)?.name ?? "Trabajador";
}
