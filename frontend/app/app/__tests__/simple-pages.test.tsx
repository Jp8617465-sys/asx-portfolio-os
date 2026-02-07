import { render } from '@testing-library/react';
import AssistantPage from '../assistant/page';
import InsightsPage from '../insights/page';
import JobsPage from '../jobs/page';
import ModelsPage from '../models/page';

// Mock PageTransition
jest.mock('../../../components/PageTransition', () => {
  return function MockPageTransition({ children }: any) {
    return <div data-testid="page-transition">{children}</div>;
  };
});

// Mock client components
jest.mock('../../../components/AssistantClient', () => {
  return function MockAssistantClient() {
    return <div data-testid="assistant-client">Assistant Client</div>;
  };
});

jest.mock('../../../components/InsightsClient', () => {
  return function MockInsightsClient() {
    return <div data-testid="insights-client">Insights Client</div>;
  };
});

jest.mock('../../../components/JobsClient', () => {
  return function MockJobsClient() {
    return <div data-testid="jobs-client">Jobs Client</div>;
  };
});

jest.mock('../../../components/ModelsClient', () => {
  return function MockModelsClient() {
    return <div data-testid="models-client">Models Client</div>;
  };
});

// ModelsPage imports ModelsClient from @/features/models, not @/components/ModelsClient
jest.mock('@/features/models', () => ({
  ModelsClient: function MockModelsClient() {
    return <div data-testid="models-client">Models Client</div>;
  },
}));

describe('Simple Page Components', () => {
  it('renders AssistantPage', () => {
    const { getByTestId } = render(<AssistantPage />);
    expect(getByTestId('page-transition')).toBeInTheDocument();
    expect(getByTestId('assistant-client')).toBeInTheDocument();
  });

  it('renders InsightsPage', () => {
    const { getByTestId } = render(<InsightsPage />);
    expect(getByTestId('page-transition')).toBeInTheDocument();
    expect(getByTestId('insights-client')).toBeInTheDocument();
  });

  it('renders JobsPage', () => {
    const { getByTestId } = render(<JobsPage />);
    expect(getByTestId('page-transition')).toBeInTheDocument();
    expect(getByTestId('jobs-client')).toBeInTheDocument();
  });

  it('renders ModelsPage', () => {
    const { getByTestId } = render(<ModelsPage />);
    expect(getByTestId('page-transition')).toBeInTheDocument();
    expect(getByTestId('models-client')).toBeInTheDocument();
  });
});
