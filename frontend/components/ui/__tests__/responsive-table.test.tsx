import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveTable, MobileCard, MobileCardRow } from '../responsive-table';

describe('ResponsiveTable', () => {
  it('renders children', () => {
    render(
      <ResponsiveTable>
        <table>
          <tbody>
            <tr>
              <td>Cell content</td>
            </tr>
          </tbody>
        </table>
      </ResponsiveTable>
    );
    expect(screen.getByText('Cell content')).toBeInTheDocument();
  });

  it('applies className', () => {
    const { container } = render(
      <ResponsiveTable className="extra-class">
        <div>Content</div>
      </ResponsiveTable>
    );
    expect(container.firstChild).toHaveClass('extra-class');
  });
});

describe('MobileCard', () => {
  it('renders children', () => {
    render(
      <MobileCard>
        <span>Card content</span>
      </MobileCard>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(
      <MobileCard onClick={handleClick}>
        <span>Clickable card</span>
      </MobileCard>
    );
    fireEvent.click(screen.getByText('Clickable card'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('has role="button" when onClick provided', () => {
    render(
      <MobileCard onClick={() => {}}>
        <span>Button card</span>
      </MobileCard>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has tabIndex when onClick provided', () => {
    render(
      <MobileCard onClick={() => {}}>
        <span>Focusable card</span>
      </MobileCard>
    );
    expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
  });

  it('has no role when onClick not provided', () => {
    render(
      <MobileCard>
        <span>Static card</span>
      </MobileCard>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('MobileCardRow', () => {
  it('renders label and value', () => {
    render(<MobileCardRow label="Price" value="$45.50" />);
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('$45.50')).toBeInTheDocument();
  });
});
