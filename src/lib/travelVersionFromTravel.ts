import type { TravelCreateRequest, TravelDetail } from '../types/travel';

/**
 * Build the request behind "Mark as done" — I did this trip too, but I have nothing to upload: a
 * version of the source travel that only records that the viewer did it. The route, labels and
 * destination carry over so the entry is recognisable; the story, dates and photos stay empty for
 * the traveller to fill in later. Private by default, like any other new version.
 */
export const buildTravelVersionRequest = (travel: TravelDetail): TravelCreateRequest => ({
  title: travel.title,
  description: null,
  location: travel.location ?? null,
  startDate: null,
  endDate: null,
  visibility: 'PRIVATE',
  categoryId: travel.category?.id ?? null,
  tags: travel.tags?.map((tag) => tag.id) ?? [],
  coverImageId: null,
  photos: [],
  places: (travel.places ?? []).map((place) => ({
    name: place.name ?? null,
    latitude: place.latitude,
    longitude: place.longitude
  })),
  dayNotes: [],
  originTravelId: travel.id
});
