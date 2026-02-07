import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  NoPortfolioState,
  NoWatchlistState,
  NoSearchResultsState,
  NoSignalsState,
  NoDataState,
  NoHoldingsState,
  UploadRequiredState,
  NoNotificationsState,
  NoReportsState,
} from '../empty-states';

describe('NoPortfolioState', () => {
  it('renders correct title text', () => {
    render(<NoPortfolioState />);
    expect(screen.getByText('No Portfolio Found')).toBeInTheDocument();
  });

  it('renders button and calls onAction on click', () => {
    const handleAction = jest.fn();
    render(<NoPortfolioState onAction={handleAction} />);
    fireEvent.click(screen.getByText('Upload Portfolio'));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

describe('NoWatchlistState', () => {
  it('renders correct title text', () => {
    render(<NoWatchlistState />);
    expect(screen.getByText('Your Watchlist is Empty')).toBeInTheDocument();
  });

  it('renders button and calls onAction on click', () => {
    const handleAction = jest.fn();
    render(<NoWatchlistState onAction={handleAction} />);
    fireEvent.click(screen.getByText('Search Stocks'));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

describe('NoSearchResultsState', () => {
  it('renders correct title text', () => {
    render(<NoSearchResultsState />);
    expect(screen.getByText('No Results Found')).toBeInTheDocument();
  });

  it('renders search term in description', () => {
    render(<NoSearchResultsState searchTerm="AAPL" />);
    expect(screen.getByText(/No stocks found matching "AAPL"/)).toBeInTheDocument();
  });

  it('renders default description when searchTerm not provided', () => {
    render(<NoSearchResultsState />);
    expect(screen.getByText('Try a different search term or filter.')).toBeInTheDocument();
  });
});

describe('NoSignalsState', () => {
  it('renders correct title text', () => {
    render(<NoSignalsState />);
    expect(screen.getByText('No Signals Available')).toBeInTheDocument();
  });

  it('renders button and calls onAction on click', () => {
    const handleAction = jest.fn();
    render(<NoSignalsState onAction={handleAction} />);
    fireEvent.click(screen.getByText('Browse Stocks'));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

describe('NoDataState', () => {
  it('uses default title when not provided', () => {
    render(<NoDataState />);
    expect(screen.getByText('No Data Available')).toBeInTheDocument();
  });

  it('uses default description when not provided', () => {
    render(<NoDataState />);
    expect(screen.getByText('There is no data to display at this time.')).toBeInTheDocument();
  });

  it('uses custom title when provided', () => {
    render(<NoDataState title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  it('uses custom description when provided', () => {
    render(<NoDataState description="Custom description text" />);
    expect(screen.getByText('Custom description text')).toBeInTheDocument();
  });
});

describe('NoHoldingsState', () => {
  it('renders correct title text', () => {
    render(<NoHoldingsState />);
    expect(screen.getByText('No Holdings Found')).toBeInTheDocument();
  });
});

describe('UploadRequiredState', () => {
  it('renders correct title text', () => {
    render(<UploadRequiredState />);
    expect(screen.getByText('Upload Required')).toBeInTheDocument();
  });

  it('renders button and calls onAction on click', () => {
    const handleAction = jest.fn();
    render(<UploadRequiredState onAction={handleAction} />);
    fireEvent.click(screen.getByText('Upload Now'));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});

describe('NoNotificationsState', () => {
  it('renders correct title text', () => {
    render(<NoNotificationsState />);
    expect(screen.getByText('No Notifications')).toBeInTheDocument();
  });
});

describe('NoReportsState', () => {
  it('renders correct title text', () => {
    render(<NoReportsState />);
    expect(screen.getByText('No Reports Available')).toBeInTheDocument();
  });

  it('renders button and calls onAction on click', () => {
    const handleAction = jest.fn();
    render(<NoReportsState onAction={handleAction} />);
    fireEvent.click(screen.getByText('Generate Report'));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });
});
