import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AssistantClient from '../AssistantClient';

// Mock API functions
jest.mock('@/lib/api', () => ({
  sendAssistantChat: jest.fn(),
}));

import { sendAssistantChat } from '@/lib/api';
const mockSendAssistantChat = sendAssistantChat as jest.MockedFunction<typeof sendAssistantChat>;

// Mock child components
jest.mock('../Topbar', () => {
  return function MockTopbar({ title, actions }: any) {
    return (
      <div data-testid="topbar">
        {title}
        {actions}
      </div>
    );
  };
});

jest.mock('../ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

jest.mock('../ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button data-testid="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock('../ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}));

jest.mock('../ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div data-testid="skeleton" className={className} />,
}));

describe('AssistantClient', () => {
  beforeEach(() => {
    mockSendAssistantChat.mockClear();
  });

  it('renders seed messages on initial load', () => {
    render(<AssistantClient />);

    expect(screen.getByText(/Ask me why Model A is favoring a sector/i)).toBeInTheDocument();
    expect(screen.getByText(/Summarize the top drivers of model performance/i)).toBeInTheDocument();
    expect(screen.getByText(/Momentum and liquidity remain dominant/i)).toBeInTheDocument();
  });

  it('renders input field', () => {
    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    expect(input).toBeInTheDocument();
  });

  it('renders Send button', () => {
    render(<AssistantClient />);

    const button = screen.getByText('Send');
    expect(button).toBeInTheDocument();
  });

  it('renders Topbar with correct title', () => {
    render(<AssistantClient />);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('renders Preview badge', () => {
    render(<AssistantClient />);

    const badges = screen.getAllByTestId('badge');
    const previewBadge = badges.find((badge) => badge.textContent === 'Preview');
    expect(previewBadge).toBeInTheDocument();
  });

  it('renders Phase 6 badge', () => {
    render(<AssistantClient />);

    const badges = screen.getAllByTestId('badge');
    const phaseBadge = badges.find((badge) => badge.textContent === 'Phase 6');
    expect(phaseBadge).toBeInTheDocument();
  });

  it('updates input value when user types', () => {
    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(
      /Ask about drift, signals, or explainability/i
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Hello AI' } });

    expect(input.value).toBe('Hello AI');
  });

  it('does not send message when input is empty', () => {
    render(<AssistantClient />);

    const button = screen.getByText('Send');
    fireEvent.click(button);

    expect(mockSendAssistantChat).not.toHaveBeenCalled();
  });

  it('does not send message when input is only whitespace', () => {
    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(button);

    expect(mockSendAssistantChat).not.toHaveBeenCalled();
  });

  it('sends message and displays response on success', async () => {
    mockSendAssistantChat.mockResolvedValueOnce({
      reply: 'Hello from AI',
    });

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(
      /Ask about drift, signals, or explainability/i
    ) as HTMLInputElement;
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Hello from AI')).toBeInTheDocument();
    });

    expect(mockSendAssistantChat).toHaveBeenCalledWith('Hello');
  });

  it('adds user message immediately when sent', async () => {
    mockSendAssistantChat.mockResolvedValueOnce({
      reply: 'Response',
    });

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test question' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Test question')).toBeInTheDocument();
    });
  });

  it('clears input after sending message', async () => {
    mockSendAssistantChat.mockResolvedValueOnce({
      reply: 'Response',
    });

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(
      /Ask about drift, signals, or explainability/i
    ) as HTMLInputElement;
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('displays Sending... text while request is in flight', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockSendAssistantChat.mockReturnValueOnce(promise);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });

    resolvePromise!({ reply: 'Done' });
  });

  it('disables send button while request is in flight', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockSendAssistantChat.mockReturnValueOnce(promise);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByTestId('button');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    resolvePromise!({ reply: 'Done' });
  });

  it('handles 503 error and displays specific message', async () => {
    const error = new Error('Service Unavailable');
    (error as any).status = 503;
    (error as any).body = JSON.stringify({ detail: 'Assistant paused' });
    mockSendAssistantChat.mockRejectedValueOnce(error);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      const messages = screen.getAllByText('Assistant paused');
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  it('handles 503 error without detail and displays default message', async () => {
    const error = new Error('Service Unavailable');
    (error as any).status = 503;
    (error as any).body = '';
    mockSendAssistantChat.mockRejectedValueOnce(error);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      const messages = screen.getAllByText(
        /Assistant paused. Set ENABLE_ASSISTANT=true to re-enable/i
      );
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  it('displays notice banner when assistant is paused', async () => {
    const error = new Error('Service Unavailable');
    (error as any).status = 503;
    (error as any).body = JSON.stringify({ detail: 'Assistant paused' });
    mockSendAssistantChat.mockRejectedValueOnce(error);

    const { container } = render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      const banners = container.querySelectorAll('.bg-amber-50');
      expect(banners.length).toBeGreaterThan(0);
    });
  });

  it('disables input when assistant is paused', async () => {
    const error = new Error('Service Unavailable');
    (error as any).status = 503;
    (error as any).body = JSON.stringify({ detail: 'Assistant paused' });
    mockSendAssistantChat.mockRejectedValueOnce(error);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(
      /Ask about drift, signals, or explainability/i
    ) as HTMLInputElement;
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(input).toBeDisabled();
    });
  });

  it('changes input placeholder when assistant is paused', async () => {
    const error = new Error('Service Unavailable');
    (error as any).status = 503;
    (error as any).body = JSON.stringify({ detail: 'Assistant paused' });
    mockSendAssistantChat.mockRejectedValueOnce(error);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(
      /Ask about drift, signals, or explainability/i
    ) as HTMLInputElement;
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(input.placeholder).toContain('Assistant paused');
    });
  });

  it('disables send button when assistant is paused', async () => {
    const error = new Error('Service Unavailable');
    (error as any).status = 503;
    (error as any).body = JSON.stringify({ detail: 'Assistant paused' });
    mockSendAssistantChat.mockRejectedValueOnce(error);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByTestId('button');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  it('handles network error and displays generic error message', async () => {
    const error = new Error('Network error');
    mockSendAssistantChat.mockRejectedValueOnce(error);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Unable to reach the assistant backend yet/i)).toBeInTheDocument();
    });
  });

  it('handles error without status code', async () => {
    const error = new Error('Connection failed');
    mockSendAssistantChat.mockRejectedValueOnce(error);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Unable to reach the assistant backend yet/i)).toBeInTheDocument();
    });
  });

  it('parses JSON error detail correctly', async () => {
    const error = new Error('Service Error');
    (error as any).status = 503;
    (error as any).body = JSON.stringify({ detail: 'Custom error message' });
    mockSendAssistantChat.mockRejectedValueOnce(error);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      const messages = screen.getAllByText('Custom error message');
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  it('handles non-JSON error body gracefully', async () => {
    const error = new Error('Service Error');
    (error as any).status = 503;
    (error as any).body = 'Plain text error';
    mockSendAssistantChat.mockRejectedValueOnce(error);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      const messages = screen.getAllByText('Plain text error');
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  it('detects assistant paused from error detail text', async () => {
    const error = new Error('Service Error');
    (error as any).status = 500;
    (error as any).body = JSON.stringify({ detail: 'The assistant paused for maintenance' });
    mockSendAssistantChat.mockRejectedValueOnce(error);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      const messages = screen.getAllByText('The assistant paused for maintenance');
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  it('displays No reply returned when reply is missing', async () => {
    mockSendAssistantChat.mockResolvedValueOnce({});

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('No reply returned.')).toBeInTheDocument();
    });
  });

  it('trims whitespace from user input before sending', async () => {
    mockSendAssistantChat.mockResolvedValueOnce({
      reply: 'Response',
    });

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: '  Test message  ' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSendAssistantChat).toHaveBeenCalledWith('Test message');
    });
  });

  it('displays multiple messages in conversation order', async () => {
    mockSendAssistantChat
      .mockResolvedValueOnce({ reply: 'First response' })
      .mockResolvedValueOnce({ reply: 'Second response' });

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'First question' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('First response')).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: 'Second question' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Second response')).toBeInTheDocument();
    });

    expect(screen.getByText('First question')).toBeInTheDocument();
    expect(screen.getByText('Second question')).toBeInTheDocument();
  });

  it('renders assistant messages with correct styling', () => {
    render(<AssistantClient />);

    const assistantMessages = screen.getAllByText(/Momentum and liquidity remain dominant/i);
    const messageDiv = assistantMessages[0].closest('div');
    expect(messageDiv).toHaveClass('bg-slate-100');
  });

  it('renders user messages with correct styling', async () => {
    mockSendAssistantChat.mockResolvedValueOnce({ reply: 'Response' });

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'User message' } });
    fireEvent.click(button);

    await waitFor(() => {
      const userMessage = screen.getByText('User message');
      const messageDiv = userMessage.closest('div');
      expect(messageDiv).toHaveClass('bg-ink/5');
    });
  });

  it('renders message role labels correctly', () => {
    render(<AssistantClient />);

    expect(screen.getAllByText('Assistant').length).toBeGreaterThan(0);
    expect(screen.getAllByText('You').length).toBeGreaterThan(0);
  });

  it('maintains message count after error', async () => {
    const error = new Error('Network error');
    mockSendAssistantChat.mockRejectedValueOnce(error);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    const initialMessageCount = screen.getAllByText(/Assistant|You/).length;

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Unable to reach the assistant backend yet/i)).toBeInTheDocument();
    });

    const finalMessageCount = screen.getAllByText(/Assistant|You/).length;
    // Should have added user message + error message
    expect(finalMessageCount).toBeGreaterThan(initialMessageCount);
  });

  it('handles error with message property instead of body', async () => {
    const error = new Error('Connection timeout');
    (error as any).status = undefined;
    mockSendAssistantChat.mockRejectedValueOnce(error);

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Unable to reach the assistant backend yet/i)).toBeInTheDocument();
    });
  });

  it('renders Conversation title', () => {
    render(<AssistantClient />);

    expect(screen.getByText('Conversation')).toBeInTheDocument();
  });

  it('does not display notice banner initially', () => {
    const { container } = render(<AssistantClient />);

    const banner = container.querySelector('.bg-amber-50');
    expect(banner).not.toBeInTheDocument();
  });

  it('re-enables send button after request completes', async () => {
    mockSendAssistantChat.mockResolvedValueOnce({ reply: 'Done' });

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(/Ask about drift, signals, or explainability/i);
    const button = screen.getByTestId('button');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('keeps input enabled after successful request', async () => {
    mockSendAssistantChat.mockResolvedValueOnce({ reply: 'Done' });

    render(<AssistantClient />);

    const input = screen.getByPlaceholderText(
      /Ask about drift, signals, or explainability/i
    ) as HTMLInputElement;
    const button = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    expect(input).not.toBeDisabled();
  });

  it('renders messages in scrollable container', () => {
    const { container } = render(<AssistantClient />);

    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeInTheDocument();
  });

  it('renders card with fixed height', () => {
    const { container } = render(<AssistantClient />);

    const cardContent = container.querySelector('.h-\\[420px\\]');
    expect(cardContent).toBeInTheDocument();
  });
});
