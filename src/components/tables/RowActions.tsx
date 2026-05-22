import { Edit2, Trash2, Eye } from 'lucide-react';
import { clsx } from 'clsx';

interface ActionButtonProps {
    onClick: (e: React.MouseEvent) => void;
    icon: typeof Edit2;
    variant?: 'primary' | 'danger' | 'neutral';
    title?: string;
}

const ActionButton = ({ onClick, icon: Icon, variant = 'neutral', title }: ActionButtonProps) => {
    const styles = {
        primary: 'text-primary hover:bg-blue-50',
        danger: 'text-red-500 hover:bg-red-50',
        neutral: 'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
    };

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick(e);
            }}
            className={clsx("p-2 rounded-lg transition-colors", styles[variant])}
            title={title}
        >
            <Icon size={16} />
        </button>
    );
};

interface RowActionsProps {
    onEdit?: () => void;
    onDelete?: () => void;
    onView?: () => void;
    customActions?: React.ReactNode;
}

export const RowActions = ({ onEdit, onDelete, onView, customActions }: RowActionsProps) => {
    return (
        <div className="flex items-center gap-1 justify-end">
            {customActions}
            {onView && <ActionButton icon={Eye} onClick={onView} title="Ver detalles" />}
            {onEdit && <ActionButton icon={Edit2} onClick={onEdit} variant="primary" title="Editar" />}
            {onDelete && <ActionButton icon={Trash2} onClick={onDelete} variant="danger" title="Eliminar" />}
        </div>
    );
};
