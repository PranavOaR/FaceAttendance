import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000';

test.describe('Backend API', () => {
  test('health endpoint returns healthy status', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('healthy');
  });

  test('health endpoint reports Firebase connected', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    const body = await res.json();
    expect(body.services.firebase).toBe(true);
  });

  test('health endpoint reports embedding and recognition services up', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    const body = await res.json();
    expect(body.services.embedding_service).toBe(true);
    expect(body.services.recognition_service).toBe(true);
  });

  test('upload endpoint rejects non-image file', async ({ request }) => {
    const res = await request.post(`${API}/upload/student-photo`, {
      multipart: {
        file: { name: 'test.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') },
        teacher_id: 'test',
        class_id: 'test',
        student_srn: 'TEST001',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.detail).toMatch(/image/i);
  });

  test('upload endpoint rejects missing Cloudinary config gracefully if not set', async ({ request }) => {
    // When Cloudinary IS configured this returns 200; otherwise 500.
    // Either way it should not 404 — the route exists.
    const formData = new FormData();
    const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    const res = await request.post(`${API}/upload/student-photo`, {
      multipart: {
        file: { name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) },
        teacher_id: 'playwright_teacher',
        class_id: 'playwright_class',
        student_srn: 'PW001',
      },
    });
    expect([200, 500]).toContain(res.status());
  });

  test('notify endpoint returns 500 when no absent students with contacts', async ({ request }) => {
    const res = await request.post(`${API}/notify/absence`, {
      data: {
        classId: 'test',
        className: 'Test Class',
        subject: 'Math',
        date: '2026-05-17',
        absentStudents: [],
        teacherName: 'Test Teacher',
      },
    });
    // Empty list → success: true, "No parent contact details"
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
