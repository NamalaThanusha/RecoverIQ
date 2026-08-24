import request from 'supertest';
import app from '../app';

describe('Health Endpoint', () => {
  it('should return status ok and service name', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'recoveriq-api'
    });
  });
});
