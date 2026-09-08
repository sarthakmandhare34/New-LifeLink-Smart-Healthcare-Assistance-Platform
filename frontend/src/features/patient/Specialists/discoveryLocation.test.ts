import { describe, expect, it } from 'vitest';
import { sortByBrowserLocation } from './discoveryLocation';

describe('browser location sorting', () => {
  it('orders entries deterministically by distance without mutating the source list', () => {
    const list = [
      { id: 'far', latitude: 19.2, longitude: 72.9 },
      { id: 'near', latitude: 19.01, longitude: 72.85 },
    ];
    const sorted = sortByBrowserLocation(list, { latitude: 19.0, longitude: 72.85 });
    expect(sorted.map((item) => item.id)).toEqual(['near', 'far']);
  });
});
