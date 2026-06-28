import { StyleSheet } from "@react-pdf/renderer";

export const C = {
  accent: "#1E40AF",   // Dark blue accent only if absolutely necessary
  text: "#111827",     // Black text
  secondary: "#4B5563", // Dark gray text
  border: "#D1D5DB",   // Gray borders
  bg: "#FFFFFF",
  bgLight: "#F9FAFB",  // Soft gray for table header/rows
  white: "#FFFFFF",
  red: "#991B1B",      // Dark red for severity HIGH
  amber: "#9A3412",    // Dark orange for severity MEDIUM
  green: "#166534",    // Dark green for severity LOW
};

export const S = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: C.bg,
    // Page margins 45px, padding top 100px to clear fixed header, bottom 65px to clear fixed footer
    paddingTop: 100,
    paddingBottom: 65,
    paddingLeft: 45,
    paddingRight: 45,
  },
  
  // Header Style (fixed, absolutely positioned)
  headerContainer: {
    position: "absolute",
    top: 45,
    left: 45,
    right: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flexDirection: "column",
  },
  headerBrand: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.text,
    marginBottom: 1,
  },
  headerTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: C.text,
    marginBottom: 1,
  },
  headerSubtitle: {
    fontSize: 8,
    color: C.secondary,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerInvId: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: C.accent, // Dark blue accent for INV ID
    marginBottom: 1,
  },
  headerMeta: {
    fontSize: 8,
    color: C.secondary,
    marginBottom: 1,
  },
  headerDivider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginTop: 4,
    width: "100%",
  },

  // Section Styles (Reduced spacing by 30%)
  sectionContainer: {
    marginTop: 20, // Reduced from 30px
    marginBottom: 12, // Reduced from 20px
  },
  sectionTitle: {
    fontSize: 16, // 16px section headings
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: C.text,
    marginBottom: 10, // Increased spacing between title and divider line
  },
  sectionDivider: {
    borderBottomWidth: 1, // 1px gray line
    borderBottomColor: C.border,
    marginBottom: 10, // Consistent vertical rhythm gap before content starts
  },
  sectionContent: {
    marginTop: 0,
  },

  // Body text: 10.5px
  bodyText: {
    fontSize: 10.5,
    color: C.text,
    lineHeight: 1.5,
  },

  // Overview and Metadata Tables (Key-Value style, table text 9.5px)
  kvTable: {
    width: "100%",
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: "column",
  },
  kvRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "center",
    minHeight: 28, // Reduced from 40px
  },
  kvRowLast: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 28,
  },
  kvCellKey: {
    width: "35%", // Column 1: 35%
    fontSize: 9.5, // Table text: 9.5px
    fontFamily: "Helvetica-Bold",
    color: C.secondary,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 5,   // 5px padding top
    paddingBottom: 5, // 5px padding bottom
    textTransform: "uppercase",
  },
  kvCellValue: {
    width: "65%", // Column 2: 65%
    fontSize: 9.5, // Table text: 9.5px
    color: C.text,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 5,   // 5px padding top
    paddingBottom: 5, // 5px padding bottom
    lineHeight: 1.3,
  },

  // Findings Table (Table text: 9.5px)
  findTable: {
    width: "100%",
    flexDirection: "column",
    borderTopWidth: 1,
    borderTopColor: C.border,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  findHeader: {
    flexDirection: "row",
    backgroundColor: C.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "center",
  },
  findRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "center",
  },
  findRowLast: {
    flexDirection: "row",
    alignItems: "center",
  },
  findCellHeader: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.secondary,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 5,
    paddingBottom: 5,
    textTransform: "uppercase",
  },
  findCellBold: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: C.text,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 5,
    paddingBottom: 5,
  },
  findCell: {
    fontSize: 9.5,
    color: C.text,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 5,
    paddingBottom: 5,
  },
  findCellMuted: {
    fontSize: 9.5,
    color: C.secondary,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 5,
    paddingBottom: 5,
    lineHeight: 1.3,
  },

  // Recommendations Styles (subheading 12px blue/accent, bullet points 10.5px)
  recoSubheading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.text, // Monochrome black instead of C.accent blue
    marginTop: 8,
    marginBottom: 4,
  },
  bulletList: {
    flexDirection: "column",
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4, // 4px between list items
  },
  bulletSign: {
    width: 10,
    fontSize: 10.5,
    color: C.secondary,
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5, // bullet points: 10.5px
    color: C.text,
    lineHeight: 1.4,
  },

  // Diagnostic Commands Code Block
  codeBlock: {
    backgroundColor: "#FAFAFA", // Specifically requested code box bg
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: 10, // padding: 10
    marginTop: 2,
    marginBottom: 2,
  },
  codeLine: {
    fontFamily: "Courier",
    fontSize: 8, // Reduced from 10 to 8 to avoid awkward wraps on long commands
    color: C.text,
    lineHeight: 1.4,
  },

  // Footer Style (footer font: 8px)
  footer: {
    position: "absolute",
    bottom: 45,
    left: 45,
    right: 45,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: C.secondary,
  },
});
