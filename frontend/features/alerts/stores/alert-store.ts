import { create } from 'zustand';
import type { Alert } from '@/contracts';

interface AlertStoreState {
  isCreateModalOpen: boolean;
  editingAlert: Alert | null;
  selectedSymbol: string;
  openCreateModal: (symbol?: string) => void;
  closeCreateModal: () => void;
  openEditModal: (alert: Alert) => void;
  closeEditModal: () => void;
}

export const useAlertStore = create<AlertStoreState>((set) => ({
  isCreateModalOpen: false,
  editingAlert: null,
  selectedSymbol: '',
  openCreateModal: (symbol = '') => set({ isCreateModalOpen: true, selectedSymbol: symbol }),
  closeCreateModal: () => set({ isCreateModalOpen: false, selectedSymbol: '' }),
  openEditModal: (alert) => set({ editingAlert: alert }),
  closeEditModal: () => set({ editingAlert: null }),
}));
