import type { CotravelCreateRequest } from '../types/cotravel';
import type { GooglePlaceInput } from '../types/trip';
import type { TravelDetail } from '../types/travel';

/** `datetime-local`-style value for today at 09:00, used when the travel has no start date. */
const todayAtNine = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T09:00`;
};

/**
 * Build a ready-to-submit co-travel request from a travel: its story becomes the description,
 * its start date the plan start, its tags carry over, and each visited place becomes a stop in
 * the first segment so the itinerary is preserved. Capacity defaults to 4; `categoryId` should
 * be a real COTRAVEL category id (the creator can refine everything afterwards).
 */
export const buildCotravelRequest = (travel: TravelDetail, categoryId: number): CotravelCreateRequest => {
  const googlePlaces: GooglePlaceInput[] = (travel.places ?? [])
    .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
    .map((place, index) => ({
      placeId: `travel-${travel.id}-place-${index + 1}`,
      name: place.name ?? `Stop ${index + 1}`,
      geometry: { type: 'Point', coordinates: [place.longitude, place.latitude] },
      categoryId: null
    }));

  const description =
    [travel.title, travel.description].filter((part) => part && part.trim().length > 0).join('\n\n') ||
    travel.title;

  return {
    description,
    capacity: 4,
    startTime: travel.startDate ? `${travel.startDate}T09:00` : todayAtNine(),
    wanderers: [],
    tags: travel.tags?.map((tag) => tag.id) ?? [],
    category: categoryId,
    wanderParts: googlePlaces.length
      ? [{ name: travel.title, places: [], trips: [], googlePlaces, order: 1 }]
      : [],
    googlePlaces: []
  };
};
