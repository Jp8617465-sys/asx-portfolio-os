import { useNotificationStore, notify } from '../stores/notification-store';

// Zustand persist writes to localStorage — jsdom provides it but we clear between tests
beforeEach(() => {
  useNotificationStore.setState({ notifications: [], unreadCount: 0 });
  localStorage.clear();
});

describe('useNotificationStore', () => {
  describe('addNotification', () => {
    it('prepends a notification and increments unreadCount', () => {
      useNotificationStore.getState().addNotification({
        type: 'info',
        title: 'Test',
        message: 'Hello',
      });

      const { notifications, unreadCount } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Test');
      expect(notifications[0].isRead).toBe(false);
      expect(unreadCount).toBe(1);
    });

    it('adds multiple notifications in reverse order (newest first)', () => {
      useNotificationStore
        .getState()
        .addNotification({ type: 'info', title: 'First', message: 'a' });
      useNotificationStore
        .getState()
        .addNotification({ type: 'info', title: 'Second', message: 'b' });

      const { notifications } = useNotificationStore.getState();
      expect(notifications[0].title).toBe('Second');
      expect(notifications[1].title).toBe('First');
      expect(useNotificationStore.getState().unreadCount).toBe(2);
    });
  });

  describe('markAsRead', () => {
    it('marks an unread notification as read and decrements count', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'N1', message: 'm' });
      const id = useNotificationStore.getState().notifications[0].id;

      useNotificationStore.getState().markAsRead(id);

      const { notifications, unreadCount } = useNotificationStore.getState();
      expect(notifications[0].isRead).toBe(true);
      expect(unreadCount).toBe(0);
    });

    it('does not change count when notification is already read', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'N1', message: 'm' });
      const id = useNotificationStore.getState().notifications[0].id;

      // Read it once
      useNotificationStore.getState().markAsRead(id);
      // Read it again — count should stay 0
      useNotificationStore.getState().markAsRead(id);

      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it('does not change state for unknown id', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'N1', message: 'm' });
      useNotificationStore.getState().markAsRead('nonexistent-id');

      expect(useNotificationStore.getState().unreadCount).toBe(1);
      expect(useNotificationStore.getState().notifications[0].isRead).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('sets all notifications to read and count to 0', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'A', message: 'a' });
      useNotificationStore.getState().addNotification({ type: 'error', title: 'B', message: 'b' });

      useNotificationStore.getState().markAllAsRead();

      const { notifications, unreadCount } = useNotificationStore.getState();
      expect(notifications.every((n) => n.isRead)).toBe(true);
      expect(unreadCount).toBe(0);
    });
  });

  describe('removeNotification', () => {
    it('removes an unread notification and decrements count', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'R', message: 'r' });
      const id = useNotificationStore.getState().notifications[0].id;

      useNotificationStore.getState().removeNotification(id);

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it('removes a read notification without changing count', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'R', message: 'r' });
      const id = useNotificationStore.getState().notifications[0].id;
      useNotificationStore.getState().markAsRead(id);

      useNotificationStore.getState().removeNotification(id);

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('empties notifications and resets count', () => {
      useNotificationStore.getState().addNotification({ type: 'info', title: 'X', message: 'x' });
      useNotificationStore.getState().addNotification({ type: 'error', title: 'Y', message: 'y' });

      useNotificationStore.getState().clearAll();

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });
});

// ── notify helper ────────────────────────────────────────────────────────────

describe('notify helper', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
  });

  it('notify.success adds a success notification', () => {
    notify.success('Win', 'You won');
    const n = useNotificationStore.getState().notifications[0];
    expect(n.type).toBe('success');
    expect(n.title).toBe('Win');
    expect(n.message).toBe('You won');
  });

  it('notify.error adds an error notification', () => {
    notify.error('Fail', 'Something broke');
    expect(useNotificationStore.getState().notifications[0].type).toBe('error');
  });

  it('notify.warning adds a warning notification', () => {
    notify.warning('Warn', 'Be careful');
    expect(useNotificationStore.getState().notifications[0].type).toBe('warning');
  });

  it('notify.info adds an info notification', () => {
    notify.info('Info', 'FYI');
    expect(useNotificationStore.getState().notifications[0].type).toBe('info');
  });

  it('notify.success supports optional actionUrl and actionLabel', () => {
    notify.success('Win', 'Details', '/dashboard', 'View');
    const n = useNotificationStore.getState().notifications[0];
    expect(n.actionUrl).toBe('/dashboard');
    expect(n.actionLabel).toBe('View');
  });
});
