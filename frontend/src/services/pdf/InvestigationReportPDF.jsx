import React from "react";
import { Document, Page, View, Text, Font } from "@react-pdf/renderer";
import { S, C } from "./PdfStyles";

// Disable word hyphenation globally
Font.registerHyphenationCallback((word) => [word]);

const padId = (id) => `INV-${String(id).padStart(5, "0")}`;

function fmtDate(iso) {
  if (!iso) return { date: "—", time: "—", full: "—" };
  try {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString("en-US", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
    const timeStr = d.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const timeFull = `${timeStr} IST`;
    return { date: dateStr, time: timeFull, full: `${dateStr}  ·  ${timeFull}` };
  } catch {
    return { date: iso, time: "", full: iso };
  }
}

function fmtDuration(s) {
  if (s == null) return "—";
  if (s < 1) return `${Math.round(s * 1000)} ms`;
  if (s < 60) return `${s.toFixed(1)} s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function parseMarkdown(md) {
  const result = {
    executiveSummary: "",
    impactAssessment: "",
    immediateActions: [],
    shortTermImprovements: [],
    longTermPreventiveMeasures: [],
    commands: []
  };

  if (!md) return result;

  const lines = md.split("\n");
  let currentSection = "";
  let currentSubsection = "";
  let inCode = false;
  let codeBuf = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      if (inCode) {
        if (currentSection === "commands") {
          result.commands.push(...codeBuf);
        }
        inCode = false;
        codeBuf = [];
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      const cleanedCmd = rawLine.trim().replace(/^\$\s*/, "");
      if (cleanedCmd) codeBuf.push(cleanedCmd);
      continue;
    }

    const sectionMatch = line.match(/^#{1,3}\s+(.+)/);
    if (sectionMatch) {
      const title = sectionMatch[1].replace(/\*\*/g, "").trim().toLowerCase();
      if (title.includes("summary")) {
        currentSection = "summary";
      } else if (title.includes("impact")) {
        currentSection = "impact";
      } else if (title.includes("command") || title.includes("diagnostic") || title.includes("verification")) {
        currentSection = "commands";
      } else if (title.includes("recommend")) {
        currentSection = "recommendations";
      } else {
        currentSection = "";
      }
      currentSubsection = "";
      continue;
    }

    if (!currentSection) continue;
    if (!line || line === "---") continue;

    if (currentSection === "recommendations") {
      const boldSubMatch = line.match(/^\*\*(.+?)\*\*:?$/);
      const level3Match = line.match(/^###\s+(.+)/);
      const subheading = (boldSubMatch?.[1] || level3Match?.[1] || "").toLowerCase();

      if (subheading.includes("immediate")) {
        currentSubsection = "immediate";
        continue;
      } else if (subheading.includes("short")) {
        currentSubsection = "short";
        continue;
      } else if (subheading.includes("long") || subheading.includes("preventive")) {
        currentSubsection = "long";
        continue;
      }
    }

    const bulletMatch = line.match(/^[-*+]\s+(.+)/);
    const orderedMatch = line.match(/^\d+\.\s+(.+)/);

    if (currentSection === "summary") {
      const text = line.replace(/\*\*/g, "").trim();
      if (text) {
        result.executiveSummary = result.executiveSummary 
          ? result.executiveSummary + " " + text 
          : text;
      }
    } else if (currentSection === "impact") {
      const text = line.replace(/\*\*/g, "").trim();
      if (text) {
        result.impactAssessment = result.impactAssessment 
          ? result.impactAssessment + " " + text 
          : text;
      }
    } else if (currentSection === "recommendations") {
      const bulletText = bulletMatch ? bulletMatch[1].trim() : orderedMatch ? orderedMatch[1].trim() : line.replace(/\*\*/g, "").trim();
      if (bulletText) {
        if (currentSubsection === "immediate") {
          result.immediateActions.push(bulletText);
        } else if (currentSubsection === "short") {
          result.shortTermImprovements.push(bulletText);
        } else if (currentSubsection === "long") {
          result.longTermPreventiveMeasures.push(bulletText);
        }
      }
    } else if (currentSection === "commands") {
      const text = bulletMatch ? bulletMatch[1].trim() : line.replace(/\*\*/g, "").trim();
      if (text) result.commands.push(text);
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Reusable Sub-Components
// ─────────────────────────────────────────────────────────────────────────────

export const PDFHeader = ({ investigationId, generatedAt }) => {
  const dt = fmtDate(generatedAt);
  return (
    <View style={{ position: "absolute", top: 45, left: 45, right: 45 }} fixed>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={S.headerLeft}>
          <Text style={S.headerBrand}>KubeSage.AI</Text>
          <Text style={S.headerTitle}>AI Investigation Report</Text>
          <Text style={S.headerSubtitle}>Generated by KubeSage AI Root Cause Analysis Engine</Text>
        </View>
        <View style={S.headerRight}>
          <Text style={S.headerInvId}>{padId(investigationId)}</Text>
          <Text style={S.headerMeta}>{dt.date}</Text>
          <Text style={S.headerMeta}>{dt.time}</Text>
        </View>
      </View>
      <View style={S.headerDivider} />
    </View>
  );
};

export const ExecutiveSummary = ({ text }) => {
  if (!text) return null;
  return (
    <View style={S.sectionContainer} wrap={false}>
      <Text style={S.sectionTitle}>Executive Summary</Text>
      <View style={S.sectionDivider} />
      <Text style={S.bodyText}>{text}</Text>
    </View>
  );
};

export const OverviewTable = ({ investigation, generatedAt, issuesCount }) => {
  const dt = fmtDate(generatedAt);
  const clusterName = investigation?.cluster?.name || investigation?.clusterName || investigation?.cluster_name || "Unknown";
  const durationText = fmtDuration(investigation?.duration_seconds ?? investigation?.duration);
  const namespaceName = investigation?.namespace || "default";

  const rows = [
    { field: "Investigation ID", value: padId(investigation?.id) },
    { field: "Cluster", value: clusterName },
    { field: "Status", value: investigation?.cluster_status || "—" },
    { field: "Generated At", value: dt.full },
    { field: "Duration", value: durationText },
    { field: "Namespace", value: namespaceName },
    { field: "Issues Detected", value: String(issuesCount) },
  ];

  return (
    <View style={S.sectionContainer}>
      <Text style={S.sectionTitle}>Investigation Overview</Text>
      <View style={S.sectionDivider} />
      <View style={S.kvTable}>
        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          const rowStyle = [
            isLast ? S.kvRowLast : S.kvRow,
            { backgroundColor: idx % 2 === 1 ? C.bgLight : C.white }
          ];
          return (
            <View key={idx} style={rowStyle} wrap={false}>
              <Text style={S.kvCellKey}>{row.field}</Text>
              <Text style={S.kvCellValue}>{row.value}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export const FindingsTable = ({ issues }) => {
  const hasIssues = issues && issues.length > 0;
  return (
    <View style={S.sectionContainer}>
      <View wrap={false}>
        <Text style={S.sectionTitle}>Findings</Text>
        <View style={S.sectionDivider} />
      </View>
      
      {!hasIssues ? (
        <Text style={[S.bodyText, { color: C.secondary }]}>No issues detected during this investigation.</Text>
      ) : (
        <View style={S.findTable}>
          <View style={S.findHeader} fixed>
            <View style={{ width: "20%" }}>
              <Text style={S.findCellHeader}>Issue</Text>
            </View>
            <View style={{ width: "20%" }}>
              <Text style={S.findCellHeader}>Namespace</Text>
            </View>
            <View style={{ width: "15%" }}>
              <Text style={S.findCellHeader}>Severity</Text>
            </View>
            <View style={{ width: "45%" }}>
              <Text style={S.findCellHeader}>Description</Text>
            </View>
          </View>
          
          {issues.map((issue, idx) => {
            const isLast = idx === issues.length - 1;
            const sevLower = (issue.severity || "low").toLowerCase();
            let sevColor = C.green;
            if (sevLower === "high" || sevLower === "critical") {
              sevColor = C.red;
            } else if (sevLower === "medium" || sevLower === "warning") {
              sevColor = C.amber;
            }
            
            return (
              <View
                key={idx}
                style={isLast ? S.findRowLast : S.findRow}
                wrap={false}
              >
                <View style={{ width: "20%" }}>
                  <Text style={S.findCellBold}>{issue.type || "Unknown"}</Text>
                </View>
                <View style={{ width: "20%" }}>
                  <Text style={S.findCell}>{issue.namespace || "—"}</Text>
                </View>
                <View style={{ width: "15%" }}>
                  <Text style={[S.findCellBold, { color: sevColor }]}>
                    {(issue.severity || "Low").toUpperCase()}
                  </Text>
                </View>
                <View style={{ width: "45%" }}>
                  <Text style={S.findCellMuted}>{issue.recommendation || issue.message || "—"}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

export const ImpactAssessment = ({ text }) => {
  if (!text) return null;
  return (
    <View style={S.sectionContainer} wrap={false}>
      <Text style={S.sectionTitle}>Impact Assessment</Text>
      <View style={S.sectionDivider} />
      <Text style={S.bodyText}>{text}</Text>
    </View>
  );
};

export const Recommendations = ({ immediate, shortTerm, longTerm }) => {
  const cleanBullet = (txt) => {
    if (!txt) return null;
    const clean = txt.trim();
    if (clean === "-" || clean === "null" || clean === "undefined" || clean === "[]" || !clean) {
      return null;
    }
    return clean;
  };

  const groups = [
    { title: "Immediate Actions", rawItems: immediate || [], items: [] },
    { title: "Short-Term Improvements", rawItems: shortTerm || [], items: [] },
    { title: "Long-Term Preventive Measures", rawItems: longTerm || [], items: [] }
  ];

  for (const group of groups) {
    for (const item of group.rawItems) {
      const clean = cleanBullet(item);
      if (clean) group.items.push(clean);
    }
  }

  const activeGroups = groups.filter(g => g.items.length > 0);
  if (activeGroups.length === 0) return null;

  return (
    <View style={S.sectionContainer}>
      <View wrap={false}>
        <Text style={S.sectionTitle}>Recommendations</Text>
        <View style={S.sectionDivider} />
      </View>
      
      <View style={S.sectionContent}>
        {activeGroups.map((group, gIdx) => (
          <View key={gIdx} style={{ marginBottom: 12 }} wrap={false}>
            <Text style={S.recoSubheading}>{group.title}</Text>
            <View style={S.bulletList}>
              {group.items.map((bulletText, bIdx) => (
                <View key={bIdx} style={S.bulletItem}>
                  <Text style={S.bulletSign}>–</Text>
                  <Text style={S.bulletText}>{bulletText}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const DiagnosticCommands = ({ commands }) => {
  if (!commands || commands.length === 0) return null;

  return (
    <View style={S.sectionContainer}>
      <View wrap={false}>
        <Text style={S.sectionTitle}>Recommended Diagnostic Commands</Text>
        <View style={S.sectionDivider} />
      </View>
      <View style={S.sectionContent}>
        <View style={S.codeBlock} wrap={false}>
          {commands.map((cmd, idx) => (
            <Text key={idx} style={S.codeLine}>{cmd}</Text>
          ))}
        </View>
      </View>
    </View>
  );
};

export const MetadataSection = ({ meta }) => {
  const dt = fmtDate(meta.generatedAt);
  const tokensCount = String(meta.tokens || 0);
  const durationText = fmtDuration(meta.duration);
  
  const rows = [
    { field: "Model", value: meta.model || "—" },
    { field: "Total Tokens", value: tokensCount },
    { field: "Generation Time", value: durationText },
    { field: "Generated At", value: dt.date },
  ];

  return (
    <View style={S.sectionContainer} wrap={false}>
      <Text style={S.sectionTitle}>AI Generation Metadata</Text>
      <View style={S.sectionDivider} />
      <View style={S.kvTable}>
        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          const rowStyle = [
            isLast ? S.kvRowLast : S.kvRow,
            { backgroundColor: idx % 2 === 1 ? C.bgLight : C.white }
          ];
          return (
            <View key={idx} style={rowStyle} wrap={false}>
              <Text style={S.kvCellKey}>{row.field}</Text>
              <Text style={S.kvCellValue}>{row.value}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export const PDFFooter = () => (
  <View style={{ position: "absolute", bottom: 45, left: 45, right: 45, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} fixed>
    <Text style={S.footerText}>Generated by KubeSage AI</Text>
    <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Main Document Layout Component
// ─────────────────────────────────────────────────────────────────────────────

export const InvestigationReportPDF = ({ investigation, aiReport, issues }) => {
  const parsed = parseMarkdown(aiReport?.analysis || "");

  const executiveSummary = aiReport?.executiveSummary || parsed.executiveSummary;
  const impactAssessment = aiReport?.impactAssessment || parsed.impactAssessment;
  
  const immediate = aiReport?.immediateActions || parsed.immediateActions;
  const shortTerm = aiReport?.shortTermImprovements || parsed.shortTermImprovements;
  const longTerm = aiReport?.longTermPreventiveMeasures || parsed.longTermPreventiveMeasures;

  const commands = aiReport?.commands || parsed.commands;

  const generatedAt = aiReport?.generated_at || aiReport?.created_at;
  const issuesCount = issues?.length || investigation?.issues?.length || 0;
  const totalTokens = (aiReport?.prompt_tokens || 0) + (aiReport?.completion_tokens || 0);

  const meta = {
    model: aiReport?.model || "gemma4:31b-cloud",
    tokens: totalTokens,
    duration: aiReport?.duration_seconds || 0,
    generatedAt,
  };

  return (
    <Document
      title={`KubeSage AI Investigation Report – ${padId(investigation?.id)}`}
      author="KubeSage AI"
      subject="AI Incident Summary"
    >
      <Page size="A4" style={S.page}>
        {/* Header Block repeats on every page */}
        <PDFHeader investigationId={investigation?.id} generatedAt={generatedAt} />

        {/* 1. Executive Summary */}
        <ExecutiveSummary text={executiveSummary} />

        {/* 2. Investigation Overview */}
        <OverviewTable investigation={investigation} generatedAt={generatedAt} issuesCount={issuesCount} />

        {/* 3. Findings */}
        <FindingsTable issues={issues} />

        {/* 4. Impact Assessment */}
        <ImpactAssessment text={impactAssessment} />

        {/* 5. Recommendations */}
        <Recommendations immediate={immediate} shortTerm={shortTerm} longTerm={longTerm} />

        {/* 6. Recommended Diagnostic Commands */}
        <DiagnosticCommands commands={commands} />

        {/* 7. AI Generation Metadata */}
        <MetadataSection meta={meta} />

        {/* Footer Block repeats on every page */}
        <PDFFooter />
      </Page>
    </Document>
  );
};

export default InvestigationReportPDF;
