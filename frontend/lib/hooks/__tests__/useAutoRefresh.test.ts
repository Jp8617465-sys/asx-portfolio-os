import { renderHook, act } from '@testing-library/react';
import { useAutoRefresh } from '../useAutoRefresh';

describe('useAutoRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onRefresh at specified interval when enabled', () => {
    const onRefresh = jest.fn();

    renderHook(() =>
      useAutoRefresh({
        onRefresh,
        intervalMs: 1000,
        enabled: true,
      })
    );

    expect(onRefresh).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(2);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(3);
  });

  it('does not call onRefresh when disabled', () => {
    const onRefresh = jest.fn();

    renderHook(() =>
      useAutoRefresh({
        onRefresh,
        intervalMs: 1000,
        enabled: false,
      })
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('defaults enabled to true', () => {
    const onRefresh = jest.fn();

    renderHook(() =>
      useAutoRefresh({
        onRefresh,
        intervalMs: 1000,
      })
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('clears interval on unmount', () => {
    const onRefresh = jest.fn();

    const { unmount } = renderHook(() =>
      useAutoRefresh({
        onRefresh,
        intervalMs: 1000,
        enabled: true,
      })
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('updates callback when onRefresh changes', () => {
    const onRefresh1 = jest.fn();
    const onRefresh2 = jest.fn();

    const { rerender } = renderHook(
      ({ onRefresh }) =>
        useAutoRefresh({
          onRefresh,
          intervalMs: 1000,
          enabled: true,
        }),
      { initialProps: { onRefresh: onRefresh1 } }
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onRefresh1).toHaveBeenCalledTimes(1);
    expect(onRefresh2).not.toHaveBeenCalled();

    rerender({ onRefresh: onRefresh2 });

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onRefresh1).toHaveBeenCalledTimes(1);
    expect(onRefresh2).toHaveBeenCalledTimes(1);
  });

  it('restarts interval when intervalMs changes', () => {
    const onRefresh = jest.fn();

    const { rerender } = renderHook(
      ({ intervalMs }) =>
        useAutoRefresh({
          onRefresh,
          intervalMs,
          enabled: true,
        }),
      { initialProps: { intervalMs: 1000 } }
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    rerender({ intervalMs: 500 });

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onRefresh).toHaveBeenCalledTimes(2);

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(onRefresh).toHaveBeenCalledTimes(3);
  });

  it('stops interval when enabled becomes false', () => {
    const onRefresh = jest.fn();

    const { rerender } = renderHook(
      ({ enabled }) =>
        useAutoRefresh({
          onRefresh,
          intervalMs: 1000,
          enabled,
        }),
      { initialProps: { enabled: true } }
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('starts interval when enabled becomes true', () => {
    const onRefresh = jest.fn();

    const { rerender } = renderHook(
      ({ enabled }) =>
        useAutoRefresh({
          onRefresh,
          intervalMs: 1000,
          enabled,
        }),
      { initialProps: { enabled: false } }
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onRefresh).not.toHaveBeenCalled();

    rerender({ enabled: true });

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('handles async onRefresh callback', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useAutoRefresh({
        onRefresh,
        intervalMs: 1000,
        enabled: true,
      })
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
