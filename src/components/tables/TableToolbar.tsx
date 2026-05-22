import { Plus } from 'lucide-react';

interface TableToolbarProps {
    title: string;
    onCreated?: () => void;
    actionLabel?: string;
    children?: React.ReactNode;
}

export const TableToolbar = ({ title, onCreated, actionLabel = 'Nuevo', children }: TableToolbarProps) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>

            <div className="flex items-center gap-3">
                {children}
                {onCreated && (
                    <button
                        onClick={onCreated}
                        className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary/30"
                    >
                        <Plus size={18} />
                        {actionLabel}
                    </button>
                )}
            </div>
        </div>
    );
};
