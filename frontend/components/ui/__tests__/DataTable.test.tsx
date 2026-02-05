import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, Column, SignalBadge } from '../DataTable';

interface TestData {
  id: number;
  name: string;
  value: number;
  status: string;
}

describe('DataTable', () => {
  const testData: TestData[] = [
    { id: 1, name: 'Apple', value: 150, status: 'active' },
    { id: 2, name: 'Banana', value: 50, status: 'inactive' },
    { id: 3, name: 'Cherry', value: 100, status: 'active' },
  ];

  const columns: Column<TestData>[] = [
    { key: 'name', header: 'Name' },
    { key: 'value', header: 'Value', sortable: true },
    { key: 'status', header: 'Status' },
  ];

  const keyExtractor = (item: TestData) => item.id;

  it('renders table with headers', () => {
    render(<DataTable columns={columns} data={testData} keyExtractor={keyExtractor} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Value')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders table data', () => {
    render(<DataTable columns={columns} data={testData} keyExtractor={keyExtractor} />);

    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    render(<DataTable columns={columns} data={[]} keyExtractor={keyExtractor} />);

    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  describe('sorting', () => {
    it('shows sort indicator on sortable columns', () => {
      render(<DataTable columns={columns} data={testData} keyExtractor={keyExtractor} />);

      // Value column is sortable, should have indicator
      const valueHeader = screen.getByText('Value').closest('th');
      expect(valueHeader).toHaveTextContent('↕');
    });

    it('sorts ascending on first click', () => {
      render(<DataTable columns={columns} data={testData} keyExtractor={keyExtractor} />);

      const valueHeader = screen.getByText('Value').closest('th')!;
      fireEvent.click(valueHeader);

      // Check ascending sort indicator
      expect(valueHeader).toHaveTextContent('↑');

      // Check data order (Banana 50, Cherry 100, Apple 150)
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Banana');
      expect(rows[2]).toHaveTextContent('Cherry');
      expect(rows[3]).toHaveTextContent('Apple');
    });

    it('sorts descending on second click', () => {
      render(<DataTable columns={columns} data={testData} keyExtractor={keyExtractor} />);

      const valueHeader = screen.getByText('Value').closest('th')!;
      fireEvent.click(valueHeader); // asc
      fireEvent.click(valueHeader); // desc

      // Check descending sort indicator
      expect(valueHeader).toHaveTextContent('↓');

      // Check data order (Apple 150, Cherry 100, Banana 50)
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Apple');
      expect(rows[2]).toHaveTextContent('Cherry');
      expect(rows[3]).toHaveTextContent('Banana');
    });

    it('removes sort on third click', () => {
      render(<DataTable columns={columns} data={testData} keyExtractor={keyExtractor} />);

      const valueHeader = screen.getByText('Value').closest('th')!;
      fireEvent.click(valueHeader); // asc
      fireEvent.click(valueHeader); // desc
      fireEvent.click(valueHeader); // null

      // Back to unsorted indicator
      expect(valueHeader).toHaveTextContent('↕');
    });

    it('does not sort non-sortable columns', () => {
      render(<DataTable columns={columns} data={testData} keyExtractor={keyExtractor} />);

      const nameHeader = screen.getByText('Name').closest('th')!;
      fireEvent.click(nameHeader);

      // Should not change data order
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Apple');
    });

    it('switches sort column when clicking different column', () => {
      const multiSortColumns: Column<TestData>[] = [
        { key: 'name', header: 'Name', sortable: true },
        { key: 'value', header: 'Value', sortable: true },
      ];

      render(<DataTable columns={multiSortColumns} data={testData} keyExtractor={keyExtractor} />);

      const nameHeader = screen.getByText('Name').closest('th')!;
      const valueHeader = screen.getByText('Value').closest('th')!;

      fireEvent.click(nameHeader);
      expect(nameHeader).toHaveTextContent('↑');

      fireEvent.click(valueHeader);
      expect(valueHeader).toHaveTextContent('↑');
      expect(nameHeader).toHaveTextContent('↕');
    });
  });

  describe('row click', () => {
    it('calls onRowClick when row is clicked', () => {
      const handleRowClick = jest.fn();
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          onRowClick={handleRowClick}
        />
      );

      const appleRow = screen.getByText('Apple').closest('tr')!;
      fireEvent.click(appleRow);

      expect(handleRowClick).toHaveBeenCalledWith(testData[0]);
    });

    it('applies hover styling when onRowClick is provided', () => {
      const handleRowClick = jest.fn();
      render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          onRowClick={handleRowClick}
        />
      );

      const row = screen.getByText('Apple').closest('tr');
      expect(row).toHaveClass('cursor-pointer');
    });
  });

  describe('custom render', () => {
    it('uses custom render function when provided', () => {
      const columnsWithRender: Column<TestData>[] = [
        { key: 'name', header: 'Name', render: (item) => <strong>{item.name}</strong> },
      ];

      render(<DataTable columns={columnsWithRender} data={testData} keyExtractor={keyExtractor} />);

      const strongElements = screen.getAllByText('Apple');
      expect(strongElements.some((el) => el.tagName === 'STRONG')).toBe(true);
    });
  });

  describe('styling options', () => {
    it('applies sticky header class when stickyHeader is true', () => {
      const { container } = render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          stickyHeader={true}
        />
      );

      const thead = container.querySelector('thead');
      expect(thead).toHaveClass('sticky');
    });

    it('applies striped styling when striped is true', () => {
      const { container } = render(
        <DataTable columns={columns} data={testData} keyExtractor={keyExtractor} striped={true} />
      );

      // Even rows (0-indexed: 1, 3, etc.) should have striped class
      const rows = container.querySelectorAll('tbody tr');
      expect(rows[1]).toHaveClass('bg-gray-50/50');
    });

    it('applies custom className', () => {
      const { container } = render(
        <DataTable
          columns={columns}
          data={testData}
          keyExtractor={keyExtractor}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('column alignment', () => {
    it('aligns columns correctly', () => {
      const alignedColumns: Column<TestData>[] = [
        { key: 'name', header: 'Name', align: 'left' },
        { key: 'value', header: 'Value', align: 'center' },
        { key: 'status', header: 'Status', align: 'right' },
      ];

      const { container } = render(
        <DataTable columns={alignedColumns} data={testData} keyExtractor={keyExtractor} />
      );

      const headers = container.querySelectorAll('th');
      expect(headers[0]).toHaveClass('text-left');
      expect(headers[1]).toHaveClass('text-center');
      expect(headers[2]).toHaveClass('text-right');
    });
  });

  describe('column className', () => {
    it('applies column className to header and cells', () => {
      const columnsWithClass: Column<TestData>[] = [
        { key: 'name', header: 'Name', className: 'custom-column' },
      ];

      const { container } = render(
        <DataTable columns={columnsWithClass} data={testData} keyExtractor={keyExtractor} />
      );

      const header = container.querySelector('th');
      expect(header).toHaveClass('custom-column');

      const cell = container.querySelector('td');
      expect(cell).toHaveClass('custom-column');
    });
  });
});

describe('SignalBadge', () => {
  it('renders STRONG_BUY with default variant', () => {
    render(<SignalBadge signal="STRONG_BUY" />);
    expect(screen.getByText('STRONG BUY')).toBeInTheDocument();
  });

  it('renders BUY with default variant', () => {
    render(<SignalBadge signal="BUY" />);
    expect(screen.getByText('BUY')).toBeInTheDocument();
  });

  it('renders HOLD with secondary variant', () => {
    render(<SignalBadge signal="HOLD" />);
    expect(screen.getByText('HOLD')).toBeInTheDocument();
  });

  it('renders SELL with outline variant', () => {
    render(<SignalBadge signal="SELL" />);
    expect(screen.getByText('SELL')).toBeInTheDocument();
  });

  it('renders STRONG_SELL with outline variant', () => {
    render(<SignalBadge signal="STRONG_SELL" />);
    expect(screen.getByText('STRONG SELL')).toBeInTheDocument();
  });

  it('renders unknown signal with secondary variant', () => {
    render(<SignalBadge signal="UNKNOWN" />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });
});
