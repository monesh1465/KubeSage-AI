import { jsPDF } from "jspdf";

// ─────────────────────────────────────────────────────────────────────────────
//  Design Tokens  (single-colour: #4F46E5 accent, monochromatic everywhere)
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  text:    [17,  24,  39],   // #111827
  muted:   [107, 114, 128],  // #6B7280
  border:  [229, 231, 235],  // #E5E7EB
  accent:  [79,  70,  229],  // #4F46E5
  white:   [255, 255, 255],
  bgLight: [248, 250, 252],  // #F8FAFC
  bgAlt:   [250, 250, 250],  // #FAFAFA
  red:     [220, 38,  38],
  orange:  [217, 119, 6],
  green:   [5,   150, 105],
};

// ─────────────────────────────────────────────────────────────────────────────
//  Formatters
// ─────────────────────────────────────────────────────────────────────────────

const padId = (id) => `INV-${String(id).padStart(5, "0")}`;

function fmtDate(iso) {
  if (!iso) return { date: "—", time: "—", full: "—" };
  try {
    const d = new Date(iso);
    const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const date = `${M[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2,"0")}, ${d.getUTCFullYear()}`;
    const time = `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")} UTC`;
    return { date, time, full: `${date} · ${time}` };
  } catch { return { date: iso, time: "", full: iso }; }
}

function fmtDuration(s) {
  if (s == null) return "—";
  if (s < 1)    return `${Math.round(s * 1000)} ms`;
  if (s < 60)   return `${s.toFixed(1)} s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Markdown Parser
// ─────────────────────────────────────────────────────────────────────────────

function parseMarkdown(md) {
  if (!md) return [];
  const out = [];
  let cur = null, inCode = false, codeBuf = [];

  for (const raw of md.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("```")) {
      if (inCode) { cur?.items.push({ type: "code", lines: codeBuf }); inCode = false; codeBuf = []; }
      else { inCode = true; }
      continue;
    }
    if (inCode) { codeBuf.push(raw); continue; }

    const h3 = line.match(/^###\s+(.+)/);
    if (h3) { cur = { title: h3[1].replace(/\*\*/g, "").trim(), items: [] }; out.push(cur); continue; }
    if (!cur && line) { cur = { title: "Notes", items: [] }; out.push(cur); }
    if (!line || line === "---") continue;

    const bul = line.match(/^[-*+]\s+(.+)/);
    const ord = line.match(/^\d+\.\s+(.+)/);
    const sub = line.match(/^\*\*(.+?)\*\*/);
    if      (bul) cur.items.push({ type: "bullet",  text: bul[1].trim() });
    else if (ord) cur.items.push({ type: "ordered", text: ord[1].trim() });
    else if (sub) cur.items.push({ type: "subhead", text: sub[1].trim() });
    else          cur.items.push({ type: "para",    text: line.replace(/\*\*/g, "").trim() });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Unit helpers
//  px → mm  (screen 96dpi):  1px = 0.2646mm
//  pt → mm:                  1pt = 0.3528mm
// ─────────────────────────────────────────────────────────────────────────────
const px = (n) => n * 0.2646;  // px to mm
const pt = (n) => n * 0.3528;  // pt to mm

// ─────────────────────────────────────────────────────────────────────────────
//  PDF Renderer
// ─────────────────────────────────────────────────────────────────────────────

class PDFReport {
  constructor() {
    this.doc = new jsPDF("p", "mm", "a4");
    this.W   = 210;
    this.H   = 297;
    this.mL  = px(36);   // 36px left margin
    this.mR  = px(36);   // 36px right margin
    this.mT  = px(28);   // 28px top margin
    this.mB  = px(24);   // 24px bottom margin
    this.footH = px(44); // 44px footer zone
    this.cW  = this.W - this.mL - this.mR;
    this.y   = this.mT;
  }

  // ── Colour / Font helpers ─────────────────────────────────────────────── //
  fc(...c) { this.doc.setFillColor(...c); }
  dc(...c) { this.doc.setDrawColor(...c); }
  tc(...c) { this.doc.setTextColor(...c); }

  // Sets helvetica font at given CSS px size, converts internally
  // style: "normal" | "bold" | "italic"
  F(pxSize, style = "normal", color = C.text) {
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(pxSize * 0.75);  // px → pt (1px = 0.75pt at 96dpi)
    this.tc(...color);
  }

  // Line height in mm for a given px font size and multiplier
  lh(pxSize, mult = 1.6) { return pxSize * 0.75 * 0.3528 * mult; }

  split(text, maxW, pxSize, style = "normal") {
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(pxSize * 0.75);
    return this.doc.splitTextToSize(String(text || ""), maxW);
  }

  avail() { return this.H - this.mB - this.footH - this.y; }

  need(h) {
    if (this.avail() < h) { this.doc.addPage(); this.y = this.mT; }
  }

  // ── Primitive drawing ─────────────────────────────────────────────────── //

  hline(y, color = C.border, lw = 0.2, x1, x2) {
    this.dc(...color);
    this.doc.setLineWidth(lw);
    this.doc.line(x1 ?? this.mL, y, x2 ?? (this.W - this.mR), y);
  }

  vline(x, y1, y2, color = C.border, lw = 0.2) {
    this.dc(...color);
    this.doc.setLineWidth(lw);
    this.doc.line(x, y1, x, y2);
  }

  rect(x, y, w, h, fill, stroke = C.border, lw = 0.2, r = 0) {
    if (fill) this.fc(...fill);
    this.dc(...stroke);
    this.doc.setLineWidth(lw);
    const s = fill ? "FD" : "D";
    if (r > 0) this.doc.roundedRect(x, y, w, h, r, r, s);
    else       this.doc.rect(x, y, w, h, s);
  }

  // ═════════════════════════════════════════════════════════════════════════//
  //  HEADER
  //  Left:  KubeSage.AI (32px bold) / AI Investigation Report (18px)
  //  Right: INV-00000 / Date / Time
  //  Thin blue divider underneath (1px = 0.26mm, colour #4F46E5)
  // ═════════════════════════════════════════════════════════════════════════//

  drawHeader(meta) {
    const dt = fmtDate(meta.generatedAt);
    const rx = this.W - this.mR;
    let y = this.y;

    // Brand name
    this.F(24, "bold", C.text);
    this.doc.text("KubeSage.AI", this.mL, y);

    // Investigation ID right-aligned
    this.F(10, "bold", C.accent);
    this.doc.text(padId(meta.investigationId), rx, y, { align: "right" });
    y += this.lh(24, 1.15);

    // Report title
    this.F(13, "bold", C.text);
    this.doc.text("AI Investigation Report", this.mL, y);

    // Date
    this.F(9, "normal", C.muted);
    this.doc.text(dt.date, rx, y, { align: "right" });
    y += this.lh(13, 1.15);

    // Subtitle / time
    this.F(8, "normal", C.muted);
    this.doc.text("Generated by KubeSage AI Root Cause Analysis Engine", this.mL, y);
    this.doc.text(dt.time, rx, y, { align: "right" });
    y += this.lh(8, 1.2) + px(10);

    // Blue divider (1px)
    this.dc(...C.accent);
    this.doc.setLineWidth(0.26);
    this.doc.line(this.mL, y, rx, y);
    y += px(16);

    this.y = y;
  }

  // ═════════════════════════════════════════════════════════════════════════//
  //  OVERVIEW  (2-column grid, 4 rows, labels 10px muted, values 13px bold)
  // ═════════════════════════════════════════════════════════════════════════//

  drawOverview(meta) {
    const f  = meta.findings || {};
    const dt = fmtDate(meta.generatedAt);

    const ROW_H  = px(42);  // 42px row height
    const N_ROWS = 4;
    const GRID_H = N_ROWS * ROW_H;
    const HALF   = this.cW / 2;
    const PAD_X  = px(12);

    const issueCount = meta.issues ? String(meta.issues.length) : String(f.issueCount ?? "0");
    const nsVal = (f.namespace && f.namespace !== "-") ? f.namespace
                : (meta.issues?.[0]?.namespace || "default");

    const fields = [
      ["Investigation ID",  padId(meta.investigationId)],
      ["Cluster",           meta.clusterName || "—"],
      ["Status",            meta.status || "—"],
      ["Issues Detected",   issueCount],
      ["Namespace",         nsVal],
      ["Most Common Issue", f.mostCommon || "None"],
      ["Duration",          fmtDuration(meta.duration)],
      ["Generated At",      dt.full],
    ];

    this.need(GRID_H + px(8));
    const gy = this.y;

    // Outer box
    this.rect(this.mL, gy, this.cW, GRID_H, null, C.border, 0.2, px(4));

    // Centre divider
    this.vline(this.mL + HALF, gy, gy + GRID_H, C.border, 0.15);

    // Row dividers
    for (let r = 1; r < N_ROWS; r++) {
      this.hline(gy + r * ROW_H, C.border, 0.15);
    }

    fields.forEach((fld, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cy  = gy + row * ROW_H;
      const tx  = this.mL + col * HALF + PAD_X;
      const mW  = HALF - PAD_X * 2;

      // Label
      this.F(10, "bold", C.muted);
      this.doc.text(fld[0].toUpperCase(), tx, cy + px(12));

      // Value
      let vc = C.text;
      if (fld[0] === "Status") {
        const v = fld[1].toLowerCase();
        vc = v.includes("critical") || v.includes("high") ? C.red
           : v.includes("warning") ? C.orange : C.green;
      }
      const lines = this.split(fld[1], mW, 12, "bold");
      this.F(12, "bold", vc);
      let vy = cy + px(25);
      lines.slice(0, 2).forEach(l => { this.doc.text(l, tx, vy); vy += this.lh(12, 1.2); });
    });

    this.y = gy + GRID_H + px(20);
  }

  // ═════════════════════════════════════════════════════════════════════════//
  //  SECTION HEADING  (18px bold uppercase, thin blue 1px line under)
  // ═════════════════════════════════════════════════════════════════════════//

  drawSectionTitle(label) {
    this.y += px(20);
    this.need(this.lh(18, 1.1) + px(12));

    this.F(13, "bold", C.text);
    this.doc.text(label.toUpperCase(), this.mL, this.y, { charSpace: 0.3 });
    this.y += this.lh(13, 1.1);

    // 1px accent line
    this.dc(...C.accent);
    this.doc.setLineWidth(0.26);
    this.doc.line(this.mL, this.y + 0.5, this.W - this.mR, this.y + 0.5);
    this.y += px(10);
  }

  // ═════════════════════════════════════════════════════════════════════════//
  //  TEXT PRIMITIVES
  // ═════════════════════════════════════════════════════════════════════════//

  drawPara(text, pxSize = 12, style = "normal", color = C.text, indent = 0) {
    const ls = this.split(text, this.cW - indent, pxSize, style);
    const lh = this.lh(pxSize, 1.6);
    this.need(ls.length * lh + 1);
    this.F(pxSize, style, color);
    ls.forEach(l => { this.doc.text(l, this.mL + indent, this.y); this.y += lh; });
    this.y += px(4);
  }

  drawBullet(text, pxSize = 12) {
    const ind = px(14);
    const ls  = this.split(text, this.cW - ind, pxSize);
    const lh  = this.lh(pxSize, 1.55);
    this.need(ls.length * lh + 1);
    this.F(pxSize, "normal", C.muted);
    this.doc.text("•", this.mL + px(4), this.y);
    this.F(pxSize, "normal", C.text);
    ls.forEach(l => { this.doc.text(l, this.mL + ind, this.y); this.y += lh; });
    this.y += px(2);
  }

  drawSubhead(text) {
    this.need(px(20));
    this.y += px(4);
    this.F(12, "bold", C.text);
    this.doc.text(text, this.mL, this.y);
    this.y += this.lh(12, 1.4);
  }

  // ═════════════════════════════════════════════════════════════════════════//
  //  EXECUTIVE SUMMARY / IMPACT ASSESSMENT BOX
  //  White bg, 1px border, 4px left accent bar, 8px radius, 20px padding
  // ═════════════════════════════════════════════════════════════════════════//

  drawBox(items) {
    const text = items
      .filter(i => ["para","bullet","ordered"].includes(i.type))
      .map(i => i.text).filter(Boolean).join(" ").trim();
    if (!text) return;

    const PXS  = 12;
    const padT = px(14);
    const padB = px(14);
    const padL = px(20);
    const padR = px(16);
    const lh   = this.lh(PXS, 1.6);
    const mW   = this.cW - padL - padR;
    const ls   = this.split(text, mW, PXS);
    const minH = px(52);
    const boxH = Math.max(minH, ls.length * lh + padT + padB);

    this.need(boxH + px(4));

    // White card with border
    this.rect(this.mL, this.y, this.cW, boxH, C.white, C.border, 0.2, px(4));

    // Left accent bar (4px wide, #4F46E5)
    this.fc(...C.accent);
    this.doc.setDrawColor(0, 0, 0, 0);
    this.doc.setLineWidth(0);
    this.doc.roundedRect(this.mL, this.y, px(4), boxH, px(4), px(4), "F");
    // Fill the right half of the rounded rect to get a flat right edge
    this.fc(...C.accent);
    this.doc.rect(this.mL + px(2), this.y, px(2), boxH, "F");

    this.F(PXS, "normal", C.text);
    let ty = this.y + padT + lh * 0.72;
    ls.forEach(l => { this.doc.text(l, this.mL + padL, ty); ty += lh; });

    this.y += boxH + px(10);
  }

  // ═════════════════════════════════════════════════════════════════════════//
  //  FINDINGS TABLE
  //  Header: #F8FAFC bg, 42px height, 10px padding, #E5E7EB border, 12px font
  //  Data rows: alternate #FFF / #FAFAFA, min 42px, outline severity badges
  // ═════════════════════════════════════════════════════════════════════════//

  drawFindingsTable(issues) {
    if (!issues || issues.length === 0) {
      this.drawPara("No issues were detected during this investigation.", 12, "italic", C.muted);
      return;
    }

    const C_ISSUE = px(100);
    const C_NS    = px(72);
    const C_SEV   = px(64);
    const C_DESC  = this.cW - C_ISSUE - C_NS - C_SEV;

    const HDR_H  = px(38);
    const PAD_X  = px(10);
    const LH     = this.lh(12, 1.45);

    // ─ Header ─
    this.need(HDR_H + px(16));
    this.rect(this.mL, this.y, this.cW, HDR_H, C.bgLight, C.border, 0.2);

    const cols = [
      { label: "Issue",       w: C_ISSUE },
      { label: "Namespace",   w: C_NS    },
      { label: "Severity",    w: C_SEV   },
      { label: "Description", w: C_DESC  },
    ];
    let hx = this.mL;
    cols.forEach((col, ci) => {
      if (ci > 0) this.vline(hx, this.y, this.y + HDR_H, C.border, 0.2);
      this.F(10, "bold", C.muted);
      this.doc.text(col.label.toUpperCase(), hx + PAD_X, this.y + HDR_H * 0.64);
      hx += col.w;
    });
    this.y += HDR_H;

    // ─ Rows ─
    issues.forEach((issue, ri) => {
      const typeLS = this.split(issue.type || "Unknown",         C_ISSUE - PAD_X * 2, 12, "bold");
      const descLS = this.split(issue.recommendation || "—",    C_DESC  - PAD_X * 2, 12);
      const maxLn  = Math.max(typeLS.length, descLS.length);
      const ROW_H  = Math.max(px(38), maxLn * LH + px(14));

      this.need(ROW_H + 1);

      const bg = ri % 2 === 0 ? C.white : C.bgAlt;
      this.rect(this.mL, this.y, this.cW, ROW_H, bg, C.border, 0.2);

      let rx = this.mL;

      // Issue
      const tyPad = (ROW_H - typeLS.length * LH) / 2;
      let tyY = this.y + tyPad + LH * 0.72;
      this.F(12, "bold", C.text);
      typeLS.forEach(l => { this.doc.text(l, rx + PAD_X, tyY); tyY += LH; });
      rx += C_ISSUE; this.vline(rx, this.y, this.y + ROW_H, C.border, 0.2);

      // Namespace
      const nsText = (issue.namespace && issue.namespace !== "-") ? issue.namespace : "default";
      const nsLS   = this.split(nsText, C_NS - PAD_X * 2, 12);
      const nsPad  = (ROW_H - nsLS.length * LH) / 2;
      let nsY = this.y + nsPad + LH * 0.72;
      this.F(12, "normal", C.text);
      nsLS.forEach(l => { this.doc.text(l, rx + PAD_X, nsY); nsY += LH; });
      rx += C_NS; this.vline(rx, this.y, this.y + ROW_H, C.border, 0.2);

      // Severity badge
      const sev    = issue.severity || "Low";
      const sl     = sev.toLowerCase();
      const sevClr = sl === "high" || sl === "critical" ? C.red
                   : sl === "medium" || sl === "warning" ? C.orange : C.green;
      const bW = px(52);
      const bH = px(22);
      const bx = rx + (C_SEV - bW) / 2;
      const by = this.y + (ROW_H - bH) / 2;

      this.dc(...sevClr);
      this.doc.setLineWidth(0.4);
      this.doc.roundedRect(bx, by, bW, bH, px(3), px(3), "D");
      this.F(10, "bold", sevClr);
      this.doc.text(sev.toUpperCase(), bx + bW / 2, by + bH * 0.68, { align: "center" });

      rx += C_SEV; this.vline(rx, this.y, this.y + ROW_H, C.border, 0.2);

      // Description
      const dsPad = (ROW_H - descLS.length * LH) / 2;
      let dY = this.y + dsPad + LH * 0.72;
      this.F(12, "normal", C.muted);
      descLS.forEach(l => { this.doc.text(l, rx + PAD_X, dY); dY += LH; });

      this.y += ROW_H;
    });

    this.y += px(8);
  }

  // ═════════════════════════════════════════════════════════════════════════//
  //  RECOMMENDATIONS  (three vertical cards: #FAFAFA, 1px border, 8px radius)
  // ═════════════════════════════════════════════════════════════════════════//

  drawRecommendations(section) {
    const groups = {
      immediate: { label: "Immediate Actions",             items: [] },
      short:     { label: "Short-Term Improvements",        items: [] },
      long:      { label: "Long-Term Preventive Measures",  items: [] },
    };
    let cur = null;
    section.items.forEach(item => {
      if (item.type === "subhead") {
        const t = item.text.toLowerCase();
        cur = t.includes("immediate") ? groups.immediate
            : t.includes("short")    ? groups.short
            : t.includes("long")     ? groups.long : null;
      } else if (cur && item.text) {
        cur.items.push(item.text);
      }
    });

    const populated = Object.values(groups).filter(g => g.items.length > 0);
    if (populated.length === 0) {
      section.items.forEach(it => {
        if (it.type === "bullet" || it.type === "ordered") this.drawBullet(it.text);
        else if (it.type === "para") this.drawPara(it.text);
      });
      return;
    }

    const CARD_PAD   = px(16);
    const CARD_RAD   = px(6);
    const TITLE_LH   = this.lh(11, 1.4);
    const BUL_LH     = this.lh(12, 1.55);
    const CARD_GAP   = px(10);

    populated.forEach((grp, gi) => {
      if (gi > 0) this.y += CARD_GAP;

      // Estimate card height
      let estH = CARD_PAD + TITLE_LH + px(4) + px(0.5) + px(6);
      grp.items.forEach(it => {
        const ls = this.split(it, this.cW - px(28) - CARD_PAD * 2, 12);
        estH += ls.length * BUL_LH + px(2);
      });
      estH += CARD_PAD;

      this.need(estH + px(4));

      const cy = this.y;
      this.rect(this.mL, cy, this.cW, estH, C.bgAlt, C.border, 0.2, CARD_RAD);

      this.y = cy + CARD_PAD;

      // Card title (10px, bold, accent)
      this.F(11, "bold", C.accent);
      this.doc.text(grp.label.toUpperCase(), this.mL + CARD_PAD, this.y);
      this.y += TITLE_LH;

      // Thin divider below title
      this.y += px(4);
      this.hline(this.y, C.border, 0.2,
        this.mL + CARD_PAD, this.W - this.mR - CARD_PAD);
      this.y += px(6);

      // Bullet items
      grp.items.forEach(item => {
        const ind = px(14);
        const ls  = this.split(item, this.cW - CARD_PAD * 2 - ind, 12);
        this.F(12, "normal", C.muted);
        this.doc.text("•", this.mL + CARD_PAD + px(4), this.y);
        this.F(12, "normal", C.text);
        ls.forEach(l => { this.doc.text(l, this.mL + CARD_PAD + ind, this.y); this.y += BUL_LH; });
        this.y += px(2);
      });

      // Advance to bottom of card
      this.y = cy + estH + 0;
    });

    this.y += px(6);
  }

  // ═════════════════════════════════════════════════════════════════════════//
  //  COMMANDS  (compact mono block, 11px, 10px padding, 6px radius)
  // ═════════════════════════════════════════════════════════════════════════//

  drawCodeLines(rawLines) {
    const clean = rawLines.map(l => l.trim().replace(/^\$\s+/, "")).filter(Boolean);
    if (clean.length === 0) return;

    const PAD  = px(10);
    const PT   = 11 * 0.75;   // 11px → pt
    const LH   = PT * 0.3528 * 1.4;
    const maxW = this.cW - PAD * 2;

    const blocks = clean.map(cmd => {
      this.doc.setFont("courier", "normal");
      this.doc.setFontSize(PT);
      return this.doc.splitTextToSize(cmd, maxW);
    });

    const totalLines = blocks.reduce((s, b) => s + b.length, 0);
    const gapH = (blocks.length - 1) * px(5);
    const boxH = totalLines * LH + gapH + PAD * 2;

    this.need(boxH + px(4));
    this.rect(this.mL, this.y, this.cW, boxH, C.bgLight, C.border, 0.2, px(6));

    this.doc.setFont("courier", "normal");
    this.doc.setFontSize(PT);
    this.tc(...C.text);

    let ty = this.y + PAD + LH * 0.72;
    blocks.forEach((ls, ci) => {
      if (ci > 0) ty += px(5);
      ls.forEach(l => { this.doc.text(l, this.mL + PAD, ty); ty += LH; });
    });

    this.y += boxH + px(8);
  }

  drawCommandSection(section) {
    const cmds = [];
    section.items.forEach(item => {
      if (item.type === "code") {
        item.lines.forEach(l => { const cl = l.trim().replace(/^\$\s+/, ""); if (cl) cmds.push(cl); });
      } else if (item.type === "subhead") {
        this.drawSubhead(item.text);
      } else if (item.type === "para") {
        this.drawPara(item.text);
      }
    });
    if (cmds.length > 0) this.drawCodeLines(cmds);
  }

  // ═════════════════════════════════════════════════════════════════════════//
  //  AI METADATA  (4 equal cards: #FAFAFA bg, 1px border, 8px radius, 70px)
  // ═════════════════════════════════════════════════════════════════════════//

  drawMetadataCards(meta) {
    const dt = fmtDate(meta.generatedAt);
    const cards = [
      { label: "Model",           value: meta.model || "—" },
      { label: "Total Tokens",    value: String(meta.tokens || "—") },
      { label: "Generation Time", value: fmtDuration(meta.duration) },
      { label: "Generated At",    value: dt.date },
    ];

    const GAP   = px(8);
    const cardW = (this.cW - GAP * 3) / 4;
    const cardH = px(64);   // ~70px visual
    const r     = px(6);

    this.need(cardH + px(8));

    cards.forEach((card, i) => {
      const cx = this.mL + i * (cardW + GAP);
      this.rect(cx, this.y, cardW, cardH, C.bgAlt, C.border, 0.2, r);

      // Label
      this.F(10, "bold", C.muted);
      this.doc.text(card.label.toUpperCase(), cx + px(12), this.y + px(18));

      // Value
      const ls = this.split(card.value, cardW - px(24), 12, "bold");
      this.F(12, "bold", C.text);
      let vy = this.y + px(34);
      ls.slice(0, 2).forEach(l => { this.doc.text(l, cx + px(12), vy); vy += this.lh(12, 1.3); });
    });

    this.y += cardH + px(8);
  }

  // ═════════════════════════════════════════════════════════════════════════//
  //  FOOTER  (fixed to page bottom, thin grey divider, 10px text)
  // ═════════════════════════════════════════════════════════════════════════//

  stampFooters() {
    const total = this.doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p);

      const fy = this.H - this.mB - this.footH;

      // Separator
      this.hline(fy, C.border, 0.2);

      // Line 1 — brand name + platform
      this.F(10, "bold", C.muted);
      this.doc.text("KubeSage AI", this.mL, fy + px(14));
      this.F(10, "normal", C.muted);
      this.doc.text("  ·  AI-Powered Kubernetes Investigation Platform",
        this.mL + px(4), fy + px(14));

      // Line 2 — confidential notice (left) + page number (right)
      this.F(9, "italic", C.muted);
      this.doc.text(
        "Confidential – Generated for internal SRE investigation purposes.",
        this.mL, fy + px(28)
      );
      this.F(9, "bold", C.muted);
      this.doc.text(`Page ${p} of ${total}`, this.W - this.mR, fy + px(28), { align: "right" });
    }
  }

  // ═════════════════════════════════════════════════════════════════════════//
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════════//

  render(meta, markdownContent) {
    this.y = this.mT;

    this.drawHeader(meta);
    this.drawOverview(meta);

    const sections = parseMarkdown(markdownContent);

    sections.forEach(sec => {
      const tl = sec.title.toLowerCase();

      if (tl === "executive summary") {
        this.drawSectionTitle("Executive Summary");
        this.drawBox(sec.items);

      } else if (tl === "findings") {
        this.need(px(50));
        this.drawSectionTitle("Findings");
        this.drawFindingsTable(meta.issues);

      } else if (tl === "impact assessment") {
        this.drawSectionTitle("Impact Assessment");
        this.drawBox(sec.items);

      } else if (tl === "recommendations") {
        this.need(px(60));
        this.drawSectionTitle("Recommendations");
        this.drawRecommendations(sec);

      } else if (tl.includes("command") || tl.includes("diagnostic")) {
        this.need(px(40));
        this.drawSectionTitle("Recommended Commands");
        this.drawCommandSection(sec);

      } else {
        this.need(px(30));
        this.drawSectionTitle(sec.title);
        sec.items.forEach(item => {
          if (item.type === "para")    this.drawPara(item.text);
          else if (item.type === "bullet" || item.type === "ordered") this.drawBullet(item.text);
          else if (item.type === "subhead") this.drawSubhead(item.text);
          else if (item.type === "code") this.drawCodeLines(item.lines);
        });
      }
    });

    // AI Metadata
    this.need(px(20) + px(20) + px(64) + px(12));
    this.drawSectionTitle("AI Generation Metadata");
    this.drawMetadataCards(meta);

    this.stampFooters();
    return this.doc;
  }
}

// ═══════════════════════════════════════════════════════════════════════════ //
//  Public API
// ═══════════════════════════════════════════════════════════════════════════ //

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
  const a    = Object.assign(document.createElement("a"), { href: url, download: `Investigation_INV-${pad}.md` });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportPDF = async (params) => {
  try {
    const {
      markdownContent, investigationId, clusterName,
      status, model, tokens, duration, generatedAt, findings, issues,
    } = params;

    const meta = { investigationId, clusterName, status, model, tokens, duration, generatedAt, findings, issues };

    const report = new PDFReport();
    const pdf    = report.render(meta, markdownContent);
    const pad    = String(investigationId).padStart(5, "0");
    pdf.save(`KubeSage_AI_Report_INV-${pad}.pdf`);
    return true;
  } catch (err) {
    console.error("exportPDF:", err);
    return false;
  }
};
