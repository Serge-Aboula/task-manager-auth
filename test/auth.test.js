const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server/index');

const testUser = {
  name: 'Utilisateur Test',
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
  assert.ok(Array.isArray(res.body.tasks));
  assert.ok(res.body.pagination);
  assert.strictEqual(res.body.pagination.page, 1);
});

test('POST /api/auth/forgot-password renvoie toujours un message générique', async () => {
  const res = await request(app).post('/api/auth/forgot-password').send({
    email: 'email-inexistant@example.com'
  });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.message);
});

test('POST /api/auth/reset-password avec un token invalide renvoie 400', async () => {
  const res = await request(app).post('/api/auth/reset-password').send({
    token: 'token-qui-nexiste-pas',
    newPassword: 'nouveaumotdepasse123'
  });
  assert.strictEqual(res.status, 400);
});

test('Flux complet : forgot-password puis reset-password fonctionne', async () => {
  const email = `reset-test-${Date.now()}@example.com`;
  await request(app).post('/api/auth/register').send({
    name: 'Utilisateur Test',
    email,
    password: 'ancienmotdepasse123'
  });

  const forgotRes = await request(app).post('/api/auth/forgot-password').send({ email });
  const resetLink = forgotRes.body.devResetLink;
  const token = new URL(resetLink).searchParams.get('resetToken');

  const resetRes = await request(app).post('/api/auth/reset-password').send({
    token,
    newPassword: 'nouveaumotdepasse123'
  });
  assert.strictEqual(resetRes.status, 200);

  // Vérifie que l'ancien mot de passe ne fonctionne plus
  const oldLogin = await request(app).post('/api/auth/login').send({
    email,
    password: 'ancienmotdepasse123'
  });
  assert.strictEqual(oldLogin.status, 401);

  // Vérifie que le nouveau mot de passe fonctionne
  const newLogin = await request(app).post('/api/auth/login').send({
    email,
    password: 'nouveaumotdepasse123'
  });
  assert.strictEqual(newLogin.status, 200);
});

test('PUT /api/auth/profile modifie le nom (protégé par auth)', async () => {
  const email = `profile-test-${Date.now()}@example.com`;
  const register = await request(app).post('/api/auth/register').send({
    name: 'Nom Original',
    email,
    password: 'motdepasse123'
  });
  const token = register.body.token;

  const res = await request(app)
    .put('/api/auth/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Nouveau Nom' });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.name, 'Nouveau Nom');
});

test('PUT /api/auth/profile sans token renvoie 401', async () => {
  const res = await request(app).put('/api/auth/profile').send({ name: 'x' });
  assert.strictEqual(res.status, 401);
});