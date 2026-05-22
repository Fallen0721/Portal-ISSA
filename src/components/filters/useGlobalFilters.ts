import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DateRange } from '../../types/models';

interface GlobalFilterStore {
  dateRange: DateRange;
  search: string;
  setDateRange: (range: DateRange) => void;
  setSearch: (search: string) => void;
  reset: () => void;
}

export const useGlobalFilters = create<GlobalFilterStore>()(
  persist(
    (set) => ({
      dateRange: { from: null, to: null },
      search: '',
      setDateRange: (dateRange) => set({ dateRange }),
      setSearch: (search) => set({ search }),
      reset: () => set({ dateRange: { from: null, to: null }, search: '' }),
    }),
    { name: 'ventas-global-filters' },
  ),
);
