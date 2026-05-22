import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const formatDate = (dateStr: string | null | undefined, formatStr: string = 'dd/MM/yyyy') => {
    if (!dateStr) return '-';
    try {
        return format(parseISO(dateStr), formatStr, { locale: es });
    } catch (e) {
        return dateStr;
    }
};

export const calculateDays = (start: string, end: string) => {
    try {
        return differenceInDays(parseISO(end), parseISO(start)) + 1; // Inclusive
    } catch (e) {
        return 0;
    }
};
