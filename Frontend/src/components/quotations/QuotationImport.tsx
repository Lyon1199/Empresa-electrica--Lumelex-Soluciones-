import { useRef, useState } from "react";
import type { QuotationItemCategory } from "../../services/quotationService";

export interface ImportedQuotationItem {
    category: QuotationItemCategory;
    description: string;
    unit: string;
    quantity: string;
    unit_price: string;
}

interface Props {
    onApprove: (items: ImportedQuotationItem[]) => void;
}

const acceptedExtensions = [".pdf", ".xlsx", ".xls", ".docx", ".jpg", ".jpeg", ".png", ".webp"];
const supportedTypes = new Set(["pdf", "xlsx", "xls", "docx", "jpg", "jpeg", "png", "webp"]);

const normalizeNumber = (value: string) => {
    const cleaned = value.replace(/[^\d.,-]/g, "");
    if (!cleaned) return "";
    const comma = cleaned.lastIndexOf(",");
    const dot = cleaned.lastIndexOf(".");
    const decimalIndex = Math.max(comma, dot);
    if (decimalIndex < 0) return cleaned.replace(/[^\d-]/g, "");
    const integer = cleaned.slice(0, decimalIndex).replace(/[.,]/g, "");
    const fraction = cleaned.slice(decimalIndex + 1).replace(/[.,]/g, "");
    return `${integer || "0"}${fraction ? `.${fraction}` : ""}`;
};

interface ParsedSpreadsheetSheet {
    name: string;
    items: ImportedQuotationItem[];
    skippedTaxRows: number;
    skippedLaborRows: number;
    taxPercent: string | null;
}

const normalizedText = (value: unknown) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const spreadsheetNumber = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return normalizeNumber(String(value ?? "").trim());
};

const inferCategory = (description: string): QuotationItemCategory => (
    /\b(instalaci[oó]n|montaje|construcci[oó]n|pruebas?|puesta en servicio|mantenimiento|dise[nñ]o)\b/i.test(description)
        ? "service"
        : "material"
);

function parseSpreadsheetSheet(name: string, rows: unknown[][]): ParsedSpreadsheetSheet | null {
    let headerIndex = -1;
    let columns: { quantity: number; unit: number; description: number; unitPrice: number } | null = null;

    for (let index = 0; index < Math.min(rows.length, 80); index += 1) {
        const headers = rows[index].map(normalizedText);
        const quantity = headers.findIndex((value) => /^(cant(?:idad)?|qty)\.?$/.test(value));
        const unit = headers.findIndex((value) => /^(med|unidad|unit)\.?$/.test(value));
        const description = headers.findIndex((value) => /^(descripcion|detalle|producto|servicio)\.?$/.test(value));
        const unitPrice = headers.findIndex((value) => /^(valor unit(?:ario)?|precio unit(?:ario)?|p unit)\.?$/.test(value));
        if (quantity >= 0 && unit >= 0 && description >= 0 && unitPrice >= 0) {
            headerIndex = index;
            columns = { quantity, unit, description, unitPrice };
            break;
        }
    }

    if (!columns) return null;

    const items: ImportedQuotationItem[] = [];
    let skippedTaxRows = 0;
    let skippedLaborRows = 0;
    let taxPercent: string | null = null;

    for (const row of rows.slice(headerIndex + 1)) {
        const description = String(row[columns.description] ?? "").replace(/\s+/g, " ").trim();
        const combined = normalizedText(row.map((cell) => String(cell ?? "")).join(" "));
        const isTaxRow = /^\s*(iva|impuesto)\b/i.test(description)
            || (!description && /\b(iva|impuesto)\b/.test(combined));
        if (isTaxRow) {
            skippedTaxRows += 1;
            const percent = combined.match(/\b(\d+(?:[.,]\d+)?)\s*%/);
            if (percent) taxPercent = normalizeNumber(percent[1]);
            continue;
        }
        const isSummaryRow = /^\s*(sub.?total|total(?: del servicio| general)?|gran total)\b/i.test(description)
            || (!description && /\b(sub.?total|total(?: del servicio| general)?|gran total)\b/.test(combined));
        if (isSummaryRow) continue;
        if (!description) continue;
        if (/\b(mano de obra|jornal(?:es)?|labor interna)\b/i.test(description)) {
            skippedLaborRows += 1;
            continue;
        }

        const quantity = spreadsheetNumber(row[columns.quantity]);
        const unitPrice = spreadsheetNumber(row[columns.unitPrice]);
        const unit = String(row[columns.unit] ?? "").trim();
        if (!quantity || !unitPrice || Number(quantity) <= 0 || Number(unitPrice) < 0 || !unit) continue;
        items.push({
            category: inferCategory(description),
            description: description.slice(0, 255),
            unit: unit.slice(0, 30),
            quantity,
            unit_price: unitPrice,
        });
    }

    return { name, items, skippedTaxRows, skippedLaborRows, taxPercent };
}

const parseRows = (text: string): ImportedQuotationItem[] => {
    const rows: ImportedQuotationItem[] = [];
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.replace(/\s+/g, " ").trim();
        if (/\b(iva|impuesto|subtotal|total(?: del servicio| general)?|gran total)\b/i.test(line)) continue;
        if (/\b(mano de obra|jornal(?:es)?|labor interna)\b/i.test(line)) continue;
        if (line.length < 4 || /^(descripci[oó]n|detalle|producto|cantidad|subtotal|total|p[aá]gina)\b/i.test(line)) {
            continue;
        }
        const numbers = [...line.matchAll(/(?:[$€]\s*)?-?\d[\d.,]*/g)];
        if (numbers.length < 2) continue;
        let quantityMatch = numbers[numbers.length - 2];
        let priceMatch = numbers[numbers.length - 1];
        if (numbers.length >= 3) {
            const quantityBeforeTotal = normalizeNumber(numbers[numbers.length - 3][0]);
            const priceBeforeTotal = normalizeNumber(numbers[numbers.length - 2][0]);
            const rowTotal = normalizeNumber(numbers[numbers.length - 1][0]);
            if (
                quantityBeforeTotal
                && priceBeforeTotal
                && rowTotal
                && Math.abs(Number(quantityBeforeTotal) * Number(priceBeforeTotal) - Number(rowTotal))
                    <= Math.max(0.02, Number(rowTotal) * 0.005)
            ) {
                quantityMatch = numbers[numbers.length - 3];
                priceMatch = numbers[numbers.length - 2];
            }
        }
        const descriptionWithUnit = line.slice(0, quantityMatch.index).replace(/[|;,\s]+$/, "").trim();
        if (!descriptionWithUnit) continue;
        const unitMatch = descriptionWithUnit.match(/\b(m|km|cm|mm|m2|m3|u|und|unidad|unidades|pza|piezas|rollo|kg|hora|servicio|circuito|punto|lote)\s*$/i);
        const description = unitMatch
            ? descriptionWithUnit.slice(0, unitMatch.index).replace(/[|;,\s]+$/, "").trim()
            : descriptionWithUnit;
        if (description.length < 2) continue;
        const quantity = normalizeNumber(quantityMatch[0]);
        const unit_price = normalizeNumber(priceMatch[0]);
        if (!quantity || !unit_price || Number(quantity) <= 0 || Number(unit_price) < 0) continue;
        rows.push({
            category: inferCategory(description),
            description: description.slice(0, 255),
            unit: unitMatch?.[1] ?? "unidad",
            quantity,
            unit_price,
        });
    }
    return rows;
};

async function extractText(file: File, extension: string, progress: (value: string) => void) {
    if (extension === "docx") {
        progress("Extrayendo texto del documento Word en este navegador…");
        const mammoth = await import("mammoth/mammoth.browser");
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        return result.value;
    }

    if (extension === "pdf") {
        progress("Leyendo texto del PDF…");
        const pdfjs = await import("pdfjs-dist");
        const pdfWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker.default;
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        const pageTexts: string[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const content = await page.getTextContent();
            let pageText = "";
            let previousY: number | null = null;
            for (const item of content.items) {
                if (!("str" in item) || !item.str.trim()) continue;
                const y = item.transform[5];
                pageText += previousY !== null && Math.abs(previousY - y) > 3 ? "\n" : " ";
                pageText += item.str;
                previousY = y;
            }
            pageTexts.push(pageText);
        }
        const text = pageTexts.join("\n");
        if (text.replace(/\s/g, "").length > 20 && parseRows(text).length > 0) return text;
        progress("PDF escaneado: renderizando páginas para OCR local…");
        const worker = await (await import("tesseract.js")).createWorker("spa", 1, {
            logger: ({ status, progress: percent }) =>
                progress(`${status}${percent ? ` (${Math.round(percent * 100)}%)` : ""}`),
        });
        try {
            const recognized: string[] = [];
            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                const page = await pdf.getPage(pageNumber);
                const viewport = page.getViewport({ scale: 1.8 });
                const canvas = document.createElement("canvas");
                canvas.width = Math.ceil(viewport.width);
                canvas.height = Math.ceil(viewport.height);
                const context = canvas.getContext("2d");
                if (!context) throw new Error("No se pudo preparar la página del PDF para OCR.");
                await page.render({ canvas, canvasContext: context, viewport }).promise;
                const result = await worker.recognize(canvas);
                recognized.push(result.data.text);
                canvas.width = 0;
                canvas.height = 0;
            }
            return recognized.join("\n");
        } finally {
            await worker.terminate();
        }
    }

    progress("Reconociendo texto de la imagen localmente…");
    const worker = await (await import("tesseract.js")).createWorker("spa", 1, {
        logger: ({ status, progress: percent }) =>
            progress(`${status}${percent ? ` (${Math.round(percent * 100)}%)` : ""}`),
    });
    try {
        const result = await worker.recognize(file);
        return result.data.text;
    } finally {
        await worker.terminate();
    }
}

export default function QuotationImport({ onApprove }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState("");
    const [error, setError] = useState("");
    const [rows, setRows] = useState<ImportedQuotationItem[]>([]);
    const [working, setWorking] = useState(false);
    const [spreadsheetSheets, setSpreadsheetSheets] = useState<ParsedSpreadsheetSheet[]>([]);
    const [selectedSheet, setSelectedSheet] = useState("");
    const [importSummary, setImportSummary] = useState("");

    const selectSheet = (sheetName: string, sheets = spreadsheetSheets) => {
        const selected = sheets.find((sheet) => sheet.name === sheetName);
        if (!selected) return;
        setSelectedSheet(selected.name);
        setRows(selected.items);
        const summary = [
            selected.taxPercent ? `IVA ${selected.taxPercent}% detectado y excluido; el sistema calculará el IVA una sola vez.` : "",
            selected.skippedTaxRows ? `${selected.skippedTaxRows} fila(s) de impuesto excluidas.` : "",
            selected.skippedLaborRows ? `${selected.skippedLaborRows} fila(s) explícitas de mano de obra excluidas del detalle para el cliente; registra ese costo en Mano de obra interna.` : "",
        ].filter(Boolean).join(" ");
        setImportSummary(summary);
        setProgress(`Hoja "${selected.name}": ${selected.items.length} partida(s) reconocida(s). Revisa los datos antes de aprobar.`);
    };

    const importFile = async (file?: File) => {
        if (!file) return;
        const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
        if (!supportedTypes.has(extension)) {
            setError(`Formato no compatible. Elige: ${acceptedExtensions.join(", ")}.`);
            setRows([]);
            return;
        }
        setWorking(true);
        setError("");
        setRows([]);
        setSpreadsheetSheets([]);
        setSelectedSheet("");
        setImportSummary("");
        setProgress("Preparando archivo para lectura local…");
        try {
            if (extension === "xlsx" || extension === "xls") {
                setProgress("Identificando columnas y hojas de la hoja de cálculo…");
                const XLSX = await import("@e965/xlsx");
                const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: true });
                const sheets = workbook.SheetNames
                    .map((name) => parseSpreadsheetSheet(
                        name,
                        XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "" }) as unknown[][]
                    ))
                    .filter((sheet): sheet is ParsedSpreadsheetSheet => sheet !== null && sheet.items.length > 0);
                if (sheets.length) {
                    setSpreadsheetSheets(sheets);
                    selectSheet(sheets[0].name, sheets);
                    return;
                }
                throw new Error("No se encontraron columnas reconocibles de cantidad, unidad, descripción y precio unitario. Revisa el formato del Excel o conviértelo a una plantilla compatible.");
            }
            const text = await extractText(file, extension, setProgress);
            const parsed = parseRows(text);
            if (!parsed.length) {
                throw new Error("No se encontraron partidas legibles. Revisa que el documento tenga filas con descripción, cantidad y precio, o agrega las partidas manualmente.");
            }
            setRows(parsed);
            setProgress(`Se encontraron ${parsed.length} fila(s). Revisa y aprueba antes de agregarlas.`);
        } catch (parseError) {
            setError(parseError instanceof Error ? parseError.message : "No se pudo leer el archivo.");
            setProgress("");
        } finally {
            setWorking(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const updateRow = (index: number, field: keyof ImportedQuotationItem, value: string) =>
        setRows((current) => current.map((row, rowIndex) =>
            rowIndex === index ? { ...row, [field]: value } : row
        ));

    return (
        <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h2 className="font-semibold text-slate-900">Importar partidas desde un archivo</h2>
                    <p className="mt-1 text-sm text-slate-600">PDF, Excel, Word (.docx), JPG, PNG o WEBP. El archivo se procesa en este navegador y no se envía al servidor.</p>
                </div>
                <button type="button" disabled={working} onClick={() => inputRef.current?.click()} className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50">
                    {working ? "Procesando…" : "Elegir archivo"}
                </button>
                <input ref={inputRef} type="file" accept={acceptedExtensions.join(",")} className="hidden" onChange={(event) => void importFile(event.target.files?.[0])} />
            </div>
            {progress && <p role="status" className="mt-3 text-sm text-blue-800">{progress}</p>}
            {error && <p role="alert" className="mt-3 rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
            {spreadsheetSheets.length > 0 && (
                <label className="mt-4 block max-w-xl text-sm font-medium text-slate-700">
                    Hoja a importar
                    <select value={selectedSheet} onChange={(event) => selectSheet(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5">
                        {spreadsheetSheets.map((sheet) => (
                            <option key={sheet.name} value={sheet.name}>
                                {sheet.name} · {sheet.items.length} partidas{sheet.taxPercent ? ` · IVA ${sheet.taxPercent} excluido` : ""}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            {importSummary && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{importSummary}</p>}
            {rows.length > 0 && (
                <div className="mt-4 space-y-3">
                    <p className="text-sm font-medium text-slate-700">Confirma y corrige los datos extraídos. Las filas se agregarán a la cotización solo al aprobarlas.</p>
                    {rows.map((row, index) => (
                        <div key={`${index}-${row.description}`} className="grid gap-2 rounded-lg border border-blue-200 bg-white p-3 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr]">
                            <label className="text-xs font-semibold text-slate-600">Descripción
                                <input value={row.description} onChange={(event) => updateRow(index, "description", event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm font-normal" />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">Unidad
                                <input value={row.unit} onChange={(event) => updateRow(index, "unit", event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm font-normal" />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">Cantidad
                                <input inputMode="decimal" value={row.quantity} onChange={(event) => updateRow(index, "quantity", event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm font-normal" />
                            </label>
                            <label className="text-xs font-semibold text-slate-600">Precio unitario
                                <input inputMode="decimal" value={row.unit_price} onChange={(event) => updateRow(index, "unit_price", event.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm font-normal" />
                            </label>
                        </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => {
                            const validRows = rows.filter((row) =>
                                row.description.trim()
                                && row.unit.trim()
                                && /^\d+(?:[.,]\d+)?$/.test(row.quantity.trim())
                                && Number(row.quantity.replace(",", ".")) > 0
                                && /^\d+(?:[.,]\d+)?$/.test(row.unit_price.trim())
                                && Number(row.unit_price.replace(",", ".")) >= 0
                            );
                            if (validRows.length !== rows.length) {
                                setError("Corrige todas las filas: descripción y unidad requeridas, cantidad mayor a cero y precio válido.");
                                return;
                            }
                            onApprove(rows);
                            setRows([]);
                            setProgress(`${validRows.length} fila(s) aprobada(s) y agregada(s) al formulario.`);
                        }} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
                            Aprobar y agregar {rows.length} partida(s)
                        </button>
                        <button type="button" onClick={() => { setRows([]); setProgress(""); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Descartar filas</button>
                    </div>
                </div>
            )}
        </section>
    );
}
