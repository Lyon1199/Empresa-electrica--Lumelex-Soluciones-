import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import companyLogoUrl from "../assets/lumelex-logo.png";
import type { Quotation } from "./quotationService";

const navy: [number, number, number] = [15, 35, 58];
const amber: [number, number, number] = [245, 176, 0];
const slate: [number, number, number] = [83, 96, 112];
const lightSlate: [number, number, number] = [241, 245, 249];

interface JsPdfWithAutoTable extends jsPDF {
    lastAutoTable: {
        finalY: number;
    };
}

const money = (value: number | string) =>
    new Intl.NumberFormat("es-EC", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    }).format(Number(value) || 0);

const formatDate = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("es-EC");
};

const loadLogo = async (): Promise<string> => {
    const response = await fetch(companyLogoUrl);
    if (!response.ok) {
        throw new Error("No se pudo cargar el logotipo de Lumelex.");
    }
    const logoBlob = await response.blob();

    const logo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("No se pudo procesar el logotipo de Lumelex."));
            }
        };
        reader.onerror = () => reject(
            reader.error ?? new Error("No se pudo procesar el logotipo de Lumelex.")
        );
        reader.readAsDataURL(logoBlob);
    });

    return logo;
};

const addSectionTitle = (pdf: jsPDF, title: string, y: number): number => {
    pdf.setFillColor(...lightSlate);
    pdf.roundedRect(14, y, 182, 8, 1.5, 1.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...navy);
    pdf.text(title.toUpperCase(), 18, y + 5.4);
    return y + 13;
};

const writeParagraph = (
    pdf: jsPDF,
    value: string,
    x: number,
    y: number,
    width: number
): number => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...slate);
    const lines: string[] = pdf.splitTextToSize(value, width);
    const pageHeight = pdf.internal.pageSize.getHeight();
    let currentY = y;

    while (lines.length > 0) {
        const availableLines = Math.floor((pageHeight - 22 - currentY) / 4.5);
        if (availableLines < 1) {
            pdf.addPage();
            currentY = 20;
            continue;
        }

        const pageLines = lines.splice(0, availableLines);
        pdf.text(pageLines, x, currentY);
        currentY += pageLines.length * 4.5;

        if (lines.length > 0) {
            pdf.addPage();
            currentY = 20;
        }
    }

    return currentY;
};

export const quotationPdfFileName = (quotation: Quotation) =>
    `Cotizacion-${quotation.number.replace(/[^a-zA-Z0-9-_]/g, "-")}.pdf`;

export const generateQuotationPdfBlob = async (quotation: Quotation): Promise<Blob> => {
    const logo = await loadLogo();
    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    }) as JsPdfWithAutoTable;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 14;

    pdf.setProperties({
        title: `Cotización ${quotation.number} - Lumelex`,
        subject: quotation.title,
        author: "Lumelex SAS",
        creator: "Lumelex Soluciones Eléctricas e Ingeniería",
    });

    pdf.addImage(logo, "PNG", margin, 8, 29, 29);
    pdf.setTextColor(...navy);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("LUMELEX SAS", 47, 17);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...slate);
    pdf.text("SOLUCIONES ELÉCTRICAS E INGENIERÍA", 47, 23);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(...navy);
    pdf.text("COTIZACIÓN", pageWidth - margin, 16, { align: "right" });
    pdf.setFontSize(10);
    pdf.setTextColor(...slate);
    pdf.text(quotation.number, pageWidth - margin, 22, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`Emitida: ${formatDate(quotation.issue_date)}`, pageWidth - margin, 28, {
        align: "right",
    });

    pdf.setDrawColor(...amber);
    pdf.setLineWidth(1.2);
    pdf.line(margin, 40, pageWidth - margin, 40);

    let y = 48;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(...navy);
    const titleLines = pdf.splitTextToSize(quotation.title, pageWidth - margin * 2);
    pdf.text(titleLines, margin, y);
    y += titleLines.length * 7 + 4;

    y = addSectionTitle(pdf, "Datos del cliente y vigencia", y);
    const boxY = y - 5;
    pdf.setDrawColor(220, 226, 234);
    pdf.roundedRect(margin, boxY, pageWidth - margin * 2, 29, 2, 2, "S");

    const columnX = 109;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...navy);
    pdf.text("CLIENTE", margin + 4, boxY + 6);
    pdf.text("IDENTIFICACIÓN", margin + 4, boxY + 17);
    pdf.text("VIGENCIA", columnX, boxY + 6);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...slate);
    pdf.text(pdf.splitTextToSize(quotation.customer_name, 80), margin + 4, boxY + 11);
    pdf.text(quotation.customer_identification, margin + 4, boxY + 22);
    pdf.text(
        `${formatDate(quotation.issue_date)} al ${formatDate(quotation.valid_until)}`,
        columnX,
        boxY + 12
    );
    if (quotation.customer_email) {
        pdf.setFontSize(8);
        pdf.text(pdf.splitTextToSize(quotation.customer_email, 80), columnX, boxY + 20);
    }
    if (quotation.customer_address) {
        pdf.setFontSize(8);
        pdf.text(
            pdf.splitTextToSize(quotation.customer_address, 80),
            columnX,
            boxY + (quotation.customer_email ? 25 : 20)
        );
    }
    y = boxY + 36;

    if (quotation.scope) {
        y = addSectionTitle(pdf, "Alcance del trabajo", y);
        y = writeParagraph(pdf, quotation.scope, margin + 1, y, pageWidth - margin * 2 - 2) + 5;
    }

    const categoryLabels: Record<string, string> = {
        material: "Materiales",
        labor: "Mano de obra",
        equipment: "Equipos",
        service: "Servicios",
        other: "Otros",
    };
    autoTable(pdf, {
        startY: y,
        margin: { left: margin, right: margin, bottom: 24 },
        head: [["DESCRIPCIÓN", "UNIDAD", "CANT.", "PRECIO UNIT.", "IMPORTE"]],
        body: quotation.items.map((item) => [
            `${categoryLabels[item.category] ?? item.category}: ${item.description}`,
            item.unit,
            Number(item.quantity).toLocaleString("es-EC", { maximumFractionDigits: 3 }),
            money(item.unit_price),
            money(item.line_total),
        ]),
        theme: "grid",
        styles: {
            font: "helvetica",
            fontSize: 8,
            cellPadding: 3,
            textColor: slate,
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
            overflow: "linebreak",
        },
        headStyles: {
            fillColor: navy,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 7,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 78 },
            1: { cellWidth: 23 },
            2: { cellWidth: 18, halign: "right" },
            3: { cellWidth: 28, halign: "right" },
            4: { cellWidth: 28, halign: "right" },
        },
    });

    const tableEndY = pdf.lastAutoTable.finalY;
    let summaryY = tableEndY + 8;
    const summaryHeight = 29;
    if (summaryY + summaryHeight > pageHeight - 30) {
        pdf.addPage();
        summaryY = 20;
    }
    const summaryX = pageWidth - margin - 76;
    const summaryWidth = 76;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...slate);
    pdf.text("Subtotal", summaryX, summaryY);
    pdf.text(money(quotation.subtotal), summaryX + summaryWidth, summaryY, { align: "right" });
    pdf.text(`Descuento (${Number(quotation.discount_percent)}%)`, summaryX, summaryY + 6);
    pdf.text(`-${money(quotation.discount_amount)}`, summaryX + summaryWidth, summaryY + 6, { align: "right" });
    pdf.text(`IVA (${Number(quotation.tax_percent)}%)`, summaryX, summaryY + 12);
    pdf.text(money(quotation.tax_amount), summaryX + summaryWidth, summaryY + 12, { align: "right" });
    pdf.setDrawColor(...amber);
    pdf.setLineWidth(0.8);
    pdf.line(summaryX, summaryY + 16, summaryX + summaryWidth, summaryY + 16);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...navy);
    pdf.text("TOTAL", summaryX, summaryY + 23);
    pdf.text(money(quotation.total), summaryX + summaryWidth, summaryY + 23, { align: "right" });

    y = summaryY + summaryHeight + 5;
    if (quotation.terms) {
        if (y > pageHeight - 40) {
            pdf.addPage();
            y = 20;
        }
        y = addSectionTitle(pdf, "Términos y condiciones", y);
        y = writeParagraph(pdf, quotation.terms, margin + 1, y, pageWidth - margin * 2 - 2) + 5;
    }
    if (quotation.notes) {
        if (y > pageHeight - 40) {
            pdf.addPage();
            y = 20;
        }
        y = addSectionTitle(pdf, "Observaciones", y);
        y = writeParagraph(pdf, quotation.notes, margin + 1, y, pageWidth - margin * 2 - 2) + 5;
    }

    if (y + 25 > pageHeight - 22) {
        pdf.addPage();
        y = 24;
    }
    pdf.setDrawColor(148, 163, 184);
    pdf.setLineWidth(0.3);
    pdf.line(margin + 8, y + 14, margin + 72, y + 14);
    pdf.line(pageWidth - margin - 72, y + 14, pageWidth - margin - 8, y + 14);
    pdf.setFont("times", "italic");
    pdf.setFontSize(17);
    pdf.setTextColor(...navy);
    pdf.text("Alex Lucas", margin + 40, y + 10, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...slate);
    pdf.text("Alex Lucas · Gerente", margin + 40, y + 19, { align: "center" });
    pdf.text("ACEPTACIÓN DEL CLIENTE", pageWidth - margin - 40, y + 19, { align: "center" });

    const pageCount = pdf.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(...slate);
        pdf.text("LUMELEX SAS · Soluciones eléctricas e ingeniería · Valores en USD", margin, pageHeight - 9);
        pdf.text(`Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 9, {
            align: "right",
        });
    }

    return pdf.output("blob");
};

export const downloadQuotationPdf = async (quotation: Quotation): Promise<void> => {
    const blob = await generateQuotationPdfBlob(quotation);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = quotationPdfFileName(quotation);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};
