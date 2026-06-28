import React from "react";
import { pdf } from "@react-pdf/renderer";
import InvestigationReportPDF from "./InvestigationReportPDF";
import { parseIssues } from "../../utils/parseIssues";

const padId = (id) => `INV-${String(id).padStart(5, "0")}`;

export const generateInvestigationPDF = async (investigation, aiReport) => {
  if (!investigation) return false;

  try {
    const issues = parseIssues(investigation.issues);
    
    // Create the document element
    const doc = React.createElement(InvestigationReportPDF, {
      investigation,
      aiReport,
      issues
    });

    // Render component to PDF Blob
    const blob = await pdf(doc).toBlob();
    
    // Create download URL
    const url = URL.createObjectURL(blob);
    const filename = `KubeSage_AI_Report_${padId(investigation.id)}.pdf`;
    
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (err) {
    console.error("Failed to generate PDF report:", err);
    return false;
  }
};
