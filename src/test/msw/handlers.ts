import { http, HttpResponse } from 'msw';

const apiUrl = 'http://localhost:8080/api';

export const handlers = [
  http.get(`${apiUrl}/public/categories`, () =>
    HttpResponse.json([
      { id: 1, name: 'place', main: true, title: 'Place' },
      { id: 2, name: 'trip', main: true, title: 'Trip' },
      { id: 21, name: 'event', main: true, title: 'Event' }
    ])
  ),
  http.get(`${apiUrl}/public/tags`, () =>
    HttpResponse.json([{ id: 11, name: 'quiet', title: 'Quiet', value: 'quiet', creator: 'test' }])
  ),
  http.get(`${apiUrl}/public/places`, () =>
    HttpResponse.json({
      totalItems: 1,
      data: [
        {
          id: 1,
          name: 'Hidden Courtyard',
          description: 'Quiet inner courtyard with morning light.',
          phoneNumber: '',
          feature: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [14.4378, 50.0755] },
            properties: { id: 'place-1', name: 'Hidden Courtyard' }
          },
          openingHours: 'Always open',
          category: { id: 10, name: 'place', main: true, title: 'Place' },
          tags: [{ id: 11, name: 'quiet', title: 'Quiet', value: 'quiet', creator: 'test' }],
          city: { id: 12, name: 'Prague', description: 'Prague' },
          images: ['https://example.com/place.jpg'],
          rating: 4.5
        }
      ]
    })
  ),
  http.get(`${apiUrl}/users/me`, () =>
    HttpResponse.json({
      id: 99,
      keycloakId: 'kc-me',
      email: 'me@example.com',
      username: 'me',
      displayName: 'Test Me',
      createdAt: '2024-01-01T00:00:00Z',
      followers: [],
      following: []
    })
  ),
  http.get(`${apiUrl}/public/users`, () =>
    HttpResponse.json({
      totalItems: 1,
      data: [
        {
          id: 1,
          keycloakId: 'kc-1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          displayName: 'Ada Lovelace',
          rating: 5,
          createdAt: '2024-01-15T08:00:00Z',
          followers: [],
          following: []
        }
      ]
    })
  ),
  http.get(`${apiUrl}/public/users/:id`, () =>
    HttpResponse.json({
      id: 1,
      keycloakId: 'kc-1',
      username: 'ada',
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
      createdAt: '2024-01-15T08:00:00Z',
      wandersOrganized: [],
      wandersAttended: [
        {
          id: 401,
          description: 'Weekend riverside wander',
          startTime: '2099-06-20T09:00:00Z'
        }
      ],
      followers: [],
      following: []
    })
  ),
  http.get(`${apiUrl}/public/users/:id/places`, () =>
    HttpResponse.json([
      {
        id: 201,
        name: 'Hidden Courtyard'
      }
    ])
  ),
  http.get(`${apiUrl}/public/users/:id/trips`, () =>
    HttpResponse.json([
      {
        id: 301,
        name: 'Prague Dawn Walk'
      }
    ])
  ),
  http.get(`${apiUrl}/public/events`, () =>
    HttpResponse.json({
      totalItems: 2,
      data: [
        {
          id: 1,
          name: 'Lantern Walk',
          description: 'Evening city walk with local guides.',
          venue: 'Old Town Square',
          startTime: '2099-06-18T18:00:00Z',
          createdAt: '2099-05-01T09:00:00Z',
          category: { id: 21, name: 'event', main: true, title: 'Event' },
          capacity: 20,
          price: 0,
          duration: 90,
          createdBy: 'organizer@example.com'
        },
        {
          id: 2,
          name: 'Riverside Tasting',
          description: 'Small-group tasting menu by the river.',
          venue: 'River Dock',
          startTime: '2099-06-25T19:00:00Z',
          createdAt: '2099-05-02T09:00:00Z',
          category: { id: 21, name: 'event', main: true, title: 'Event' },
          capacity: 12,
          price: 60,
          duration: 120,
          createdBy: 'organizer@example.com'
        }
      ]
    })
  ),
  http.get(`${apiUrl}/public/events/1`, () =>
    HttpResponse.json({
      id: 1,
      name: 'Lantern Walk',
      description: 'Evening city walk with local guides.',
      venue: 'Old Town Square',
      startTime: '2099-06-18T18:00:00Z',
      createdAt: '2099-05-01T09:00:00Z',
      category: { id: 21, name: 'event', main: true, title: 'Event' },
      capacity: 20,
      price: 0,
      duration: 90,
      createdBy: 'organizer@example.com'
    })
  ),
  http.get(`${apiUrl}/public/trips`, () =>
    HttpResponse.json({
      totalItems: 1,
      data: [
        {
          id: 301,
          name: 'Prague Dawn Walk',
          description: 'Early morning walk through the old city.',
          duration: 180,
          rating: 4.2,
          tags: [{ id: 11, name: 'quiet', title: 'Quiet', value: 'quiet', creator: 'test' }],
          images: ['https://example.com/trip.jpg']
        }
      ]
    })
  ),
  http.get(`${apiUrl}/public/trips/:id`, () =>
    HttpResponse.json({
      id: 301,
      name: 'Prague Dawn Walk',
      description: 'Early morning walk through the old city.',
      duration: 180,
      rating: 4.2,
      category: { id: 2, name: 'trip', main: true, title: 'Trip' },
      creator: 'Ada',
      createdBy: 'ada@example.com',
      tags: [{ id: 11, name: 'quiet', title: 'Quiet', value: 'quiet', creator: 'test' }],
      places: [],
      googlePlaces: [],
      comments: [],
      files: [],
      completedByUsers: []
    })
  ),
  http.post(`${apiUrl}/trips/:id/done`, () =>
    HttpResponse.json({
      id: 301,
      name: 'Prague Dawn Walk',
      description: 'Early morning walk through the old city.',
      duration: 180,
      rating: 4.2,
      category: { id: 2, name: 'trip', main: true, title: 'Trip' },
      creator: 'Ada',
      createdBy: 'ada@example.com',
      tags: [{ id: 11, name: 'quiet', title: 'Quiet', value: 'quiet', creator: 'test' }],
      places: [],
      googlePlaces: [],
      comments: [],
      files: [],
      completedByUsers: [
        {
          id: 1,
          email: 'ada@example.com',
          name: 'Ada Lovelace',
          displayName: 'Ada Lovelace',
          rating: null
        }
      ]
    })
  ),
  http.post(`${apiUrl}/places`, async ({ request }) => {
    const payload = (await request.json()) as Record<string, unknown>;

    return HttpResponse.json({
      id: 999,
      name: payload.name ?? 'Created place'
    });
  }),
  http.get(`${apiUrl}/travels/my`, () =>
    HttpResponse.json([
      {
        id: 501,
        title: 'Patagonia 2026',
        location: 'Argentina',
        startDate: '2026-01-10',
        endDate: '2026-01-20',
        visibility: 'PRIVATE',
        coverImage: { id: 1, url: 'https://example.com/cover.jpg', name: 'cover.jpg' },
        photoCount: 2,
        owner: { id: 99, name: 'Test Me', displayName: 'Test Me', profilePictureUrl: null }
      }
    ])
  ),
  http.get(`${apiUrl}/travels/:id`, () =>
    HttpResponse.json({
      id: 501,
      title: 'Patagonia 2026',
      description: 'Two weeks hiking the southern Andes.',
      location: 'Argentina',
      startDate: '2026-01-10',
      endDate: '2026-01-20',
      visibility: 'PRIVATE',
      shareToken: 'share-token-501',
      owner: { id: 99, name: 'Test Me', displayName: 'Test Me', profilePictureUrl: null },
      coverImage: { id: 1, url: 'https://example.com/cover.jpg', name: 'cover.jpg' },
      photos: [
        {
          id: 2,
          fileId: 2,
          url: 'https://example.com/photo.jpg',
          name: 'photo.jpg',
          latitude: 34.6937,
          longitude: 135.5023,
          takenOn: '2026-01-12'
        }
      ],
      createdAt: '2026-02-01T10:00:00Z'
    })
  ),
  http.get(`${apiUrl}/public/travels/share/:token`, () =>
    HttpResponse.json({
      id: 501,
      title: 'Patagonia 2026',
      description: 'Two weeks hiking the southern Andes.',
      location: 'Argentina',
      startDate: '2026-01-10',
      endDate: '2026-01-20',
      visibility: 'PRIVATE',
      shareToken: null,
      owner: { id: 99, name: 'Test Me', displayName: 'Test Me', profilePictureUrl: null },
      coverImage: { id: 1, url: 'https://example.com/cover.jpg', name: 'cover.jpg' },
      photos: [
        {
          id: 2,
          fileId: 2,
          url: 'https://example.com/photo.jpg',
          name: 'photo.jpg',
          latitude: 34.6937,
          longitude: 135.5023,
          takenOn: '2026-01-12'
        }
      ],
      createdAt: '2026-02-01T10:00:00Z'
    })
  ),
  http.post(`${apiUrl}/travels`, async ({ request }) => {
    const payload = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: 777,
      title: payload.title ?? 'Created travel',
      visibility: payload.visibility ?? 'PRIVATE',
      shareToken: 'share-token-777',
      photos: []
    });
  }),
  http.delete(`${apiUrl}/travels/:id`, () => new HttpResponse(null, { status: 204 }))
];
