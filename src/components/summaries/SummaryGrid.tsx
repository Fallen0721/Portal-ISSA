import { useMemo } from 'react';
import { Venta } from '../../types/models';
import { groupBy } from '../../utils/grouping';
import { formatCurrency } from '../../utils/format';
import { clsx } from 'clsx';

interface SummaryGridProps {
    data: Venta[];
}

export const SummaryGrid = ({ data }: SummaryGridProps) => {
    const summaries = useMemo(() => {
        return {
            status: groupBy(data, v => v.status),
            product: groupBy(data, v => v.producto),
            channel: groupBy(data, v => v.canal),
        };
    }, [data]);

    const renderGroupBase = (title: string, groups: Record<string, Venta[]>, colorBase: string) => {
        const sortedKeys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">{title}</h3>
                <div className="space-y-3">
                    {sortedKeys.map((key) => {
                        const items = groups[key];
                        const count = items.length;
                        const percentage = Math.round((count / data.length) * 100);
                        const primaL = items
                            .filter(v => v.moneda === 'L')
                            .reduce((s, v) => s + v.primaNetaAnual, 0);
                        const primaD = items
                            .filter(v => v.moneda === '$')
                            .reduce((s, v) => s + v.primaNetaAnual, 0);

                        return (
                            <div key={key}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-slate-700">{key.replace(/_/g, ' ')}</span>
                                    <span className="text-slate-500">{count} ({percentage}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={clsx("h-full rounded-full", colorBase)}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <div className="mt-1 flex gap-3 text-[11px] font-mono text-slate-400">
                                    {primaL > 0 && <span>{formatCurrency(primaL, 'L')}</span>}
                                    {primaD > 0 && <span>{formatCurrency(primaD, '$')}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {renderGroupBase('Por Estatus', summaries.status, 'bg-blue-500')}
            {renderGroupBase('Por Producto', summaries.product, 'bg-indigo-500')}
            {renderGroupBase('Por Canal', summaries.channel, 'bg-accent')}
        </div>
    );
};
