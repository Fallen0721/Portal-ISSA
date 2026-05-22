import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';

interface KpiCardProps {
    title: string;
    value: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    trendLabel?: string;
    icon: LucideIcon;
    variant?: 'primary' | 'accent' | 'neutral';
}

export const KpiCard = ({ title, value, trend, trendLabel, icon: Icon, variant = 'neutral' }: KpiCardProps) => {
    const styles = {
        primary: 'bg-gradient-to-br from-primary to-primary-dark text-white',
        accent: 'bg-gradient-to-br from-accent to-accent-dark text-white',
        neutral: 'bg-white border border-slate-200',
    };

    const iconStyles = {
        primary: 'text-white/80 bg-white/20',
        accent: 'text-white/80 bg-white/20',
        neutral: 'text-primary bg-blue-50',
    };

    const textColor = variant === 'neutral' ? 'text-slate-900' : 'text-white';
    const subTextColor = variant === 'neutral' ? 'text-slate-500' : 'text-white/80';

    return (
        <div className={clsx('rounded-xl p-6 shadow-sm', styles[variant])}>
            <div className="flex items-start justify-between">
                <div>
                    <p className={clsx('text-sm font-medium mb-1', subTextColor)}>{title}</p>
                    <h3 className={clsx('text-2xl font-bold', textColor)}>{value}</h3>

                    {trend && (
                        <div className={clsx('flex items-center gap-1 mt-2 text-xs font-medium',
                            trend.isPositive ? 'text-green-500' : 'text-red-500',
                            variant !== 'neutral' && 'text-white/90'
                        )}>
                            {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            <span>{Math.abs(trend.value)}% {trendLabel ?? 'vs periodo anterior'}</span>
                        </div>
                    )}
                </div>
                <div className={clsx('p-3 rounded-lg', iconStyles[variant])}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
};
