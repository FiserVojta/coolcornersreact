import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../test/msw/server';
import { uploadFile } from './files';
import { compressImageForUpload, generateThumbnailForUpload } from '../lib/imageCompression';

vi.mock('../lib/imageCompression', () => ({
  compressImageForUpload: vi.fn(async (file: File) => file),
  generateThumbnailForUpload: vi.fn(async () => null)
}));

const apiUrl = 'http://localhost:8080/api';
const storageUrl = 'https://storage.example.com';

describe('uploadFile', () => {
  beforeEach(() => {
    vi.mocked(compressImageForUpload).mockImplementation(async (file: File) => file);
    vi.mocked(generateThumbnailForUpload).mockResolvedValue(null);
  });

  it('uploads via presigned URL and registers the file without a thumbnail', async () => {
    const presignBodies: unknown[] = [];
    const completeBodies: unknown[] = [];
    const storagePuts: { contentType: string | null }[] = [];

    server.use(
      http.post(`${apiUrl}/files/presign`, async ({ request }) => {
        presignBodies.push(await request.json());
        return HttpResponse.json({
          key: 'k-doc.pdf',
          uploadUrl: `${storageUrl}/k-doc.pdf`,
          publicUrl: `${storageUrl}/bucket/k-doc.pdf`,
          headers: { 'Content-Type': 'application/pdf' },
          thumbnailKey: null,
          thumbnailUploadUrl: null,
          thumbnailPublicUrl: null,
          thumbnailHeaders: null
        });
      }),
      http.put(`${storageUrl}/k-doc.pdf`, ({ request }) => {
        storagePuts.push({ contentType: request.headers.get('Content-Type') });
        return new HttpResponse(null, { status: 200 });
      }),
      http.post(`${apiUrl}/files/complete`, async ({ request }) => {
        completeBodies.push(await request.json());
        return HttpResponse.json({
          id: 1,
          name: 'k-doc.pdf',
          url: `${storageUrl}/bucket/k-doc.pdf`,
          thumbnailUrl: null
        });
      })
    );

    const file = new File(['pdf-bytes'], 'doc.pdf', { type: 'application/pdf' });
    const uploaded = await uploadFile(file);

    expect(presignBodies).toEqual([
      { fileName: 'doc.pdf', contentType: 'application/pdf', withThumbnail: false }
    ]);
    expect(storagePuts).toEqual([{ contentType: 'application/pdf' }]);
    expect(completeBodies).toEqual([{ key: 'k-doc.pdf', thumbnailKey: null }]);
    expect(uploaded.url).toBe(`${storageUrl}/bucket/k-doc.pdf`);
  });

  it('uploads image and client-generated thumbnail, then completes with both keys', async () => {
    vi.mocked(generateThumbnailForUpload).mockResolvedValue(
      new Blob(['thumb-bytes'], { type: 'image/jpeg' })
    );
    const presignBodies: unknown[] = [];
    const completeBodies: unknown[] = [];
    const putKeys: string[] = [];

    server.use(
      http.post(`${apiUrl}/files/presign`, async ({ request }) => {
        presignBodies.push(await request.json());
        return HttpResponse.json({
          key: 'k-photo.jpg',
          uploadUrl: `${storageUrl}/k-photo.jpg`,
          publicUrl: `${storageUrl}/bucket/k-photo.jpg`,
          headers: { 'Content-Type': 'image/jpeg' },
          thumbnailKey: 'thumb-k-photo.jpg',
          thumbnailUploadUrl: `${storageUrl}/thumb-k-photo.jpg`,
          thumbnailPublicUrl: `${storageUrl}/bucket/thumb-k-photo.jpg`,
          thumbnailHeaders: { 'Content-Type': 'image/jpeg' }
        });
      }),
      http.put(`${storageUrl}/:key`, ({ params }) => {
        putKeys.push(params.key as string);
        return new HttpResponse(null, { status: 200 });
      }),
      http.post(`${apiUrl}/files/complete`, async ({ request }) => {
        completeBodies.push(await request.json());
        return HttpResponse.json({
          id: 2,
          name: 'k-photo.jpg',
          url: `${storageUrl}/bucket/k-photo.jpg`,
          thumbnailUrl: `${storageUrl}/bucket/thumb-k-photo.jpg`
        });
      })
    );

    const file = new File(['image-bytes'], 'photo.jpg', { type: 'image/jpeg' });
    const uploaded = await uploadFile(file);

    expect(presignBodies).toEqual([
      { fileName: 'photo.jpg', contentType: 'image/jpeg', withThumbnail: true }
    ]);
    expect(putKeys.sort()).toEqual(['k-photo.jpg', 'thumb-k-photo.jpg']);
    expect(completeBodies).toEqual([{ key: 'k-photo.jpg', thumbnailKey: 'thumb-k-photo.jpg' }]);
    expect(uploaded.thumbnailUrl).toBe(`${storageUrl}/bucket/thumb-k-photo.jpg`);
  });

  it('degrades to no thumbnail when the thumbnail PUT fails', async () => {
    vi.mocked(generateThumbnailForUpload).mockResolvedValue(
      new Blob(['thumb-bytes'], { type: 'image/jpeg' })
    );
    const completeBodies: unknown[] = [];

    server.use(
      http.post(`${apiUrl}/files/presign`, () =>
        HttpResponse.json({
          key: 'k-photo.jpg',
          uploadUrl: `${storageUrl}/k-photo.jpg`,
          publicUrl: `${storageUrl}/bucket/k-photo.jpg`,
          headers: { 'Content-Type': 'image/jpeg' },
          thumbnailKey: 'thumb-k-photo.jpg',
          thumbnailUploadUrl: `${storageUrl}/thumb-k-photo.jpg`,
          thumbnailPublicUrl: `${storageUrl}/bucket/thumb-k-photo.jpg`,
          thumbnailHeaders: { 'Content-Type': 'image/jpeg' }
        })
      ),
      http.put(`${storageUrl}/k-photo.jpg`, () => new HttpResponse(null, { status: 200 })),
      http.put(
        `${storageUrl}/thumb-k-photo.jpg`,
        () => new HttpResponse(null, { status: 403 })
      ),
      http.post(`${apiUrl}/files/complete`, async ({ request }) => {
        completeBodies.push(await request.json());
        return HttpResponse.json({
          id: 3,
          name: 'k-photo.jpg',
          url: `${storageUrl}/bucket/k-photo.jpg`,
          thumbnailUrl: null
        });
      })
    );

    const file = new File(['image-bytes'], 'photo.jpg', { type: 'image/jpeg' });
    const uploaded = await uploadFile(file);

    expect(completeBodies).toEqual([{ key: 'k-photo.jpg', thumbnailKey: null }]);
    expect(uploaded.thumbnailUrl).toBeNull();
  });

  it('fails without registering the file when the main storage PUT fails', async () => {
    let completeCalled = false;

    server.use(
      http.post(`${apiUrl}/files/presign`, () =>
        HttpResponse.json({
          key: 'k-doc.pdf',
          uploadUrl: `${storageUrl}/k-doc.pdf`,
          publicUrl: `${storageUrl}/bucket/k-doc.pdf`,
          headers: { 'Content-Type': 'application/pdf' },
          thumbnailKey: null,
          thumbnailUploadUrl: null,
          thumbnailPublicUrl: null,
          thumbnailHeaders: null
        })
      ),
      http.put(`${storageUrl}/k-doc.pdf`, () => new HttpResponse(null, { status: 403 })),
      http.post(`${apiUrl}/files/complete`, () => {
        completeCalled = true;
        return HttpResponse.json({ id: 4 });
      })
    );

    const file = new File(['pdf-bytes'], 'doc.pdf', { type: 'application/pdf' });
    await expect(uploadFile(file)).rejects.toThrow();
    expect(completeCalled).toBe(false);
  });
});
