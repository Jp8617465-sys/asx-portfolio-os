import { render, screen } from '@testing-library/react';
import Footer from '../footer';

describe('Footer', () => {
  beforeEach(() => {
    render(<Footer />);
  });

  it('renders brand name', () => {
    expect(screen.getByText('ASX Portfolio OS')).toBeInTheDocument();
  });

  it('renders copyright with current year', () => {
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${year} ASX Portfolio OS`))).toBeInTheDocument();
  });

  it('renders product links', () => {
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Roadmap')).toBeInTheDocument();
  });

  it('renders company links', () => {
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('renders legal links', () => {
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByText('Terms')).toBeInTheDocument();
    expect(screen.getByText('Disclaimer')).toBeInTheDocument();
  });

  it('renders social links with correct aria-labels', () => {
    expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders the disclaimer text', () => {
    expect(screen.getByText(/Not financial advice/i)).toBeInTheDocument();
  });

  it('renders the tagline description', () => {
    expect(screen.getByText(/AI-powered portfolio management/i)).toBeInTheDocument();
  });
});
