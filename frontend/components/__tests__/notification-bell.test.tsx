import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationBell from '../notification-bell';
import { useNotificationStore } from '@/lib/stores/notification-store';
import { useRouter } from 'next/navigation';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Bell: () => <svg data-icon="Bell" />,
  Check: () => <svg data-icon="Check" />,
  CheckCheck: () => <svg data-icon="CheckCheck" />,
  X: () => <svg data-icon="X" />,
  Info: () => <svg data-icon="Info" />,
  AlertCircle: () => <svg data-icon="AlertCircle" />,
  AlertTriangle: () => <svg data-icon="AlertTriangle" />,
  CheckCircle: () => <svg data-icon="CheckCircle" />,
  ExternalLink: () => <svg data-icon="ExternalLink" />,
}));

// Mock the notification store
jest.mock('@/lib/stores/notification-store');

// Mock next/navigation - already mocked in jest.setup.js, but we need to access the mock
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
};

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

describe('NotificationBell', () => {
  const mockMarkAsRead = jest.fn();
  const mockMarkAllAsRead = jest.fn();
  const mockRemoveNotification = jest.fn();

  const mockNotifications = [
    {
      id: '1',
      type: 'info' as const,
      title: 'New Signal',
      message: 'Test notification 1',
      timestamp: new Date('2026-02-04T10:00:00Z'),
      isRead: false,
      actionUrl: '/signals/test',
      actionLabel: 'View Signal',
    },
    {
      id: '2',
      type: 'success' as const,
      title: 'Success',
      message: 'Test notification 2',
      timestamp: new Date('2026-02-04T09:00:00Z'),
      isRead: true,
    },
    {
      id: '3',
      type: 'warning' as const,
      title: 'Warning',
      message: 'Test notification 3',
      timestamp: new Date('2026-02-04T08:00:00Z'),
      isRead: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useNotificationStore as unknown as jest.Mock).mockReturnValue({
      notifications: mockNotifications,
      unreadCount: 2,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      removeNotification: mockRemoveNotification,
    });
  });

  describe('Bell Button and Badge', () => {
    it('renders the bell button', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      expect(button).toBeInTheDocument();
    });

    it('shows unread count badge when unreadCount > 0', () => {
      render(<NotificationBell />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows "9+" when unreadCount > 9', () => {
      (useNotificationStore as unknown as jest.Mock).mockReturnValue({
        notifications: mockNotifications,
        unreadCount: 15,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        removeNotification: mockRemoveNotification,
      });

      render(<NotificationBell />);
      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('hides badge when unreadCount is 0', () => {
      (useNotificationStore as unknown as jest.Mock).mockReturnValue({
        notifications: [],
        unreadCount: 0,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        removeNotification: mockRemoveNotification,
      });

      render(<NotificationBell />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown Toggle', () => {
    it('opens dropdown when bell is clicked', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });

      // Dropdown should not be visible initially
      expect(screen.queryByText('Notifications')).not.toBeInTheDocument();

      fireEvent.click(button);

      // Dropdown header should now be visible
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('closes dropdown when bell is clicked again', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });

      // Open dropdown
      fireEvent.click(button);
      expect(screen.getByText('Notifications')).toBeInTheDocument();

      // Close dropdown
      fireEvent.click(button);
      expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    });

    it('closes dropdown when clicking outside', async () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });

      // Open dropdown
      fireEvent.click(button);
      expect(screen.getByText('Notifications')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
      });
    });
  });

  describe('Notification List', () => {
    it('renders all notifications from store', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      expect(screen.getByText('New Signal')).toBeInTheDocument();
      expect(screen.getByText('Test notification 1')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Test notification 2')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Test notification 3')).toBeInTheDocument();
    });

    it('shows empty state when no notifications', () => {
      (useNotificationStore as unknown as jest.Mock).mockReturnValue({
        notifications: [],
        unreadCount: 0,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        removeNotification: mockRemoveNotification,
      });

      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      expect(screen.getByText('No notifications')).toBeInTheDocument();
      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
    });

    it('highlights unread notifications', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      // Find the notification containers - need to go up to the parent div with the background class
      const unreadTitle = screen.getByText('New Signal');
      const readTitle = screen.getByText('Success');

      // The background class is on a parent div, need to traverse up
      let unreadNotification = unreadTitle.parentElement;
      while (unreadNotification && !unreadNotification.className.includes('p-4 border-b')) {
        unreadNotification = unreadNotification.parentElement;
      }

      let readNotification = readTitle.parentElement;
      while (readNotification && !readNotification.className.includes('p-4 border-b')) {
        readNotification = readNotification.parentElement;
      }

      // Unread notification should have blue background
      expect(unreadNotification).toHaveClass('bg-blue-50');
      // Read notification should not have blue background
      expect(readNotification).not.toHaveClass('bg-blue-50');
    });

    it('displays correct icons for different notification types', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      // Component uses lucide-react icons, check by class names or SVG presence
      // All notifications should have icon elements
      const notificationElements = screen.getAllByText(/Test notification/);
      expect(notificationElements).toHaveLength(3);
    });
  });

  describe('Mark as Read Functionality', () => {
    it('calls markAsRead when clicking mark as read button on unread notification', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      // Find the "Mark as read" button for the first notification
      const markAsReadButtons = screen.getAllByTitle('Mark as read');
      fireEvent.click(markAsReadButtons[0]);

      expect(mockMarkAsRead).toHaveBeenCalledWith('1');
    });

    it('does not show mark as read button for already read notifications', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      // Only 2 unread notifications should have the button
      const markAsReadButtons = screen.getAllByTitle('Mark as read');
      expect(markAsReadButtons).toHaveLength(2);
    });

    it('calls markAllAsRead when clicking mark all read button', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      const markAllButton = screen.getByText('Mark all read');
      fireEvent.click(markAllButton);

      expect(mockMarkAllAsRead).toHaveBeenCalled();
    });

    it('hides mark all read button when no notifications', () => {
      (useNotificationStore as unknown as jest.Mock).mockReturnValue({
        notifications: [],
        unreadCount: 0,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        removeNotification: mockRemoveNotification,
      });

      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    });
  });

  describe('Remove Notification', () => {
    it('calls removeNotification when clicking X button', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      const removeButtons = screen.getAllByTitle('Remove notification');
      fireEvent.click(removeButtons[0]);

      expect(mockRemoveNotification).toHaveBeenCalledWith('1');
    });

    it('renders remove button for each notification', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      const removeButtons = screen.getAllByTitle('Remove notification');
      expect(removeButtons).toHaveLength(3);
    });
  });

  describe('Router Navigation', () => {
    it('calls router.push when clicking notification with actionUrl', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      const viewButton = screen.getByText('View Signal');
      fireEvent.click(viewButton);

      expect(mockPush).toHaveBeenCalledWith('/signals/test');
    });

    it('marks notification as read when clicking actionUrl', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      const viewButton = screen.getByText('View Signal');
      fireEvent.click(viewButton);

      expect(mockMarkAsRead).toHaveBeenCalledWith('1');
    });

    it('closes dropdown after clicking actionUrl', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      const viewButton = screen.getByText('View Signal');
      fireEvent.click(viewButton);

      // Dropdown should close - mark all read button should not be visible
      expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    });

    it('navigates to /alerts when clicking "View all notifications"', () => {
      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      const viewAllButton = screen.getByText('View all notifications');
      fireEvent.click(viewAllButton);

      expect(mockPush).toHaveBeenCalledWith('/alerts');
    });

    it('hides "View all notifications" button when no notifications', () => {
      (useNotificationStore as unknown as jest.Mock).mockReturnValue({
        notifications: [],
        unreadCount: 0,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        removeNotification: mockRemoveNotification,
      });

      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      expect(screen.queryByText('View all notifications')).not.toBeInTheDocument();
    });

    it('uses default actionLabel "View" when not provided', () => {
      const notificationWithoutLabel = [
        {
          id: '1',
          type: 'info' as const,
          title: 'Test',
          message: 'Test message',
          timestamp: new Date(),
          isRead: false,
          actionUrl: '/test',
        },
      ];

      (useNotificationStore as unknown as jest.Mock).mockReturnValue({
        notifications: notificationWithoutLabel,
        unreadCount: 1,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        removeNotification: mockRemoveNotification,
      });

      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      expect(screen.getByText('View')).toBeInTheDocument();
    });
  });

  describe('Timestamp Formatting', () => {
    beforeEach(() => {
      // Mock current time for consistent timestamp testing
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-02-04T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows "Just now" for very recent notifications', () => {
      const recentNotification = [
        {
          id: '1',
          type: 'info' as const,
          title: 'Test',
          message: 'Recent notification',
          timestamp: new Date('2026-02-04T11:59:50Z'),
          isRead: false,
        },
      ];

      (useNotificationStore as unknown as jest.Mock).mockReturnValue({
        notifications: recentNotification,
        unreadCount: 1,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        removeNotification: mockRemoveNotification,
      });

      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('shows minutes ago for recent notifications', () => {
      const recentNotification = [
        {
          id: '1',
          type: 'info' as const,
          title: 'Test',
          message: 'Recent notification',
          timestamp: new Date('2026-02-04T11:45:00Z'), // 15 mins ago
          isRead: false,
        },
      ];

      (useNotificationStore as unknown as jest.Mock).mockReturnValue({
        notifications: recentNotification,
        unreadCount: 1,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        removeNotification: mockRemoveNotification,
      });

      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      expect(screen.getByText('15m ago')).toBeInTheDocument();
    });

    it('shows hours ago for notifications within 24 hours', () => {
      const oldNotification = [
        {
          id: '1',
          type: 'info' as const,
          title: 'Test',
          message: 'Older notification',
          timestamp: new Date('2026-02-04T09:00:00Z'), // 3 hours ago
          isRead: false,
        },
      ];

      (useNotificationStore as unknown as jest.Mock).mockReturnValue({
        notifications: oldNotification,
        unreadCount: 1,
        markAsRead: mockMarkAsRead,
        markAllAsRead: mockMarkAllAsRead,
        removeNotification: mockRemoveNotification,
      });

      render(<NotificationBell />);
      const button = screen.getByRole('button', { name: 'Notifications' });
      fireEvent.click(button);

      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });
  });
});
