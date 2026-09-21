"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

type ImportResult = {
  imported: number;
  total: number;
  errors: { row: number; message: string }[];
};

/**
 * "Import attendance (CSV/Excel)" button for the Priority Roster header.
 * Reads the picked file client-side — .xlsx is converted to CSV text
 * in-browser via SheetJS (first sheet only) so it flows through the
 * exact same pipeline as a native CSV upload — then POSTs the CSV text
 * to /api/attendance-import and shows a result summary. Imported rows
 * go through the real recordPointEvent() ledger (see
 * src/lib/csv-import.ts / src/app/api/attendance-import/route.ts) —
 * this is a real DB write, not a mock addition, even though the
 * roster list itself still renders from mock data (a pre-existing,
 * separate gap — see docs/planning/employee-track-record-plan.md).
 * Points/termination status for an imported employee are visible
 * immediately on their profile page and on /insights.
 *
 * PDF import is a deferred follow-up — this button handles CSV/XLSX.
 */
export function AttendanceImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | { error: string } | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setResult(null);
    try {
      const name = file.name.toLowerCase();
      let csv: string;
      if (name.endsWith(".csv")) {
        csv = await file.text();
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setResult({ error: "That spreadsheet has no sheets." });
          return;
        }
        csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheetName]);
      } else {
        setResult({ error: "Please choose a .csv or .xlsx file. PDF import is coming soon." });
        return;
      }
      const response = await fetch("/api/attendance-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await response.json();
      if (!response.ok && !("imported" in data)) {
        setResult({ error: data.error ?? "Import failed." });
        return;
      }
      setResult(data as ImportResult);
      if ((data as ImportResult).imported > 0) {
        router.refresh();
      }
    } catch {
      setResult({ error: "Import failed — check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="border border-line bg-white/70 px-3 py-1.5 text-sm font-medium text-slate/75 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      >
        {busy ? "Importing…" : "Import attendance (CSV/Excel)"}
      </button>

      {result ? (
        <div
          role="status"
          className="absolute top-full right-0 z-40 mt-2 w-72 border border-line bg-white p-3 text-sm shadow-lg sm:w-80"
        >
          {"error" in result ? (
            <p className="text-danger-soft">{result.error}</p>
          ) : (
            <>
              <p className="font-medium text-ink">
                Imported {result.imported} of {result.total} row
                {result.total === 1 ? "" : "s"}.
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-slate/65">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
              {result.imported > 0 && (
                <p className="mt-2 text-slate/55">
                  Points updated in real time on each employee&rsquo;s profile
                  and on /insights.
                </p>
              )}
            </>
          )}
          <button
            type="button"
            onClick={() => setResult(null)}
            className="mt-2 text-sm font-medium text-accent-deep hover:text-ink"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
