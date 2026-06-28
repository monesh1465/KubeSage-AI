import { jsPDF } from "jspdf";

// ─────────────────────────────────────────────────────────────────────────────
//  Unit helpers
//  1px (96dpi) = 0.2646mm   |   1pt = 0.3528mm   |   1px = 0.75pt
// ─────────────────────────────────────────────────────────────────────────────
const px  = (n) => n * 0.2646;                      // px  → mm
const pt  = (n) => n * 0.3528;                      // pt  → mm (for lh)
const fpt = (px_) => px_ * 0.75;                    // CSS-px font-size → jsPDF pt

// ─────────────────────────────────────────────────────────────────────────────
//  Design tokens
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  text:    [17,  24,  39],   // #111827
  muted:   [107, 114, 128],  // #6B7280
  border:  [229, 231, 235],  // #E5E7EB
  accent:  [79,  70,  229],  // #4F46E5
  white:   [255, 255, 255],
  bg:      [250, 250, 250],  // #FAFAFA
  bgHdr:   [248, 250, 252],  // #F8FAFC  (table header)
  rowAlt:  [250, 250, 250],  // table alt row
  red:     [185, 28,  28],   // severity text – high
  amber:   [161, 98,   7],   // severity text – medium
  green:   [4,  120,  87],   // severity text – low/none
};

// ─────────────────────────────────────────────────────────────────────────────
//  Formatters
// ─────────────────────────────────────────────────────────────────────────────
const padId = (id) => `INV-${String(id).padStart(5, "0")}`;

function fmtDate(iso) {
  if (!iso) return { date: "—", time: "—", full: "—" };
  try {
    const d = new Date(iso);
    const M = ["Jan","Feb","Mar","Apr","May","Jun",
               "Jul","Aug","Sep","Oct","Nov","Dec"];
    const date = `${M[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2,"0")}, ${d.getUTCFullYear()}`;
    const time = `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")} UTC`;
    return { date, time, full: `${date}  ·  ${time}` };
  } catch {
    return { date: iso, time: "", full: iso };
  }
}

function fmtDuration(s) {
  if (s == null) return "—";
  if (s < 1)    return `${Math.round(s * 1000)} ms`;
  if (s < 60)   return `${s.toFixed(1)} s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Markdown → section dictionary
// ─────────────────────────────────────────────────────────────────────────────
function parseMarkdown(md) {
  if (!md) return {};
  const map = {};
  let curKey = null;
  let inCode = false, buf = [];

  for (const raw of md.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("```")) {
      if (inCode) {
        if (curKey && map[curKey]) map[curKey].items.push({ type: "code", lines: buf });
        inCode = false; buf = [];
      } else { inCode = true; }
      continue;
    }
    if (inCode) { buf.push(raw); continue; }

    const h = line.match(/^#{1,3}\s+(.+)/);
    if (h) {
      const title = h[1].replace(/\*\*/g, "").trim();
      const lower = title.toLowerCase();
      if (lower.includes("executive summary")) curKey = "summary";
      else if (lower.includes("finding")) curKey = "findings";
      else if (lower.includes("impact")) curKey = "impact";
      else if (lower.includes("recommend")) curKey = "recommendations";
      else if (lower.includes("command") || lower.includes("diagnostic")) curKey = "commands";
      else curKey = lower;

      if (!map[curKey]) map[curKey] = { title, items: [] };
      continue;
    }

    if (!curKey) continue;
    if (!line || line === "---") continue;

    const bul = line.match(/^[-*+]\s+(.+)/);
    const ord = line.match(/^\d+\.\s+(.+)/);
    const sub = line.match(/^\*\*(.+?)\*\*:?/);

    if      (bul) map[curKey].items.push({ type: "bullet",  text: bul[1].trim() });
    else if (ord) map[curKey].items.push({ type: "ordered", text: ord[1].trim() });
    else if (sub) map[curKey].items.push({ type: "subhead", text: sub[1].trim() });
    else if (line) map[curKey].items.push({ type: "para",   text: line.replace(/\*\*/g, "").trim() });
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PDF Document Class
// ─────────────────────────────────────────────────────────────────────────────
class Doc {
  constructor(spacingScale = 1.0) {
    this.pdf = new jsPDF("p", "mm", "a4");
    this.W   = 210;
    this.H   = 297;
    this.mL  = px(40);          // 40px left
    this.mR  = px(40);          // 40px right
    this.mT  = px(40);          // 40px top
    this.mB  = px(40);          // 40px bottom
    this.fH  = px(50);          // 50px footer zone (reserved)
    this.cW  = this.W - this.mL - this.mR;
    this.y   = this.mT;
    this.scale = spacingScale;  // dynamic spacing scaling factor for validation pass
  }

  // ── Colour / Font helpers ───────────────────────────────────────────────
  fc(...c) { this.pdf.setFillColor(...c); }
  dc(...c) { this.pdf.setDrawColor(...c); }
  tc(...c) { this.pdf.setTextColor(...c); }

  setFont(sz, wt = "normal", color = T.text) {
    this.pdf.setFont("helvetica", wt);
    this.pdf.setFontSize(fpt(sz));
    this.tc(...color);
  }

  lh(sz, mult = 1.6) { return pt(fpt(sz)) * mult; }

  wrap(text, w, sz, wt = "normal") {
    this.pdf.setFont("helvetica", wt);
    this.pdf.setFontSize(fpt(sz));
    return this.pdf.splitTextToSize(String(text ?? ""), w);
  }

  avail() { return this.H - this.mB - this.fH - this.y; }

  need(h) {
    if (this.avail() < h) {
      this.pdf.addPage();
      this.y = this.mT;
    }
  }

  // ── Primitives ──────────────────────────────────────────────────────────
  hline(y, col = T.border, lw = 0.25, x1, x2) {
    this.dc(...col);
    this.pdf.setLineWidth(lw);
    this.pdf.line(x1 ?? this.mL, y, x2 ?? (this.W - this.mR), y);
  }

  vline(x, y1, y2, col = T.border, lw = 0.25) {
    this.dc(...col);
    this.pdf.setLineWidth(lw);
    this.pdf.line(x, y1, x, y2);
  }

  fillRect(x, y, w, h, fill, stroke, lw = 0.25, r = 0) {
    if (fill)   this.fc(...fill);
    if (stroke) { this.dc(...stroke); this.pdf.setLineWidth(lw); }
    const mode = fill && stroke ? "FD" : fill ? "F" : "D";
    if (r > 0) this.pdf.roundedRect(x, y, w, h, r, r, mode);
    else       this.pdf.rect(x, y, w, h, mode);
  }

  fill(x, y, w, h, col) {
    this.fc(...col);
    this.pdf.setLineWidth(0);
    this.dc(...col);
    this.pdf.rect(x, y, w, h, "F");
  }

  // ── Section Title ───────────────────────────────────────────────────────
  //  16px 700, margin-top: 20px, margin-bottom: 20px, 1px divider
  sectionTitle(label) {
    this.y += px(20) * this.scale;
    this.need(this.lh(16, 1.2) + px(20) * this.scale);

    this.setFont(16, "bold", T.text);
    this.pdf.text(label.toUpperCase(), this.mL, this.y);
    this.y += this.lh(16, 1.2);

    // 1px divider underneath (margin-bottom: 20px)
    this.hline(this.y + px(4) * this.scale, T.border, 0.25);
    this.y += px(20) * this.scale;
  }

  // ── Body Paragraph ──────────────────────────────────────────────────────
  para(text, sz = 12, wt = "normal", col = T.text, indent = 0) {
    const lines = this.wrap(text, this.cW - indent, sz, wt);
    const lineH = this.lh(sz, 1.6);
    this.need(lines.length * lineH + px(2));
    this.setFont(sz, wt, col);
    lines.forEach(l => { this.pdf.text(l, this.mL + indent, this.y); this.y += lineH; });
  }

  // ── Bullet Item ─────────────────────────────────────────────────────────
  bullet(text, sz = 12, ind = px(12)) {
    const lines = this.wrap(text, this.cW - ind - px(6), sz);
    const lineH = this.lh(sz, 1.55);
    this.need(lines.length * lineH + px(1));
    this.setFont(sz, "normal", T.muted);
    this.pdf.text("\u2013", this.mL + px(2), this.y);
    this.setFont(sz, "normal", T.text);
    lines.forEach(l => { this.pdf.text(l, this.mL + ind, this.y); this.y += lineH; });
    this.y += px(3);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  1. HEADER (80px height target)
  // ════════════════════════════════════════════════════════════════════════
  drawHeader(meta) {
    const dt = fmtDate(meta.generatedAt);
    const rx = this.W - this.mR;
    let y    = this.y;

    // Brand: 24px 700
    this.setFont(24, "bold", T.text);
    this.pdf.text("KubeSage.AI", this.mL, y);

    // Investigation ID
    this.setFont(10, "bold", T.accent);
    this.pdf.text(padId(meta.investigationId), rx, y, { align: "right" });

    y += this.lh(24, 1.2);

    // Report title: 28px target per spec (or 18px for document scaling)
    this.setFont(18, "bold", T.text);
    this.pdf.text("AI Investigation Report", this.mL, y);

    // Date
    this.setFont(10, "normal", T.muted);
    this.pdf.text(dt.date, rx, y, { align: "right" });

    y += this.lh(18, 1.2);

    // Subtitle + time
    this.setFont(10, "normal", T.muted);
    this.pdf.text("Generated by KubeSage AI Root Cause Analysis Engine", this.mL, y);
    this.pdf.text(dt.time, rx, y, { align: "right" });

    y += this.lh(10, 1.2) + px(12);

    // 1px solid #E5E7EB Divider
    this.hline(y, T.border, 0.25);
    y += px(16) * this.scale;

    this.y = y;
  }

  // ════════════════════════════════════════════════════════════════════════
  //  2. EXECUTIVE SUMMARY (Simple Callout Box)
  //  border-left: 4px solid #4F46E5, background: #FAFAFA, padding: 16px
  // ════════════════════════════════════════════════════════════════════════
  drawExecutiveSummary(sec) {
    if (!sec || !sec.items.length) return;
    this.sectionTitle("Executive Summary");

    const text = sec.items
      .filter(i => ["para","bullet","ordered"].includes(i.type))
      .map(i => i.text).filter(Boolean).join(" ").trim();
    if (!text) return;

    const SZ    = 12;
    const PAD_T = px(16);
    const PAD_B = px(16);
    const PAD_L = px(20); // 16px padding + 4px bar
    const PAD_R = px(16);
    const lineH = this.lh(SZ, 1.6);
    const mW    = this.cW - PAD_L - PAD_R;
    const lines = this.wrap(text, mW, SZ);
    const boxH  = Math.max(px(48), lines.length * lineH + PAD_T + PAD_B);

    this.need(boxH + px(4));

    const bx = this.mL;
    const by = this.y;

    // Background card
    this.fillRect(bx, by, this.cW, boxH, T.bg, T.border, 0.25, px(4));

    // Accent left bar (4px solid #4F46E5)
    this.fill(bx, by + px(2), px(4), boxH - px(4), T.accent);

    // Text
    this.setFont(SZ, "normal", T.text);
    let ty = by + PAD_T + lineH * 0.72;
    lines.forEach(l => { this.pdf.text(l, bx + PAD_L, ty); ty += lineH; });

    this.y = by + boxH + px(4);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  3. INVESTIGATION OVERVIEW (2 Columns, Compact Metadata Grid)
  //  border: 1px solid #E5E7EB, radius: 8px, padding: 14px, background: #FAFAFA
  // ════════════════════════════════════════════════════════════════════════
  drawOverview(meta) {
    this.sectionTitle("Investigation Overview");

    const f   = meta.findings || {};
    const dt  = fmtDate(meta.generatedAt);
    const cnt = meta.issues ? String(meta.issues.length) : String(f.issueCount ?? "0");
    const ns  = (f.namespace && f.namespace !== "-") ? f.namespace
              : (meta.issues?.[0]?.namespace || "—");

    const fields = [
      ["Investigation ID",  padId(meta.investigationId)],
      ["Cluster",           meta.clusterName || "—"],
      ["Status",            meta.status || "—"],
      ["Issues Detected",   cnt],
      ["Namespace",         ns],
      ["Duration",          fmtDuration(meta.duration)],
    ];

    const ROWS    = 3;
    const COLS    = 2;
    const ROW_H   = px(38); // 38px compact height
    const GRID_H  = ROWS * ROW_H;
    const HALF    = this.cW / 2;
    const PAD_L   = px(14); // 14px padding

    this.need(GRID_H + px(4));

    const gy = this.y;

    // Outer box (8px radius)
    this.fillRect(this.mL, gy, this.cW, GRID_H, T.bg, T.border, 0.25, px(8));

    // Centre divider
    this.vline(this.mL + HALF, gy, gy + GRID_H, T.border, 0.25);

    // Row dividers
    for (let r = 1; r < ROWS; r++) {
      this.hline(gy + r * ROW_H, T.border, 0.2);
    }

    fields.forEach((fld, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx  = this.mL + col * HALF + PAD_L;
      const cy  = gy + row * ROW_H;
      const mW  = HALF - PAD_L * 2;

      // Label (10px 600)
      this.setFont(10, "bold", T.muted);
      this.pdf.text(fld[0].toUpperCase(), cx, cy + px(12));

      // Value (12px 400/700)
      let vc = T.text;
      if (fld[0] === "Status") {
        const v = fld[1].toLowerCase();
        vc = v.includes("critical") || v.includes("high") ? T.red
           : v.includes("warning")                         ? T.amber
           : T.green;
      }
      const vls = this.wrap(fld[1], mW, 12, "bold");
      this.setFont(12, "bold", vc);
      let vy = cy + px(25);
      vls.slice(0, 2).forEach(l => { this.pdf.text(l, cx, vy); vy += this.lh(12, 1.2); });
    });

    this.y = gy + GRID_H + px(4);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  4. FINDINGS TABLE
  //  Issue column: 180px width (~47.6mm). No word splitting!
  //  Severity: Plain text HIGH / MEDIUM / LOW (no badges).
  // ════════════════════════════════════════════════════════════════════════
  drawFindings(issues) {
    this.sectionTitle("Findings");

    if (!issues || issues.length === 0) {
      const msg   = "No issues detected during this investigation.";
      const lineH = this.lh(12, 1.6);
      const boxH  = lineH + px(20);
      this.need(boxH + px(4));
      this.fillRect(this.mL, this.y, this.cW, boxH, T.bg, T.border, 0.25, px(4));
      this.setFont(12, "italic", T.muted);
      this.pdf.text(msg, this.mL + px(14), this.y + px(11) + lineH * 0.72);
      this.y += boxH + px(4);
      return;
    }

    // 180px Issue column width per requirement!
    const C1 = px(180); // ~47.6mm
    const C2 = px(60);  // Namespace
    const C3 = px(50);  // Severity
    const C4 = this.cW - C1 - C2 - C3; // Description

    const HDR_H = px(40); // 40px header height
    const PAD   = px(10); // 10px padding
    const SZ    = 12;     // 12px font
    const lineH = this.lh(SZ, 1.4);

    // Header (#F8FAFC bg, #E5E7EB border)
    this.need(HDR_H + px(10));
    this.fillRect(this.mL, this.y, this.cW, HDR_H, T.bgHdr, T.border, 0.25);
    const cols = [
      { label: "Issue",       w: C1 },
      { label: "Namespace",   w: C2 },
      { label: "Severity",    w: C3 },
      { label: "Description", w: C4 },
    ];
    let hx = this.mL;
    const htY = this.y + HDR_H * 0.62;
    cols.forEach((c, ci) => {
      if (ci > 0) this.vline(hx, this.y, this.y + HDR_H, T.border, 0.25);
      this.setFont(10, "bold", T.muted);
      this.pdf.text(c.label.toUpperCase(), hx + PAD, htY);
      hx += c.w;
    });
    this.y += HDR_H;

    // Rows
    issues.forEach((iss, ri) => {
      // Keep-all / no split hyphenation for issue names like FailedScheduling
      const rawType = String(iss.type || "Unknown");
      const issueLS = [rawType]; // Keep on single line in 180px column to avoid ugly splits
      const descLS  = this.wrap(iss.recommendation || "—", C4 - PAD * 2, SZ);
      const maxLn   = Math.max(issueLS.length, descLS.length, 1);
      const rowH    = Math.max(px(40), maxLn * lineH + px(10));

      this.need(rowH + 1);

      const bg = ri % 2 === 0 ? T.white : T.rowAlt;
      this.fillRect(this.mL, this.y, this.cW, rowH, bg, T.border, 0.25);

      let rx = this.mL;

      // Issue (180px wide)
      this.setFont(SZ, "bold", T.text);
      let iy = this.y + (rowH - issueLS.length * lineH) / 2 + lineH * 0.72;
      issueLS.forEach(l => { this.pdf.text(l, rx + PAD, iy); iy += lineH; });
      rx += C1; this.vline(rx, this.y, this.y + rowH, T.border, 0.25);

      // Namespace
      const nsText = (iss.namespace && iss.namespace !== "-") ? iss.namespace : "—";
      const nsLS   = this.wrap(nsText, C2 - PAD * 2, SZ);
      this.setFont(SZ, "normal", T.text);
      let ny = this.y + (rowH - nsLS.length * lineH) / 2 + lineH * 0.72;
      nsLS.forEach(l => { this.pdf.text(l, rx + PAD, ny); ny += lineH; });
      rx += C2; this.vline(rx, this.y, this.y + rowH, T.border, 0.25);

      // Severity (Plain text HIGH / MEDIUM / LOW)
      const sev = (iss.severity || "Low").toUpperCase();
      const sl  = sev.toLowerCase();
      const sc  = sl === "high" || sl === "critical" ? T.red
                : sl === "medium" || sl === "warning" ? T.amber
                : T.green;
      const sevY = this.y + rowH / 2 + pt(fpt(10)) * 0.35;
      this.setFont(10, "bold", sc);
      this.pdf.text(sev, rx + PAD, sevY);
      rx += C3; this.vline(rx, this.y, this.y + rowH, T.border, 0.25);

      // Description
      this.setFont(SZ, "normal", T.muted);
      let dy = this.y + (rowH - descLS.length * lineH) / 2 + lineH * 0.72;
      descLS.forEach(l => { this.pdf.text(l, rx + PAD, dy); dy += lineH; });

      this.y += rowH;
    });
    this.y += px(4);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  5. IMPACT ASSESSMENT
  // ════════════════════════════════════════════════════════════════════════
  drawImpact(sec) {
    if (!sec || !sec.items.length) return;
    this.sectionTitle("Impact Assessment");
    this.drawExecutiveSummary(sec); // reuse compact callout box
  }

  // ════════════════════════════════════════════════════════════════════════
  //  6. RECOMMENDATIONS
  //  Subsections: 13px 600 #4F46E5
  // ════════════════════════════════════════════════════════════════════════
  drawRecommendations(sec) {
    if (!sec || !sec.items.length) return;
    this.sectionTitle("Recommendations");

    const GROUPS = {
      immediate: { label: "Immediate Actions",            items: [] },
      short:     { label: "Short-Term Improvements",       items: [] },
      long:      { label: "Long-Term Preventive Measures", items: [] },
    };
    let cur = null;
    sec.items.forEach(it => {
      if (it.type === "subhead") {
        const t = it.text.toLowerCase();
        cur = t.includes("immediate") ? GROUPS.immediate
            : t.includes("short")    ? GROUPS.short
            : t.includes("long")     ? GROUPS.long : null;
      } else if (cur && it.text) {
        cur.items.push(it.text);
      }
    });

    const populated = Object.values(GROUPS).filter(g => g.items.length > 0);

    if (populated.length === 0) {
      sec.items.forEach(it => {
        if (it.type === "bullet" || it.type === "ordered") this.bullet(it.text);
        else if (it.type === "para") this.para(it.text);
      });
      return;
    }

    populated.forEach((grp, gi) => {
      if (gi > 0) this.y += px(12) * this.scale; // 12px spacing between subsections

      const titleH = this.lh(13, 1.4) + px(4);
      const bulkH  = grp.items.reduce((a, t) => {
        return a + Math.max(1, this.wrap(t, this.cW - px(18), 12).length) * this.lh(12, 1.55) + px(2);
      }, 0);
      this.need(titleH + bulkH);

      // Requirement 6: font-size: 13px, font-weight: 600 (bold), color: #4F46E5
      this.setFont(13, "bold", T.accent);
      this.pdf.text(grp.label, this.mL, this.y);
      this.y += this.lh(13, 1.4);

      // Divider under subsection
      this.hline(this.y + px(1), T.border, 0.2);
      this.y += px(6) * this.scale;

      grp.items.forEach(item => this.bullet(item));
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  //  7. RECOMMENDED COMMANDS (Code Block)
  //  bg: #F8FAFC, border: 1px solid #E5E7EB, padding: 12px, font: 11px mono
  // ════════════════════════════════════════════════════════════════════════
  drawCommands(sec) {
    if (!sec || !sec.items.length) return;
    const rawLines = [];
    sec.items.forEach(it => {
      if (it.type === "code") it.lines.forEach(l => rawLines.push(l));
    });
    if (!rawLines.length) return;

    this.sectionTitle("Recommended Commands");

    const cmds = rawLines.map(l => l.trim().replace(/^\$\s*/, "")).filter(Boolean);
    if (!cmds.length) return;

    const SZ_PX = 11;
    const SZ_PT = fpt(SZ_PX);
    const lineH = SZ_PT * 0.3528 * 1.4;
    const PAD   = px(12); // 12px padding
    const mW    = this.cW - PAD * 2;

    const blocks = cmds.map(cmd => {
      this.pdf.setFont("courier", "normal");
      this.pdf.setFontSize(SZ_PT);
      return this.pdf.splitTextToSize(cmd, mW);
    });

    const totalLn = blocks.reduce((s, b) => s + b.length, 0);
    const gaps    = (blocks.length - 1) * px(4);
    const boxH    = totalLn * lineH + gaps + PAD * 2;

    this.need(boxH + px(4));
    this.fillRect(this.mL, this.y, this.cW, boxH, T.bgHdr, T.border, 0.25, px(6));

    this.pdf.setFont("courier", "normal");
    this.pdf.setFontSize(SZ_PT);
    this.tc(...T.text);

    let ty = this.y + PAD + lineH * 0.72;
    blocks.forEach((ls, ci) => {
      if (ci > 0) ty += px(4);
      ls.forEach(l => { this.pdf.text(l, this.mL + PAD, ty); ty += lineH; });
    });

    this.y += boxH + px(4);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  8. AI GENERATION METADATA (4 Equal Cards in a Row)
  //  min-height: 60px (~16mm), padding: 12px, bg: #FAFAFA, border: 1px solid #E5E7EB
  // ════════════════════════════════════════════════════════════════════════
  drawMeta(meta) {
    this.sectionTitle("AI Generation Metadata");

    const dt = fmtDate(meta.generatedAt);
    const cards = [
      { label: "Model",           value: meta.model || "—" },
      { label: "Total Tokens",    value: String(meta.tokens || "—") },
      { label: "Generation Time", value: fmtDuration(meta.duration) },
      { label: "Generated At",    value: dt.date },
    ];

    const GAP   = px(6);
    const cW    = (this.cW - GAP * 3) / 4;
    const cH    = px(60); // 60px height requirement
    const r     = px(6);

    this.need(cH + px(4));

    cards.forEach((card, i) => {
      const cx = this.mL + i * (cW + GAP);
      this.fillRect(cx, this.y, cW, cH, T.bg, T.border, 0.25, r);

      // Padding 12px
      this.setFont(10, "bold", T.muted);
      this.pdf.text(card.label.toUpperCase(), cx + px(12), this.y + px(16));

      const ls = this.wrap(card.value, cW - px(24), 12, "bold");
      this.setFont(12, "bold", T.text);
      let vy = this.y + px(32);
      ls.slice(0, 2).forEach(l => { this.pdf.text(l, cx + px(12), vy); vy += this.lh(12, 1.2); });
    });

    this.y += cH + px(4);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  9. FOOTER (Strict bottom alignment, display:flex simulation, no overlaps)
  // ════════════════════════════════════════════════════════════════════════
  stampFooters() {
    const total = this.pdf.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.pdf.setPage(p);

      const fy = this.H - this.mB - this.fH + px(12); // padding-top: 12px

      // Thin divider line above footer
      this.hline(fy, T.border, 0.25);

      const l1 = fy + px(14);
      const l2 = fy + px(28);

      // Left-aligned Brand + Platform
      this.setFont(10, "bold", T.muted);
      this.pdf.text("KubeSage AI", this.mL, l1);

      this.setFont(10, "normal", T.muted);
      this.pdf.text("  ·  AI-Powered Kubernetes Investigation Platform", this.mL + px(24), l1);

      // Left-aligned Confidentiality Notice
      this.setFont(9, "italic", T.muted);
      this.pdf.text("Confidential \u2013 Generated for internal SRE investigation purposes.", this.mL, l2);

      // Right-aligned Page Number (aligned with Line 2 to eliminate collisions)
      this.setFont(10, "bold", T.muted);
      this.pdf.text(`Page ${p} of ${total}`, this.W - this.mR, l2, { align: "right" });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  //  RENDER (Strict Order Execution)
  //  1. Header
  //  2. Executive Summary
  //  3. Investigation Overview
  //  4. Findings
  //  5. Impact Assessment
  //  6. Recommendations
  //  7. Recommended Commands
  //  8. AI Generation Metadata
  // ════════════════════════════════════════════════════════════════════════
  render(meta, markdownContent) {
    this.y = this.mT;
    const secMap = parseMarkdown(markdownContent);

    // 1. Header
    this.drawHeader(meta);

    // 2. Executive Summary
    this.drawExecutiveSummary(secMap["summary"]);

    // 3. Investigation Overview
    this.drawOverview(meta);

    // 4. Findings
    this.drawFindings(meta.issues);

    // 5. Impact Assessment
    this.drawImpact(secMap["impact"]);

    // 6. Recommendations
    this.drawRecommendations(secMap["recommendations"]);

    // 7. Recommended Commands
    this.drawCommands(secMap["commands"]);

    // 8. AI Generation Metadata
    this.drawMeta(meta);

    // 9. Footer
    this.stampFooters();

    return this.pdf;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Public API & Pre-Render Layout Validation Pass
// ─────────────────────────────────────────────────────────────────────────────

export const copyReport = async (reportData) => {
  if (!reportData) return false;
  try { await navigator.clipboard.writeText(reportData); return true; }
  catch (err) { console.error("copyReport:", err); return false; }
};

export const exportMarkdown = (reportData, investigationId) => {
  if (!reportData) return;
  const pad  = String(investigationId).padStart(5, "0");
  const blob = new Blob([reportData], { type: "text/markdown;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href: url, download: `Investigation_INV-${pad}.md`,
  });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportPDF = async (params) => {
  try {
    const {
      markdownContent, investigationId, clusterName,
      status, model, tokens, duration, generatedAt, findings, issues,
    } = params;

    const meta = {
      investigationId, clusterName, status,
      model, tokens, duration, generatedAt, findings, issues,
    };

    // ── Pre-Render Layout Validation Pass ──────────────────────────────────
    // 1. Render test pass to detect page count and orphan overflow
    const testDoc = new Doc(1.0);
    testDoc.render(meta, markdownContent);
    const pages = testDoc.pdf.internal.getNumberOfPages();

    // 2. Determine optimal spacing scale factor to eliminate accidental page 2 spills
    let optimalScale = 1.0;
    if (pages > 1) {
      // If the content spilled onto page 2 by just a small margin, compress spacing slightly (0.85 scale)
      const testDoc2 = new Doc(0.85);
      testDoc2.render(meta, markdownContent);
      if (testDoc2.pdf.internal.getNumberOfPages() === 1) {
        optimalScale = 0.85;
      }
    }

    // ── Final Production Render ───────────────────────────────────────────
    const finalDoc = new Doc(optimalScale);
    const pdf = finalDoc.render(meta, markdownContent);
    const pad = String(investigationId).padStart(5, "0");
    pdf.save(`KubeSage_AI_Report_INV-${pad}.pad.pdf`.replace(".pad.pdf", ".pdf"));
    return true;
  } catch (err) {
    console.error("exportPDF:", err);
    return false;
  }
};
