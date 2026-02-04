import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
} from '../toast';

describe('Toast Components', () => {
  describe('ToastProvider', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Test Child</div>
        </ToastProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  describe('ToastViewport', () => {
    it('should render with default classes', () => {
      render(
        <ToastProvider>
          <ToastViewport data-testid="viewport" />
        </ToastProvider>
      );

      const viewport = screen.getByTestId('viewport');
      expect(viewport).toBeInTheDocument();
      expect(viewport).toHaveClass('fixed');
      expect(viewport).toHaveClass('bottom-6');
      expect(viewport).toHaveClass('right-6');
    });

    it('should accept custom className', () => {
      render(
        <ToastProvider>
          <ToastViewport data-testid="viewport" className="custom-class" />
        </ToastProvider>
      );

      const viewport = screen.getByTestId('viewport');
      expect(viewport).toHaveClass('custom-class');
    });
  });

  describe('Toast', () => {
    it('should render toast content', () => {
      render(
        <ToastProvider>
          <Toast open data-testid="toast">
            <span>Toast Content</span>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast')).toBeInTheDocument();
      expect(screen.getByText('Toast Content')).toBeInTheDocument();
    });

    it('should apply default styling', () => {
      render(
        <ToastProvider>
          <Toast open data-testid="toast">
            Content
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      const toast = screen.getByTestId('toast');
      expect(toast).toHaveClass('rounded-2xl');
      expect(toast).toHaveClass('border');
    });

    it('should accept custom className', () => {
      render(
        <ToastProvider>
          <Toast open data-testid="toast" className="my-custom-toast">
            Content
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast')).toHaveClass('my-custom-toast');
    });
  });

  describe('ToastTitle', () => {
    it('should render title text', () => {
      render(
        <ToastProvider>
          <Toast open>
            <ToastTitle>My Title</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      expect(screen.getByText('My Title')).toBeInTheDocument();
    });

    it('should apply title styling', () => {
      render(
        <ToastProvider>
          <Toast open>
            <ToastTitle data-testid="title">My Title</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      const title = screen.getByTestId('title');
      expect(title).toHaveClass('text-sm');
      expect(title).toHaveClass('font-semibold');
    });

    it('should accept custom className', () => {
      render(
        <ToastProvider>
          <Toast open>
            <ToastTitle data-testid="title" className="custom-title">
              My Title
            </ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      expect(screen.getByTestId('title')).toHaveClass('custom-title');
    });
  });

  describe('ToastDescription', () => {
    it('should render description text', () => {
      render(
        <ToastProvider>
          <Toast open>
            <ToastDescription>My Description</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      expect(screen.getByText('My Description')).toBeInTheDocument();
    });

    it('should apply description styling', () => {
      render(
        <ToastProvider>
          <Toast open>
            <ToastDescription data-testid="desc">Description</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-xs');
    });

    it('should accept custom className', () => {
      render(
        <ToastProvider>
          <Toast open>
            <ToastDescription data-testid="desc" className="custom-desc">
              Description
            </ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      expect(screen.getByTestId('desc')).toHaveClass('custom-desc');
    });
  });

  describe('ToastClose', () => {
    it('should render close button', () => {
      render(
        <ToastProvider>
          <Toast open>
            <ToastClose>Close</ToastClose>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should apply close button styling', () => {
      render(
        <ToastProvider>
          <Toast open>
            <ToastClose data-testid="close">X</ToastClose>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      const closeBtn = screen.getByTestId('close');
      expect(closeBtn).toHaveClass('ml-auto');
      expect(closeBtn).toHaveClass('text-xs');
    });

    it('should accept custom className', () => {
      render(
        <ToastProvider>
          <Toast open>
            <ToastClose data-testid="close" className="custom-close">
              X
            </ToastClose>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      expect(screen.getByTestId('close')).toHaveClass('custom-close');
    });
  });

  describe('Full Toast Example', () => {
    it('should render complete toast with all parts', () => {
      render(
        <ToastProvider>
          <Toast open>
            <div className="flex flex-col gap-1">
              <ToastTitle>Success!</ToastTitle>
              <ToastDescription>Your action was completed.</ToastDescription>
            </div>
            <ToastClose>Dismiss</ToastClose>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Your action was completed.')).toBeInTheDocument();
      expect(screen.getByText('Dismiss')).toBeInTheDocument();
    });
  });
});
