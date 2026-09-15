const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server/index');

const testUser = {
  email: `test-${Date.now()}@example.com`, // email unique à chaque run
  password: 'motdepasse123'
};

test('POST /api/auth/register crée un compte (201)', async () => {
  const res = await request(app).post('/api/auth/register').send(testUser);
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.token);
});

test('POST /api/auth/register avec un email déjà pris renvoie 409', async () => {
  const res = await request(app).post('/api/auth/register').send(testUser);
  assert.strictEqual(res.status, 409);
});

test('POST /api/auth/login avec un mauvais mot de passe renvoie 401', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email: testUser.email,
    password: 'mauvais-mot-de-passe'
  });
  assert.strictEqual(res.status, 401);
});

test('POST /api/auth/login avec les bons identifiants renvoie 200 + token', async () => {
  const res = await request(app).post('/api/auth/login').send(testUser);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.token);
});

test('GET /api/tasks sans token renvoie 401', async () => {
  const res = await request(app).get('/api/tasks');
  assert.strictEqual(res.status, 401);
});

test('GET /api/tasks avec un token valide renvoie 200', async () => {
  const login = await request(app).post('/api/auth/login').send(testUser);
  const token = login.body.token;

  const res = await request(app)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
});