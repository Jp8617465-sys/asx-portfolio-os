/**
 * Toast notification helper utilities
 * Provides convenient functions for showing success, error, warning, and info toasts
 */

import { toast } from '@/components/ui/use-toast';

export const showToast = {
  success: (title: string, description?: string) => {
    toast({
      title: `✓ ${title}`,
      description,
    });
  },

  error: (title: string, description?: string) => {
    toast({
      title: `✗ ${title}`,
      description,
    });
  },

  warning: (title: string, description?: string) => {
    toast({
      title: `⚠ ${title}`,
      description,
    });
  },

  info: (title: string, description?: string) => {
    toast({
      title: `ℹ ${title}`,
      description,
    });
  },

  loading: (title: string, description?: string) => {
    toast({
      title: `⏳ ${title}`,
      description,
    });
  },
};

// Specific use-case helpers
export const toastHelpers = {
  apiError: (error: any, defaultMessage = 'An error occurred') => {
    const message = error?.response?.data?.message || error?.message || defaultMessage;
    showToast.error('Error', message);
  },

  saveSuccess: (itemName: string = 'Changes') => {
    showToast.success('Saved', `${itemName} saved successfully`);
  },

  deleteSuccess: (itemName: string = 'Item') => {
    showToast.success('Deleted', `${itemName} deleted successfully`);
  },

  addSuccess: (itemName: string = 'Item') => {
    showToast.success('Added', `${itemName} added successfully`);
  },

  updateSuccess: (itemName: string = 'Item') => {
    showToast.success('Updated', `${itemName} updated successfully`);
  },

  networkError: () => {
    showToast.error('Network Error', 'Please check your internet connection and try again');
  },

  unauthorized: () => {
    showToast.error('Unauthorized', 'Your session has expired. Please log in again.');
  },

  validationError: (message: string) => {
    showToast.warning('Validation Error', message);
  },

  copied: () => {
    showToast.success('Copied', 'Copied to clipboard');
  },
};
