const request = require('supertest');
const app = require('../server');
describe('GET /getUserLibrary', () => {
  it('should return 400 if entity_id is not provided', async () => {
    const response = await request(app).get('/getUserLibrary');
    expect(response.status).toBe(400);
  });

  it('should return 404 if no data found for the specified entity_id', async () => {
    const response = await request(app).get('/getUserLibrary').query({ entity_id: 'nonexistent_id' });
    expect(response.status).toBe(404);
  });

  it('should return 200 with images if valid entity_id is provided', async () => {
    const response = await request(app).get('/getUserLibrary').query({ entity_id: 456 });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('images');
  });
  
});
describe('GET /getDownloadedImages', () => {
  it('should return 400 if entity_id is not provided', async () => {
    const response = await request(app).get('/getUserLibrary');
    expect(response.status).toBe(400);
  });

  it('should return 404 if no data found for the specified entity_id', async () => {
    const response = await request(app).get('/getUserLibrary').query({ entity_id: 'nonexistent_id' });
    expect(response.status).toBe(404);
  });

  it('should return 200 with images if valid entity_id is provided', async () => {
    const response = await request(app).get('/getUserLibrary').query({ entity_id: 456 });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('images');
  });
  
});

describe('POST /dalle/search', () => {
  it('should return 401 if no API key is provided', async () => {
    const response = await request(app).post('/dalle/search').send({ query: 'test' });
    expect(response.status).toBe(401);
  });

  it('should return 401 if invalid API key is provided', async () => {
    const response = await request(app)
      .post('/dalle/search')
      .set('Authorization', 'Bearer invalid_api_key')
      .send({ query: 'test' });
    expect(response.status).toBe(401);
  });

});
describe('POST /shutterstock/search', () => {
  it('should return 401 if no API key is provided', async () => {
    const response = await request(app).post('/shutterstock/search').send({ query: 'test' });
    expect(response.status).toBe(401);
  });

  it('should return 401 if invalid API key is provided', async () => {
    const response = await request(app)
      .post('/shutterstock/search')
      .set('Authorization', 'Bearer invalid_api_key')
      .send({ query: 'test' });
    expect(response.status).toBe(401);
  });

});
describe('POST /storeDownload', () => {
  it('should return 500 if request body is incomplete', async () => {
    const response = await request(app).post('/storeDownload').send({ organization_id: 123 });
    expect(response.status).toBe(500);
  });

});
describe('POST /addToLibrary', () => {
  it('should return 500 if request body is incomplete', async() => {
    const response  = await request(app).post('/addToLibrary').send({organization_id: 123 });
    expect(response.status).toBe(500);
  });
})
