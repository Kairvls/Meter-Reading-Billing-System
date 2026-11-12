import type { MeterRecord } from "@/lib/types";

const reportHeaders = [
  "No.",
  "Date",
  "Account Number:",
  "Account Name:",
  "Address",
  "Meter Number:",
  "Meter Reader :",
  "Remarks:",
  "Contact Number",
  "Landmark:",
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
    r.remarks,
    r.contactNumber || "None",
    r.landmark,
    r.dateReceived,
  ]);
}

function thinBorder() {
  const side = { style: "thin" as const, color: { argb: "FF000000" } };
  return { top: side, left: side, bottom: side, right: side };
}

export async function exportRecordsToExcel(records: MeterRecord[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("SUMMARY", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  const colCount = reportHeaders.length;

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

  const widths = [6, 12, 16, 22, 28, 16, 16, 22, 14, 28, 18];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });

  sheet.getRow(1).height = 22;
  sheet.getRow(2).height = 18;

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

export async function exportRecordsToPdf(records: MeterRecord[]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SUMMARY OF DEFECTIVE METERS", pageWidth / 2, 36, { align: "center" });

  doc.setFontSize(10);
  doc.text(`Date: ${formatDisplayDate()}`, pageWidth - 40, 54, { align: "right" });

  autoTable(doc, {
    startY: 68,
    head: [reportHeaders as unknown as string[]],
    body: reportRows(records),
    styles: {
      fontSize: 7,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.4,
      textColor: [0, 0, 0],
      font: "helvetica",
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.4,
    },
    bodyStyles: { fillColor: [255, 255, 255] },
    columnStyles: { 0: { halign: "center" } },
    margin: { left: 24, right: 24 },
  });

  doc.save(`SUMMARY-OF-DEFECTIVE-METERS-${stamp()}.pdf`);
}

export function printRecords(records: MeterRecord[]) {
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
      font-size: 18px;
      font-weight: 700;
      margin: 0 0 10px;
      letter-spacing: 0.02em;
    }
    .meta {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      font-size: 12px;
      margin: 0 0 10px;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #000;
      padding: 5px 6px;
      vertical-align: middle;
      word-wrap: break-word;
    }
    th {
      background: #fff;
      font-weight: 700;
      text-align: center;
    }
    td.center { text-align: center; }
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
</body>
</html>`;

  // Use a hidden iframe so browser print works without pop-up permission.
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

  // document.write may not always fire onload reliably across browsers
  window.setTimeout(triggerPrint, 300);
}
