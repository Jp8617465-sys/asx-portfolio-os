import { toast } from '@/components/ui/use-toast';
import { showToast, toastHelpers } from '../toast-helpers';

jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

const mockToast = toast as jest.MockedFunction<typeof toast>;

describe('showToast', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  it('success calls toast with correct title format', () => {
    showToast.success('Operation Complete');
    expect(mockToast).toHaveBeenCalledWith({
      title: '✓ Operation Complete',
      description: undefined,
    });
  });

  it('success passes description', () => {
    showToast.success('Saved', 'Your changes have been saved');
    expect(mockToast).toHaveBeenCalledWith({
      title: '✓ Saved',
      description: 'Your changes have been saved',
    });
  });

  it('error calls toast with correct title format', () => {
    showToast.error('Failed');
    expect(mockToast).toHaveBeenCalledWith({
      title: '✗ Failed',
      description: undefined,
    });
  });

  it('warning calls toast with correct title format', () => {
    showToast.warning('Caution');
    expect(mockToast).toHaveBeenCalledWith({
      title: '⚠ Caution',
      description: undefined,
    });
  });

  it('info calls toast with correct title format', () => {
    showToast.info('Notice');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'ℹ Notice',
      description: undefined,
    });
  });

  it('loading calls toast with correct title format', () => {
    showToast.loading('Processing');
    expect(mockToast).toHaveBeenCalledWith({
      title: '⏳ Processing',
      description: undefined,
    });
  });
});

describe('toastHelpers', () => {
  beforeEach(() => {
    mockToast.mockClear();
  });

  describe('apiError', () => {
    it('extracts message from error.response.data.message', () => {
      const error = { response: { data: { message: 'Not found' } } };
      toastHelpers.apiError(error);
      expect(mockToast).toHaveBeenCalledWith({
        title: '✗ Error',
        description: 'Not found',
      });
    });

    it('uses error.message as fallback', () => {
      const error = { message: 'Network failure' };
      toastHelpers.apiError(error);
      expect(mockToast).toHaveBeenCalledWith({
        title: '✗ Error',
        description: 'Network failure',
      });
    });

    it('uses default message when no error details', () => {
      toastHelpers.apiError({});
      expect(mockToast).toHaveBeenCalledWith({
        title: '✗ Error',
        description: 'An error occurred',
      });
    });

    it('uses custom default message', () => {
      toastHelpers.apiError({}, 'Something went wrong');
      expect(mockToast).toHaveBeenCalledWith({
        title: '✗ Error',
        description: 'Something went wrong',
      });
    });
  });

  describe('saveSuccess', () => {
    it('shows success toast with item name', () => {
      toastHelpers.saveSuccess('Settings');
      expect(mockToast).toHaveBeenCalledWith({
        title: '✓ Saved',
        description: 'Settings saved successfully',
      });
    });

    it('uses default "Changes" when no item name provided', () => {
      toastHelpers.saveSuccess();
      expect(mockToast).toHaveBeenCalledWith({
        title: '✓ Saved',
        description: 'Changes saved successfully',
      });
    });
  });

  describe('deleteSuccess', () => {
    it('shows success toast with item name', () => {
      toastHelpers.deleteSuccess('Portfolio');
      expect(mockToast).toHaveBeenCalledWith({
        title: '✓ Deleted',
        description: 'Portfolio deleted successfully',
      });
    });

    it('uses default "Item" when no item name provided', () => {
      toastHelpers.deleteSuccess();
      expect(mockToast).toHaveBeenCalledWith({
        title: '✓ Deleted',
        description: 'Item deleted successfully',
      });
    });
  });

  describe('addSuccess', () => {
    it('shows success toast with item name', () => {
      toastHelpers.addSuccess('Holding');
      expect(mockToast).toHaveBeenCalledWith({
        title: '✓ Added',
        description: 'Holding added successfully',
      });
    });

    it('uses default "Item" when no item name provided', () => {
      toastHelpers.addSuccess();
      expect(mockToast).toHaveBeenCalledWith({
        title: '✓ Added',
        description: 'Item added successfully',
      });
    });
  });

  describe('updateSuccess', () => {
    it('shows success toast with item name', () => {
      toastHelpers.updateSuccess('Alert');
      expect(mockToast).toHaveBeenCalledWith({
        title: '✓ Updated',
        description: 'Alert updated successfully',
      });
    });

    it('uses default "Item" when no item name provided', () => {
      toastHelpers.updateSuccess();
      expect(mockToast).toHaveBeenCalledWith({
        title: '✓ Updated',
        description: 'Item updated successfully',
      });
    });
  });

  describe('networkError', () => {
    it('shows network error toast', () => {
      toastHelpers.networkError();
      expect(mockToast).toHaveBeenCalledWith({
        title: '✗ Network Error',
        description: 'Please check your internet connection and try again',
      });
    });
  });

  describe('unauthorized', () => {
    it('shows unauthorized toast', () => {
      toastHelpers.unauthorized();
      expect(mockToast).toHaveBeenCalledWith({
        title: '✗ Unauthorized',
        description: 'Your session has expired. Please log in again.',
      });
    });
  });

  describe('validationError', () => {
    it('shows warning toast with validation message', () => {
      toastHelpers.validationError('Name is required');
      expect(mockToast).toHaveBeenCalledWith({
        title: '⚠ Validation Error',
        description: 'Name is required',
      });
    });
  });

  describe('copied', () => {
    it('shows copied toast', () => {
      toastHelpers.copied();
      expect(mockToast).toHaveBeenCalledWith({
        title: '✓ Copied',
        description: 'Copied to clipboard',
      });
    });
  });
});
