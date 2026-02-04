import { renderHook, act } from '@testing-library/react';
import { toast, dismiss, useToast } from '../use-toast';

describe('use-toast', () => {
  beforeEach(() => {
    // Clear any existing toasts by dismissing all
    const { result } = renderHook(() => useToast());
    result.current.toasts.forEach((t) => dismiss(t.id));
  });

  describe('toast function', () => {
    it('should add a toast message', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Test Toast', description: 'Test Description' });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Test Toast');
      expect(result.current.toasts[0].description).toBe('Test Description');
    });

    it('should return a unique id', () => {
      const id1 = toast({ title: 'Toast 1' });
      const id2 = toast({ title: 'Toast 2' });

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });

    it('should add multiple toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Toast 1' });
        toast({ title: 'Toast 2' });
        toast({ title: 'Toast 3' });
      });

      expect(result.current.toasts).toHaveLength(3);
    });
  });

  describe('dismiss function', () => {
    it('should remove a toast by id', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;
      act(() => {
        toastId = toast({ title: 'Test Toast' });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        dismiss(toastId);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should only remove the specified toast', () => {
      const { result } = renderHook(() => useToast());

      let toastId1: string;
      act(() => {
        toastId1 = toast({ title: 'Toast 1' });
        toast({ title: 'Toast 2' });
      });

      expect(result.current.toasts).toHaveLength(2);

      act(() => {
        dismiss(toastId1);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Toast 2');
    });

    it('should do nothing if id does not exist', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Test Toast' });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        dismiss('non-existent-id');
      });

      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('useToast hook', () => {
    it('should return toasts, toast function, and dismiss function', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toBeDefined();
      expect(Array.isArray(result.current.toasts)).toBe(true);
      expect(typeof result.current.toast).toBe('function');
      expect(typeof result.current.dismiss).toBe('function');
    });

    it('should update when toasts change', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toHaveLength(0);

      act(() => {
        result.current.toast({ title: 'New Toast' });
      });

      expect(result.current.toasts).toHaveLength(1);
    });

    it('should clean up listener on unmount', () => {
      const { result, unmount } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Test' });
      });

      expect(result.current.toasts).toHaveLength(1);

      unmount();

      // After unmount, adding new toasts should not cause issues
      act(() => {
        toast({ title: 'Another Toast' });
      });
    });
  });

  describe('toast without description', () => {
    it('should work without description', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Title Only' });
      });

      expect(result.current.toasts[0].title).toBe('Title Only');
      expect(result.current.toasts[0].description).toBeUndefined();
    });
  });
});
