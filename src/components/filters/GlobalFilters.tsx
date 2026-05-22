import { clsx } from "clsx";
import { Search, Calendar as CalendarIcon } from "lucide-react";
import { useGlobalFilters } from "./useGlobalFilters";
import { ChangeEvent, ReactNode } from "react";

interface GlobalFiltersProps {
  searchPlaceholder?: string;
  statusValue?: string;
  statusOptions?: { value: string; label: string }[];
  onStatusChange?: (value: string) => void;
  secondaryValue?: string;
  secondaryOptions?: { value: string; label: string }[];
  onSecondaryChange?: (value: string) => void;
  extraRow?: ReactNode;
  statusSlot?: ReactNode;
}

export const GlobalFilters = ({
  searchPlaceholder = "Buscar por nombre, póliza...",
  statusValue,
  statusOptions,
  onStatusChange,
  secondaryValue,
  secondaryOptions,
  onSecondaryChange,
  extraRow,
  statusSlot,
}: GlobalFiltersProps) => {
  const { search, setSearch, dateRange, setDateRange } = useGlobalFilters();

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handleDateChange = (field: "from" | "to", value: string) => {
    setDateRange({
      ...dateRange,
      [field]: value || null,
    });
  };

  const hasStatusCol =
    (statusOptions && onStatusChange) || Boolean(statusSlot);
  const gridTemplateClass =
    hasStatusCol && secondaryOptions && onSecondaryChange
      ? "xl:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.7fr))]"
      : "xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.7fr))]";


  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={clsx("grid grid-cols-1 gap-4", gridTemplateClass)}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={handleSearchChange}
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <CalendarIcon size={18} className="text-slate-400" />
          <span>Desde</span>
          <input
            type="date"
            value={dateRange.from ?? ""}
            onChange={(event) => handleDateChange("from", event.target.value)}
            className="min-w-0 bg-transparent text-slate-900 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <CalendarIcon size={18} className="text-slate-400" />
          <span>Hasta</span>
          <input
            type="date"
            value={dateRange.to ?? ""}
            onChange={(event) => handleDateChange("to", event.target.value)}
            className="min-w-0 bg-transparent text-slate-900 outline-none"
          />
        </div>

        {statusOptions && onStatusChange ? (
          <select
            value={statusValue ?? "all"}
            onChange={(event) => onStatusChange(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : statusSlot ? (
          statusSlot
        ) : (
          <div />
        )}

        {secondaryOptions && onSecondaryChange ? (
          <select
            value={secondaryValue ?? "all"}
            onChange={(event) => onSecondaryChange(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {secondaryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}

      </div>

      {extraRow && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          {extraRow}
        </div>
      )}
    </div>
  );
};
