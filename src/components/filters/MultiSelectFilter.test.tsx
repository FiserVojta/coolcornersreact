import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MultiSelectFilter } from './MultiSelectFilter';

const options = [
  { id: 1, label: 'Hiking' },
  { id: 2, label: 'Food' },
  { id: 3, label: 'Culture' }
];

const Harness = ({ initial = [] as number[] }) => {
  const [selected, setSelected] = useState<number[]>(initial);
  return (
    <MultiSelectFilter
      label="Categories"
      placeholder="Select categories"
      options={options}
      selectedIds={selected}
      onToggle={(id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
      countNoun={{ singular: 'category', plural: 'categories' }}
    />
  );
};

describe('MultiSelectFilter', () => {
  it('shows no chips when nothing is selected', () => {
    render(<Harness />);

    expect(screen.queryByRole('list', { name: 'Selected categories' })).not.toBeInTheDocument();
  });

  it('shows selected options as chips in option order', () => {
    render(<Harness initial={[3, 1]} />);

    const chips = within(screen.getByRole('list', { name: 'Selected categories' })).getAllByRole('listitem');
    expect(chips.map((chip) => chip.textContent?.replace('×', '').trim())).toEqual(['Hiking', 'Culture']);
  });

  it('adds a chip when an option is picked and removes it with its remove button', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: /select categories/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Food' }));

    expect(screen.getByRole('button', { name: 'Remove Food' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Food' }));

    expect(screen.queryByRole('button', { name: 'Remove Food' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Selected categories' })).not.toBeInTheDocument();
  });
});
