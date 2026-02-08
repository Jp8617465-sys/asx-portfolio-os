import { useAlertStore } from '../alert-store';
import type { Alert } from '@/contracts';

describe('useAlertStore', () => {
  const mockAlert: Alert = {
    id: 1,
    userId: 1,
    symbol: 'CBA.AX',
    alertType: 'PRICE_ABOVE',
    threshold: 105.5,
    status: 'active',
    notificationChannel: 'email',
    createdAt: '2026-02-01T10:00:00Z',
  };

  beforeEach(() => {
    // Reset the store to initial state before each test
    useAlertStore.setState({
      isCreateModalOpen: false,
      editingAlert: null,
      selectedSymbol: '',
    });
  });

  it('should have correct initial state', () => {
    const state = useAlertStore.getState();
    expect(state.isCreateModalOpen).toBe(false);
    expect(state.editingAlert).toBeNull();
    expect(state.selectedSymbol).toBe('');
  });

  it('should open create modal without symbol', () => {
    useAlertStore.getState().openCreateModal();
    const state = useAlertStore.getState();
    expect(state.isCreateModalOpen).toBe(true);
    expect(state.selectedSymbol).toBe('');
  });

  it('should open create modal with symbol', () => {
    useAlertStore.getState().openCreateModal('BHP.AX');
    const state = useAlertStore.getState();
    expect(state.isCreateModalOpen).toBe(true);
    expect(state.selectedSymbol).toBe('BHP.AX');
  });

  it('should close create modal and reset symbol', () => {
    useAlertStore.getState().openCreateModal('CBA.AX');
    expect(useAlertStore.getState().isCreateModalOpen).toBe(true);

    useAlertStore.getState().closeCreateModal();
    const state = useAlertStore.getState();
    expect(state.isCreateModalOpen).toBe(false);
    expect(state.selectedSymbol).toBe('');
  });

  it('should open edit modal with alert', () => {
    useAlertStore.getState().openEditModal(mockAlert);
    const state = useAlertStore.getState();
    expect(state.editingAlert).toEqual(mockAlert);
  });

  it('should close edit modal and clear editing alert', () => {
    useAlertStore.getState().openEditModal(mockAlert);
    expect(useAlertStore.getState().editingAlert).not.toBeNull();

    useAlertStore.getState().closeEditModal();
    expect(useAlertStore.getState().editingAlert).toBeNull();
  });

  it('should handle opening create modal after edit modal', () => {
    useAlertStore.getState().openEditModal(mockAlert);
    expect(useAlertStore.getState().editingAlert).toEqual(mockAlert);

    useAlertStore.getState().closeEditModal();
    useAlertStore.getState().openCreateModal('WBC.AX');

    const state = useAlertStore.getState();
    expect(state.isCreateModalOpen).toBe(true);
    expect(state.selectedSymbol).toBe('WBC.AX');
    expect(state.editingAlert).toBeNull();
  });

  it('should preserve other state when opening create modal', () => {
    useAlertStore.getState().openEditModal(mockAlert);
    useAlertStore.getState().openCreateModal('ANZ.AX');

    const state = useAlertStore.getState();
    expect(state.isCreateModalOpen).toBe(true);
    expect(state.selectedSymbol).toBe('ANZ.AX');
    // editingAlert is still set - closing it is a separate action
    expect(state.editingAlert).toEqual(mockAlert);
  });
});
