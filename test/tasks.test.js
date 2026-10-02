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

test("Un utilisateur ne peut pas accéder aux tâches d'un autre utilisateur", async () => {
  // Utilisateur A crée une tâche
  const tokenA = await getAuthToken();
  const taskA = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ text: 'Tâche privée de A' });
  const taskId = taskA.body.id;

  // Utilisateur B tente d'accéder aux tâches
  const tokenB = await getAuthToken();

  // B ne voit pas la tâche de A dans sa liste
  const listB = await request(app).get('/api/tasks').set('Authorization', `Bearer ${tokenB}`);
  const bSeesTaskA = listB.body.tasks.some((t) => t.id === taskId);
  assert.strictEqual(bSeesTaskA, false);

  // B ne peut pas modifier la tâche de A (404, pas 200)
  const updateAttempt = await request(app)
    .put(`/api/tasks/${taskId}`)
    .set('Authorization', `Bearer ${tokenB}`)
    .send({ text: 'Piraté par B' });
  assert.strictEqual(updateAttempt.status, 404);

  // B ne peut pas supprimer la tâche de A
  await request(app).delete(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${tokenB}`);

  // Vérifie que la tâche existe toujours pour A (donc pas supprimée par B)
  const listA = await request(app).get('/api/tasks').set('Authorization', `Bearer ${tokenA}`);
  const stillExists = listA.body.tasks.some((t) => t.id === taskId);
  assert.strictEqual(stillExists, true);
});

test('GET /api/tasks avec filter=pending ne renvoie que les tâches non terminées', async () => {
  const token = await getAuthToken();

  await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ text: 'Tâche en attente' });

  const task2 = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ text: 'Tâche terminée' });

  await request(app)
    .put(`/api/tasks/${task2.body.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ done: true });

  const res = await request(app)
    .get('/api/tasks?filter=pending')
    .set('Authorization', `Bearer ${token}`)
    .send();

  const texts = res.body.tasks.map((t) => t.text);
  assert.ok(texts.includes('Tâche en attente'));
  assert.ok(!texts.includes('Tâche terminée'));
});

test('GET /api/tasks avec un paramètre sort invalide retombe sur le tri par défaut', async () => {
  const token = await getAuthToken();
  const res = await request(app)
    .get('/api/tasks?sort=DROP TABLE tasks;--')
    .set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200); // ne plante pas, ignore simplement la valeur invalide
});
