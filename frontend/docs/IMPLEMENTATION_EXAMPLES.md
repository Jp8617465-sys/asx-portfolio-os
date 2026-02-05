# Implementation Examples

This document provides practical examples of implementing the new UI improvements in your components.

## Example 1: Complete Page with Error Handling and Loading States

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import {
  DashboardSkeleton,
  ErrorAlert,
  NoDataState,
  Button,
  ResponsiveTable,
} from '@/components/ui';
import { toastHelpers } from '@/lib/toast-helpers';
import Header from '@/components/header';
import Footer from '@/components/footer';

export default function ExamplePage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getData();
      setData(response.data);
      toastHelpers.info('Data loaded successfully');
    } catch (err) {
      setError(err);
      toastHelpers.apiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <DashboardSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <ErrorAlert title="Failed to Load Data" message={error.message} onRetry={loadData} />
        </main>
        <Footer />
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Header />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <NoDataState
            title="No Data Available"
            description="Get started by adding your first item."
          />
        </main>
        <Footer />
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Example Page</h1>
          <Button onClick={loadData} variant="outline">
            Refresh
          </Button>
        </div>

        <ResponsiveTable>
          <table className="w-full">{/* Table content */}</table>
        </ResponsiveTable>
      </main>
      <Footer />
    </div>
  );
}
```

## Example 2: Using useApiCall Hook

```tsx
'use client';

import { useEffect } from 'react';
import { useApiCall } from '@/lib/hooks/useApiCall';
import { api } from '@/lib/api-client';
import { PortfolioSkeleton, ErrorAlert, NoPortfolioState, Button } from '@/components/ui';

export default function PortfolioExample() {
  const {
    data: portfolio,
    isLoading,
    error,
    execute: loadPortfolio,
    retry,
  } = useApiCall(api.getPortfolio, {
    showSuccessToast: false,
    showErrorToast: true,
    retryCount: 3,
  });

  useEffect(() => {
    loadPortfolio();
  }, []);

  if (isLoading) {
    return <PortfolioSkeleton />;
  }

  if (error) {
    return (
      <ErrorAlert
        title="Failed to Load Portfolio"
        message="Unable to fetch your portfolio data"
        onRetry={retry}
      />
    );
  }

  if (!portfolio) {
    return (
      <NoPortfolioState
        onAction={() => {
          /* Show upload modal */
        }}
      />
    );
  }

  return (
    <div>
      <h1>Portfolio</h1>
      {/* Render portfolio */}
    </div>
  );
}
```

## Example 3: Form with Toast Notifications

```tsx
'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import { showToast, toastHelpers } from '@/lib/toast-helpers';
import { api } from '@/lib/api-client';

export default function FormExample() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email) {
      toastHelpers.validationError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      await api.saveData(formData);
      toastHelpers.saveSuccess('Settings');
      setFormData({ name: '', email: '' });
    } catch (error) {
      toastHelpers.apiError(error, 'Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />

      <Button type="submit" isLoading={isSubmitting} fullWidth>
        Save Settings
      </Button>
    </form>
  );
}
```

## Example 4: Table with Empty State

```tsx
'use client';

import {
  ResponsiveTable,
  MobileCard,
  MobileCardRow,
  NoSearchResultsState,
  TableSkeleton,
} from '@/components/ui';
import { SignalBadge } from '@/features/signals';

export default function TableExample({ data, isLoading, searchTerm }) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <TableSkeleton rows={8} columns={5} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <NoSearchResultsState searchTerm={searchTerm} />;
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <ResponsiveTable>
          <table className="w-full">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Signal</th>
                <th>Confidence</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.ticker}</td>
                  <td>
                    <SignalBadge signal={item.signal} />
                  </td>
                  <td>{item.confidence}%</td>
                  <td>${item.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden space-y-4">
        {data.map((item) => (
          <MobileCard key={item.id}>
            <MobileCardRow label="Ticker" value={item.ticker} />
            <MobileCardRow label="Signal" value={<SignalBadge signal={item.signal} />} />
            <MobileCardRow label="Confidence" value={`${item.confidence}%`} />
            <MobileCardRow label="Price" value={`$${item.price}`} />
          </MobileCard>
        ))}
      </div>
    </>
  );
}
```

## Example 5: Accessible Interactive Component

```tsx
'use client';

import { useState } from 'react';
import {
  handleKeyboardActivation,
  getSignalAriaLabel,
  announceToScreenReader,
} from '@/lib/utils/accessibility';
import { SignalBadge } from '@/features/signals';

export default function AccessibleStockCard({ stock }) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    announceToScreenReader(isFavorite ? 'Removed from favorites' : 'Added to favorites', 'polite');
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg border p-4"
      role="article"
      aria-label={`Stock information for ${stock.ticker}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{stock.ticker}</h3>

        <button
          onClick={handleToggleFavorite}
          onKeyDown={(e) => handleKeyboardActivation(e, handleToggleFavorite)}
          className="focus-ring p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={isFavorite}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>

      <div className="mt-2" aria-label={getSignalAriaLabel(stock.signal, stock.confidence)}>
        <SignalBadge signal={stock.signal} confidence={stock.confidence} />
      </div>

      <div className="mt-2 text-2xl font-bold" aria-label={`Price: ${stock.price} dollars`}>
        ${stock.price}
      </div>
    </div>
  );
}
```

## Example 6: Page with Animations

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, Button } from '@/components/ui';

export default function AnimatedPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // Load items
    const loadedItems = [
      /* ... */
    ];
    setItems(loadedItems);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with fade in */}
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      {/* Cards with stagger animation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, index) => (
          <Card key={item.id} className="stagger-item hover-lift">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </Card>
        ))}
      </div>

      {/* Button with press effect */}
      <Button className="btn-press hover-glow">Take Action</Button>
    </div>
  );
}
```

## Example 7: Error Boundary Usage

```tsx
'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import DashboardContent from './DashboardContent';

export default function DashboardPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Dashboard Error</h2>
          <p>Unable to load the dashboard. Please refresh the page.</p>
        </div>
      }
    >
      <DashboardContent />
    </ErrorBoundary>
  );
}
```

## Example 8: Complete CRUD Component

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button, ErrorAlert, TableSkeleton, NoDataState, ResponsiveTable } from '@/components/ui';
import { showToast, toastHelpers } from '@/lib/toast-helpers';
import { api } from '@/lib/api-client';
import { Trash2, Edit, Plus } from 'lucide-react';

export default function CRUDExample() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadItems = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getItems();
      setItems(response.data);
    } catch (err) {
      setError(err);
      toastHelpers.apiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await api.deleteItem(id);
      setItems(items.filter((item) => item.id !== id));
      toastHelpers.deleteSuccess('Item');
    } catch (error) {
      toastHelpers.apiError(error);
    }
  };

  const handleAdd = async () => {
    try {
      const response = await api.createItem({ name: 'New Item' });
      setItems([...items, response.data]);
      toastHelpers.addSuccess('Item');
    } catch (error) {
      toastHelpers.apiError(error);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <TableSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error.message} onRetry={loadItems} />;
  }

  if (items.length === 0) {
    return (
      <NoDataState
        title="No Items Found"
        description="Get started by creating your first item."
        action={{
          label: 'Create Item',
          onClick: handleAdd,
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Items</h2>
        <Button onClick={handleAdd} variant="default">
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <ResponsiveTable>
        <table className="w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="animate-fade-in">
                <td>{item.name}</td>
                <td>{new Date(item.created).toLocaleDateString()}</td>
                <td>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTable>
    </div>
  );
}
```

## Common Patterns

### Pattern: Conditional Rendering with States

```tsx
{
  isLoading && <Skeleton />;
}
{
  error && <ErrorAlert message={error.message} onRetry={refetch} />;
}
{
  !data && !isLoading && !error && <EmptyState />;
}
{
  data && <Content data={data} />;
}
```

### Pattern: Button with Loading State

```tsx
<Button onClick={handleAction} isLoading={isSubmitting} disabled={!isValid}>
  Submit
</Button>
```

### Pattern: Toast on Action

```tsx
const handleAction = async () => {
  try {
    await api.performAction();
    toastHelpers.saveSuccess('Action');
  } catch (error) {
    toastHelpers.apiError(error);
  }
};
```

### Pattern: Responsive Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{/* Content */}</div>
```

---

**Note**: All examples use TypeScript and assume you have the necessary imports configured.
