/**
 * reportExportService.js
 * 
 * General utilities for exporting AI reports (clipboard copy & markdown download).
 * PDF export is handled in src/services/pdf/pdfExportService.js using @react-pdf/renderer.
 */

export const copyReport = async (reportData) => {
  if (!reportData) return false;
  try {
    await navigator.clipboard.writeText(reportData);
    return true;
  } catch (err) {
    console.error("copyReport:", err);
    return false;
  }
};

export const exportMarkdown = (reportData, investigationId) => {
  if (!reportData) return;
  const pad  = String(investigationId).padStart(5, "0");
  const blob = new Blob([reportData], { type: "text/markdown;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href: url,
    download: `Investigation_INV-${pad}.md`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
