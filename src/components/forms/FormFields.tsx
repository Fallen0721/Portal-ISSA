import { clsx } from "clsx";

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    options: { value: string; label: string }[];
    error?: string;
}

export const SelectField = ({ label, options, className, error, ...props }: SelectFieldProps) => (
    <div className={className}>
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        <select
            className={clsx(
                "w-full rounded-lg border bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20",
                error ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary"
            )}
            {...props}
        >
            <option value="">Seleccionar...</option>
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
);

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export const InputField = ({ label, className, error, ...props }: InputFieldProps) => (
    <div className={className}>
        <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
        <input
            className={clsx(
                "w-full rounded-lg border bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20",
                error ? "border-red-500 focus:border-red-500" : "border-slate-200 focus:border-primary"
            )}
            {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
);
