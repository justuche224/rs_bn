import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { serve } from '@hono/node-server';
import { app } from '../index.js';
import db from '../db/index.js';
import { user } from '../db/schema.js';

describe('Authentication API', () => {
  let server: ReturnType<typeof serve>;

  beforeAll(async () => {
    // Start the server
    server = serve({
      fetch: app.fetch,
      port: Number(process.env.PORT),
    });

    // Clean up test database
    await db.delete(user);
  });

  afterAll(async () => {
    // Close server and database connections
    server.close();
    await (db as any).connection.end();
  });

  it('should register a new user', async () => {
    const response = await request(server)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!@#',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'Registration successful');
  });

  it('should not register with invalid email', async () => {
    const response = await request(server)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: 'Test123!@#',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
}); 