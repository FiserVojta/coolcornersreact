import { describe, expect, it } from 'vitest';
import { pickCotravelCategoryId } from './cotravelFromTravel';
import type { Category } from '../types/place';

const category = (id: number, name: string, title = name): Category => ({ id, name, title, main: true });

const cotravelCategories = [
  category(40, 'Citybreak', 'City break'),
  category(41, 'Beach', 'Beach & islands'),
  category(42, 'Mountains', 'Mountains & snow')
];

describe('pickCotravelCategoryId', () => {
  it('picks the cotravel category with the same internal name as the travel category', () => {
    expect(pickCotravelCategoryId(category(7, 'Beach', 'Beach & islands'), cotravelCategories)).toBe(41);
  });

  it('returns null when the travel has no category', () => {
    expect(pickCotravelCategoryId(null, cotravelCategories)).toBeNull();
    expect(pickCotravelCategoryId(undefined, cotravelCategories)).toBeNull();
  });

  it('returns null rather than guessing when no cotravel category matches', () => {
    expect(pickCotravelCategoryId(category(8, 'Roadtrip', 'Road trip'), cotravelCategories)).toBeNull();
    expect(pickCotravelCategoryId(category(7, 'Beach'), [])).toBeNull();
  });
});
