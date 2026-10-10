import { useState, type ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MultiSelectFilter } from './MultiSelectFilter';
import { SingleSelectFilter } from './SingleSelectFilter';
import { SortSelect } from './SortSelect';

const MultiHarness = () => {
  const [selected, setSelected] = useState<number[]>([]);
  return (
    <MultiSelectFilter
      label="Categories"
      placeholder="Select categories"
      options={[
        { id: 1, label: 'Hiking' },
        { id: 2, label: 'Food' }
      ]}
      selectedIds={selected}
      onToggle={(id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
      countNoun={{ singular: 'category', plural: 'categories' }}
    />
  );
};

const cases: { name: string; ui: () => ReactElement; trigger: RegExp }[] = [
  { name: 'MultiSelectFilter', ui: () => <MultiHarness />, trigger: /select categories/i },
  {
    name: 'SingleSelectFilter',
    ui: () => (
      <SingleSelectFilter
        label="Created By"
        placeholder="Anyone"
        options={[{ value: '1', label: 'Ada' }]}
        value=""
        onChange={() => undefined}
      />
    ),
    trigger: /created by/i
  },
  {
    name: 'SortSelect',
    ui: () => <SortSelect value="new" options={[{ value: 'new', label: 'Newest' }]} onChange={() => undefined} />,
    trigger: /sort by/i
  }
];

describe.each(cases)('$name dropdown dismissal', ({ ui, trigger }) => {
  const renderWithOutside = () =>
    render(
      <div>
        {ui()}
        <p>Outside area</p>
      </div>
    );

  it('closes when clicking outside', () => {
    renderWithOutside();
    const button = screen.getByRole('button', { name: trigger });

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseDown(screen.getByText('Outside area'));
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape and returns focus to the trigger', () => {
    renderWithOutside();
    const button = screen.getByRole('button', { name: trigger });

    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveFocus();
  });

  it('stays open when clicking inside the dropdown', () => {
    renderWithOutside();
    const button = screen.getByRole('button', { name: trigger });

    fireEvent.click(button);
    fireEvent.mouseDown(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('MultiSelectFilter multi-pick', () => {
  it('stays open while picking several options, then closes on outside click', () => {
    render(
      <div>
        <MultiHarness />
        <p>Outside area</p>
      </div>
    );
    const button = screen.getByRole('button', { name: /select categories/i });

    fireEvent.click(button);
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Hiking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hiking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Food' }));
    expect(button).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseDown(screen.getByText('Outside area'));
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Remove Hiking' })).toBeInTheDocument();
  });
});
