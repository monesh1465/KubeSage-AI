import { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import EmptyState from "./EmptyState";

function DataTable({
  columns,
  rows,
  emptyMessage = "No data found",
  emptyIcon,
  searchable = true,
  searchPlaceholder = "Search...",
  stickyHeader = true,
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const filteredRows = useMemo(() => {
    let result = [...rows];

    if (query.trim()) {
      const lower = query.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const value = col.render ? "" : String(row[col.key] ?? "");
          return value.toLowerCase().includes(lower);
        })
      );
    }

    if (sortKey) {
      result.sort((a, b) => {
        const aVal = String(a[sortKey] ?? "").toLowerCase();
        const bVal = String(b[sortKey] ?? "").toLowerCase();
        if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [rows, columns, query, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyMessage}
        description="Try refreshing or check cluster connectivity."
      />
    );
  }

  return (
    <div>
      {searchable && (
        <div className="border-b border-[var(--color-border)] px-4 py-3">
          <div className="relative max-w-xs">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-secondary)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-2 pl-9 pr-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className={stickyHeader ? "sticky top-0 z-10" : ""}>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-5 py-3 font-medium text-[var(--color-secondary)]"
                >
                  {col.sortable === false ? (
                    col.label
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-[var(--color-text)]"
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span className="text-[var(--color-primary)]">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-8 text-center text-sm text-[var(--color-secondary)]"
                >
                  No results match your search.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => (
                <tr key={row.id ?? idx} className="hover:bg-[var(--color-bg)]/50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-3 text-[var(--color-text)]">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
