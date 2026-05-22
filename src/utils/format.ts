export const formatCurrency = (amount: number, currency: 'L' | '$') => {
    return new Intl.NumberFormat('es-HN', {
        style: 'currency',
        currency: currency === 'L' ? 'HNL' : 'USD',
        currencyDisplay: 'symbol',
        minimumFractionDigits: 2
    }).format(amount).replace('HNL', 'L'); // Custom replacement if needed, Intl uses HNL
};

export const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-HN').format(num);
};

export const truncate = (str: string, length: number) => {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
};
