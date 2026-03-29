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
  http.get(`${apiUrl}/public/users`, () =>
    HttpResponse.json({
      totalItems: 1,
      data: [
        {
          id: 1,
          keycloakId: 'kc-1',
          email: 'ada@example.com',
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
  http.get(`${apiUrl}/public/users/:email`, () =>
    HttpResponse.json({
      id: 1,
      keycloakId: 'kc-1',
      email: 'ada@example.com',
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
  http.get(`${apiUrl}/public/users/:email/places`, () =>
    HttpResponse.json([
      {
        id: 201,
        name: 'Hidden Courtyard'
      }
    ])
  ),
  http.get(`${apiUrl}/public/users/:email/trips`, () =>
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
  })
];
