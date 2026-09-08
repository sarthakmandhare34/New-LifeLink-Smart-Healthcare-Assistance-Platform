export type BrowserLocation = {
  latitude: number;
  longitude: number;
};

type MappableDirectoryEntry = {
  latitude: number;
  longitude: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

/** Orders only already-visible controlled entries. Browser coordinates never leave the browser. */
export function sortByBrowserLocation<T extends MappableDirectoryEntry>(entries: readonly T[], location: BrowserLocation) {
  const distanceSquared = (entry: T) => {
    const latitude = toRadians(entry.latitude - location.latitude);
    const longitude = toRadians(entry.longitude - location.longitude) * Math.cos(toRadians(location.latitude));
    return latitude ** 2 + longitude ** 2;
  };

  return [...entries].sort((left, right) => distanceSquared(left) - distanceSquared(right));
}
