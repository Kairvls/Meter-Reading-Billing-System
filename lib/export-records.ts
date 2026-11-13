import type { ExportSignatories } from "@/lib/export-signatories";
import { DEFAULT_EXPORT_SIGNATORIES } from "@/lib/export-signatories";
import type { MeterRecord } from "@/lib/types";

const reportHeaders = [
  "No.",
  "Date",
  "Account Number:",
  "Account Name:",
  "Address",
  "Meter Number:",
  "Meter Reader :",
  "SEP Meter Reader:",
  "Remarks:",
  "Contact Number",
  "Landmark:",
  "Latitude",
  "Longitude",
  "Date received",
] as const;

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(value = new Date()) {
  const dd = String(value.getDate()).padStart(2, "0");
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const yyyy = value.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatRecordDate(isoDate: string) {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  return isoDate;
}

function reportRows(records: MeterRecord[]) {
  return records.map((r, index) => [
    index + 1,
    formatRecordDate(r.date),
    r.accountNumber,
    r.accountName,
    r.address,
    r.meterNumber,
    r.meterReader,
    r.sepMeterReader || "",
    r.remarks,
    r.contactNumber || "None",
    r.landmark,
    r.latitude || "",
    r.longitude || "",
    r.dateReceived,
  ]);
}

function thinBorder() {
  const side = { style: "thin" as const, color: { argb: "FF000000" } };
  return { top: side, left: side, bottom: side, right: side };
}

function resolveSignatories(signatories?: ExportSignatories) {
  return signatories || DEFAULT_EXPORT_SIGNATORIES;
}

export async function exportRecordsToExcel(
  records: MeterRecord[],
  signatories?: ExportSignatories
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("SUMMARY", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  const colCount = reportHeaders.length;
  const signs = resolveSignatories(signatories);

  sheet.mergeCells(1, 1, 1, colCount);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = "SUMMARY OF DEFECTIVE METERS";
  titleCell.font = { bold: true, size: 14, name: "Calibri" };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  sheet.getCell(2, 9).value = "Date:";
  sheet.getCell(2, 9).font = { bold: true, name: "Calibri", size: 11 };
  sheet.getCell(2, 9).alignment = { horizontal: "right", vertical: "middle" };
  sheet.getCell(2, 10).value = formatDisplayDate();
  sheet.getCell(2, 10).font = { name: "Calibri", size: 11 };
  sheet.getCell(2, 10).alignment = { horizontal: "left", vertical: "middle" };

  const headerRow = sheet.getRow(3);
  reportHeaders.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, name: "Calibri", size: 11 };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder();
  });
  headerRow.height = 24;

  reportRows(records).forEach((rowValues, rowIndex) => {
    const excelRow = sheet.getRow(rowIndex + 4);
    rowValues.forEach((value, colIndex) => {
      const cell = excelRow.getCell(colIndex + 1);
      cell.value = value;
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = {
        horizontal: colIndex === 0 ? "center" : "left",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = thinBorder();
    });
  });

  const widths = [6, 12, 16, 20, 24, 14, 14, 16, 18, 12, 18, 12, 12, 14];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  sheet.getRow(1).height = 22;
  sheet.getRow(2).height = 18;

  // Bordered "Received By:" row immediately under the table (handwritten space)
  const receivedLabelRow = records.length + 4;
  for (let col = 1; col <= colCount; col += 1) {
    const cell = sheet.getCell(receivedLabelRow, col);
    cell.border = thinBorder();
    cell.font = { name: "Calibri", size: 11 };
    cell.alignment = { horizontal: "left", vertical: "middle" };
  }
  sheet.getCell(receivedLabelRow, 2).value = "Received By:";
  sheet.getRow(receivedLabelRow).height = 22;

  // Signatory block: Prepared / Checked / Noted — left / mid / right, left-aligned
  const labelRow = receivedLabelRow + 2;
  const nameRow = labelRow + 2; // exactly one blank row for signature
  const blocks = [signs.preparedBy, signs.checkedBy, signs.notedBy];
  const cols = [2, 5, 9] as const;
  let lastDetailRow = nameRow;

  blocks.forEach((block, index) => {
    const col = cols[index]!;

    const labelCell = sheet.getCell(labelRow, col);
    labelCell.value = block.label;
    labelCell.font = { name: "Calibri", size: 11 };
    labelCell.alignment = { horizontal: "left", vertical: "middle" };

    const nameCell = sheet.getCell(nameRow, col);
    nameCell.value = block.name;
    nameCell.font = { bold: true, name: "Calibri", size: 11 };
    nameCell.alignment = { horizontal: "left", vertical: "middle" };

    const detailLines = block.title
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    detailLines.forEach((line, lineIndex) => {
      const row = nameRow + 1 + lineIndex;
      const detailCell = sheet.getCell(row, col);
      detailCell.value = line;
      detailCell.font = { name: "Calibri", size: 11 };
      detailCell.alignment = { horizontal: "left", vertical: "middle" };
      lastDetailRow = Math.max(lastDetailRow, row);
    });
  });

  // Optional filled-in received note centered below the signatories
  if (signs.receivedBy.trim()) {
    const receivedNoteRow = lastDetailRow + 3;
    sheet.mergeCells(receivedNoteRow, 1, receivedNoteRow, colCount);
    const receivedCell = sheet.getCell(receivedNoteRow, 1);
    receivedCell.value = `Received By: ${signs.receivedBy.trim()}`;
    receivedCell.font = { name: "Calibri", size: 11 };
    receivedCell.alignment = { horizontal: "center", vertical: "middle" };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `SUMMARY-OF-DEFECTIVE-METERS-${stamp()}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportRecordsToPdf(
  records: MeterRecord[],
  signatories?: ExportSignatories
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const signs = resolveSignatories(signatories);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SUMMARY OF DEFECTIVE METERS", pageWidth / 2, 36, { align: "center" });

  doc.setFontSize(11);
  doc.text(`Date: ${formatDisplayDate()}`, pageWidth - 40, 54, { align: "right" });

  autoTable(doc, {
    startY: 68,
    head: [reportHeaders as unknown as string[]],
    body: reportRows(records),
    styles: {
      fontSize: 11,
      cellPadding: 5,
      lineColor: [0, 0, 0],
      lineWidth: 0.4,
      textColor: [0, 0, 0],
      font: "helvetica",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 11,
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.4,
    },
    bodyStyles: { fillColor: [255, 255, 255] },
    columnStyles: { 0: { halign: "center" } },
    margin: { left: 24, right: 24, bottom: 120 },
  });

  const tableEnd =
    (
      doc as unknown as {
        lastAutoTable?: { finalY?: number };
      }
    ).lastAutoTable?.finalY || 120;

  let footerY = Math.max(tableEnd + 36, pageHeight - 100);
  if (footerY > pageHeight - 90) {
    doc.addPage();
    footerY = 72;
  }

  const blocks = [signs.preparedBy, signs.checkedBy, signs.notedBy];
  const positions = [40, pageWidth / 2, pageWidth - 40];
  const aligns: Array<"left" | "center" | "right"> = ["left", "center", "right"];

  blocks.forEach((block, index) => {
    const x = positions[index]!;
    const align = aligns[index]!;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(block.label, x, footerY, { align });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(block.name, x, footerY + 28, { align });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const detailLines = block.title
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    detailLines.forEach((line, lineIndex) => {
      doc.text(line, x, footerY + 42 + lineIndex * 13, { align });
    });
  });

  if (signs.receivedBy.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(
      `Received By: ${signs.receivedBy.trim()}`,
      pageWidth / 2,
      footerY + 80,
      { align: "center" }
    );
  }

  doc.save(`SUMMARY-OF-DEFECTIVE-METERS-${stamp()}.pdf`);
}

export function printRecords(
  records: MeterRecord[],
  signatories?: ExportSignatories
) {
  const signs = resolveSignatories(signatories);
  const escapeHtml = (value: string | number) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const bodyRows = reportRows(records)
    .map(
      (cols) =>
        `<tr>${cols
          .map(
            (value, index) =>
              `<td class="${index === 0 ? "center" : ""}">${escapeHtml(value)}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  const signBlocks = [signs.preparedBy, signs.checkedBy, signs.notedBy]
    .map((block) => {
      const titleHtml = escapeHtml(block.title).replaceAll("\n", "<br/>");
      return `<div class="sign-block">
      <div class="sign-label">${escapeHtml(block.label)}</div>
      <div class="sign-space"></div>
      <div class="sign-name">${escapeHtml(block.name)}</div>
      <div class="sign-title">${titleHtml}</div>
    </div>`;
    })
    .join("");

  const receivedHtml = signs.receivedBy.trim()
    ? `<div class="received">Received By: ${escapeHtml(signs.receivedBy.trim())}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>SUMMARY OF DEFECTIVE METERS</title>
  <style>
    @page { size: landscape; margin: 12mm; }
    body {
      font-family: Calibri, Arial, sans-serif;
      color: #000;
      padding: 12px;
      margin: 0;
    }
    .title {
      text-align: center;
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 10px;
      letter-spacing: 0.02em;
    }
    .meta {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      font-size: 13px;
      margin: 0 0 10px;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 15px;
    }
    th, td {
      border: 1px solid #000;
      padding: 7px 8px;
      vertical-align: middle;
      word-wrap: break-word;
    }
    th {
      background: #fff;
      font-weight: 700;
      text-align: center;
      font-size: 15px;
    }
    td.center { text-align: center; }
    .signatures {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: 48px;
      page-break-inside: avoid;
    }
    .sign-block {
      flex: 1;
      max-width: 32%;
    }
    .sign-block:nth-child(2) { text-align: center; }
    .sign-block:nth-child(3) { text-align: right; }
    .sign-label { font-size: 13px; }
    .sign-space { height: 22px; }
    .sign-name { font-size: 13px; font-weight: 700; }
    .sign-title { font-size: 12px; margin-top: 2px; }
    .received {
      margin-top: 28px;
      text-align: center;
      font-size: 13px;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1 class="title">SUMMARY OF DEFECTIVE METERS</h1>
  <div class="meta"><span>Date:</span><span>${escapeHtml(formatDisplayDate())}</span></div>
  <table>
    <thead>
      <tr>${reportHeaders.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="signatures">${signBlocks}</div>
  ${receivedHtml}
</body>
</html>`;

  const existing = document.getElementById("leyeco-print-frame");
  if (existing) existing.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "leyeco-print-frame";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    throw new Error("Unable to open print view.");
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const triggerPrint = () => {
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(() => {
      iframe.remove();
    }, 1000);
  };

  window.setTimeout(triggerPrint, 300);
}
