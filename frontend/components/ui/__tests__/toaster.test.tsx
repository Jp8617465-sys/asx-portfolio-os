import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Toaster from '../toaster';
import { toast, dismiss } from '../use-toast';

describe('Toaster', () => {
  it('should render without crashing', () => {
    render(<Toaster />);
    // Toaster should render the viewport
    expect(document.body).toBeInTheDocument();
  });

  it('should render toast when added', async () => {
    const { unmount } = render(<Toaster />);

    let toastId: string;
    await act(async () => {
      toastId = toast({ title: 'Test Toast', description: 'Test Description' });
    });

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();

    // Cleanup toast before unmount to avoid state updates on unmounted component
    await act(async () => {
      dismiss(toastId);
    });
    unmount();
  });

  it('should render toast without description', async () => {
    const { unmount } = render(<Toaster />);

    let toastId: string;
    await act(async () => {
      toastId = toast({ title: 'Title Only' });
    });

    expect(screen.getByText('Title Only')).toBeInTheDocument();

    await act(async () => {
      dismiss(toastId);
    });
    unmount();
  });

  it('should render multiple toasts', async () => {
    const { unmount } = render(<Toaster />);

    const toastIds: string[] = [];
    await act(async () => {
      toastIds.push(toast({ title: 'Toast 1' }));
      toastIds.push(toast({ title: 'Toast 2' }));
      toastIds.push(toast({ title: 'Toast 3' }));
    });

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();

    await act(async () => {
      toastIds.forEach((id) => dismiss(id));
    });
    unmount();
  });

  it('should render close button for each toast', async () => {
    const { unmount } = render(<Toaster />);

    let toastId: string;
    await act(async () => {
      toastId = toast({ title: 'Test Toast' });
    });

    expect(screen.getByText('Close')).toBeInTheDocument();

    await act(async () => {
      dismiss(toastId);
    });
    unmount();
  });

  it('should remove toast when dismissed', async () => {
    const { unmount } = render(<Toaster />);

    let toastId: string;
    await act(async () => {
      toastId = toast({ title: 'Dismissable Toast' });
    });

    expect(screen.getByText('Dismissable Toast')).toBeInTheDocument();

    await act(async () => {
      dismiss(toastId);
    });

    expect(screen.queryByText('Dismissable Toast')).not.toBeInTheDocument();

    unmount();
  });

  it('should handle toast with special characters', async () => {
    const { unmount } = render(<Toaster />);

    let toastId: string;
    await act(async () => {
      toastId = toast({
        title: 'Special & Characters <Test>',
        description: 'Description with "quotes"',
      });
    });

    expect(screen.getByText('Special & Characters <Test>')).toBeInTheDocument();
    expect(screen.getByText('Description with "quotes"')).toBeInTheDocument();

    await act(async () => {
      dismiss(toastId);
    });
    unmount();
  });

  it('should handle rapid toast additions', async () => {
    const { unmount } = render(<Toaster />);

    const toastIds: string[] = [];
    await act(async () => {
      for (let i = 0; i < 5; i++) {
        toastIds.push(toast({ title: `Rapid Toast ${i}` }));
      }
    });

    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`Rapid Toast ${i}`)).toBeInTheDocument();
    }

    await act(async () => {
      toastIds.forEach((id) => dismiss(id));
    });
    unmount();
  });
});
