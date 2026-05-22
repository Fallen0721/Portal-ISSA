import ReactECharts from 'echarts-for-react';
import { useMemo } from 'react';
import { Venta } from '../../types/models';
import { format, parseISO, startOfDay, startOfHour, startOfMonth, startOfYear } from 'date-fns';
import { es } from 'date-fns/locale';

interface TrendChartProps {
    data: Venta[];
    viewMode?: 'hoy' | 'semana' | 'mes' | 'anual';
}

export const TrendChart = ({ data, viewMode = 'mes' }: TrendChartProps) => {
    const chartOption = useMemo(() => {
        const grouped = new Map<string, { bucketDate: Date; ventas: Venta[] }>();

        for (const venta of data) {
            const date = parseISO(venta.fechaCierre ?? venta.fechaIngreso);

            let bucketDate: Date;
            let key: string;

            if (viewMode === 'hoy') {
                bucketDate = startOfHour(date);
                key = format(bucketDate, 'yyyy-MM-dd HH:00');
            } else if (viewMode === 'semana') {
                bucketDate = startOfDay(date);
                key = format(bucketDate, 'yyyy-MM-dd');
            } else if (viewMode === 'mes') {
                bucketDate = startOfMonth(date);
                key = format(bucketDate, 'yyyy-MM');
            } else {
                bucketDate = startOfYear(date);
                key = format(bucketDate, 'yyyy');
            }

            const existing = grouped.get(key);
            if (existing) {
                existing.ventas.push(venta);
            } else {
                grouped.set(key, { bucketDate, ventas: [venta] });
            }
        }

        const buckets = Array.from(grouped.values()).sort(
            (a, b) => a.bucketDate.getTime() - b.bucketDate.getTime()
        );

        const countData = buckets.map((b) => b.ventas.length);
        const sumDataL = buckets.map((b) =>
            b.ventas.filter(v => v.moneda === 'L').reduce((sum, v) => sum + v.primaNetaAnual, 0)
        );
        const sumDataD = buckets.map((b) =>
            b.ventas.filter(v => v.moneda === '$').reduce((sum, v) => sum + v.primaNetaAnual, 0)
        );
        const labels = buckets.map((b) => {
            if (viewMode === 'hoy') {
                return format(b.bucketDate, 'HH:00');
            }
            if (viewMode === 'semana') {
                return format(b.bucketDate, 'EEE d', { locale: es });
            }
            if (viewMode === 'mes') {
                return format(b.bucketDate, 'MMMM', { locale: es });
            }
            return format(b.bucketDate, 'yyyy');
        });

        const fmtL = (v: number) => `L ${new Intl.NumberFormat('es-HN', { maximumFractionDigits: 0 }).format(v)}`;
        const fmtD = (v: number) => `$ ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v)}`;

        return {
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    label: {
                        backgroundColor: '#6a7985'
                    }
                }
            },
            legend: {
                data: ['Ventas', 'Prima Neta (L)', 'Prima Neta ($)']
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: labels
            },
            yAxis: [
                {
                    type: 'value',
                    name: 'Ventas',
                    position: 'left'
                },
                {
                    type: 'value',
                    name: 'Prima',
                    position: 'right',
                    axisLabel: {
                        formatter: '{value}'
                    }
                }
            ],
            series: [
                {
                    name: 'Ventas',
                    type: 'line',
                    smooth: true,
                    areaStyle: {
                        opacity: 0.1,
                        color: '#005aa7'
                    },
                    lineStyle: {
                        color: '#005aa7'
                    },
                    itemStyle: {
                        color: '#005aa7'
                    },
                    data: countData
                },
                {
                    name: 'Prima Neta (L)',
                    type: 'line',
                    yAxisIndex: 1,
                    smooth: true,
                    lineStyle: {
                        color: '#de5b14',
                        width: 2,
                    },
                    itemStyle: {
                        color: '#de5b14'
                    },
                    tooltip: {
                        valueFormatter: fmtL,
                    },
                    data: sumDataL
                },
                {
                    name: 'Prima Neta ($)',
                    type: 'line',
                    yAxisIndex: 1,
                    smooth: true,
                    lineStyle: {
                        color: '#0d9488',
                        width: 2,
                        type: 'dashed'
                    },
                    itemStyle: {
                        color: '#0d9488'
                    },
                    tooltip: {
                        valueFormatter: fmtD,
                    },
                    data: sumDataD
                }
            ],
            dataZoom: [
                {
                    type: 'inside',
                    start: 0,
                    end: 100
                },
                {
                    start: 0,
                    end: 100
                }
            ]
        };
    }, [data, viewMode]);

    return (
        <div className="h-64 sm:h-80 lg:h-[400px]">
            <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
        </div>
    );
};
