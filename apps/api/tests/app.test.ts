import request from 'supertest';
import { createApp } from '../src/app';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const app = createApp();

describe('Health check', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });
});

describe('404 handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-route');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });
});

describe('Auth routes', () => {
  it('POST /auth/oauth/callback – validates required fields', async () => {
    const res = await request(app).post('/auth/oauth/callback').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /auth/oauth/callback – returns token on valid code', async () => {
    const res = await request(app)
      .post('/auth/oauth/callback')
      .send({ code: 'mock-code-123' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);
  });
});

describe('Bots routes – unauthenticated', () => {
  it('GET /bots returns 401 without a token', async () => {
    const res = await request(app).get('/bots');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });
});

