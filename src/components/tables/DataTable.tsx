import { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (item: T) => ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    isLoading?: boolean;
    onRowClick?: (item: T) => void;
    emptyMessage?: string;
    footer?: ReactNode;
}

export const DataTable = <T extends { id: string | number }>({
    data,
    columns,
    isLoading,
    onRowClick,
    emptyMessage = 'No se encontraron datos',
    footer
}: DataTableProps<T>) => {
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-medium">
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i} className={clsx("px-6 py-4", col.className)}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((item) => (
                            <tr
                                key={item.id}
                                className={clsx(
                                    "hover:bg-slate-50 transition-colors",
                                    onRowClick && "cursor-pointer"
                                )}
                                onClick={() => onRowClick && onRowClick(item)}
                            >
                                {columns.map((col, i) => (
                                    <td key={i} className={clsx("px-6 py-4 text-sm text-slate-600", col.className)}>
                                        {col.cell ? col.cell(item) : (col.accessorKey ? String(item[col.accessorKey]) : '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {footer && (
                <div className="border-t border-slate-200 bg-white px-4 py-3">
                    {footer}
                </div>
            )}
        </div>
    );
};
