const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server/index');

async function getAuthToken() {
  const email = `task-test-${Date.now()}@example.com`;
  const res = await request(app).post('/api/auth/register').send({
    name: 'Utilisateur Test',
    email,
    password: 'motdepasse123'
  });
  return res.body.token;
}

test('PUT /api/tasks/:id modifie uniquement le texte sans toucher au statut done', async () => {
  const token = await getAuthToken();

  const created = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ text: 'Texte original' });

  const id = created.body.id;

  // On coche la tâche d'abord
  await request(app)
    .put(`/api/tasks/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ done: true });

  // Puis on modifie uniquement le texte
  const res = await request(app)
    .put(`/api/tasks/${id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ text: 'Texte modifié' });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.text, 'Texte modifié');
  assert.strictEqual(res.body.done, 1); // le "done" mis précédemment doit être conservé
});