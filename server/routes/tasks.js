const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// Toutes les routes ci-dessous exigent d'être authentifié
router.use(requireAuth);

// GET /api/tasks -> liste uniquement les tâches de l'utilisateur connecté
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const offset = (page - 1) * limit;

  const tasks = await db.execute({
    sql: 'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    args: [req.userId, limit, offset]
  });

  const countResult = await db.execute({
    sql: 'SELECT COUNT(*) as total FROM tasks WHERE user_id = ?',
    args: [req.userId]
  });
  const total = countResult.rows[0].total;

  res.json({
    tasks: tasks.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// POST /api/tasks -> crée une tâche pour l'utilisateur connecté
router.post('/', async (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'Le champ "text" est requis' });
  }

  const result = await db.execute({
    sql: 'INSERT INTO tasks (user_id, text, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    args: [req.userId, text]
  });

  const newTask = await db.execute({
    sql: 'SELECT * FROM tasks WHERE id = ?',
    args: [result.lastInsertRowid]
  });

  res.status(201).json(newTask.rows[0]);
});

// PUT /api/tasks/:id -> met à jour une tâche, uniquement si elle appartient à l'utilisateur
router.put('/:id', async (req, res) => {
  const { id } = req.params;

  const existing = await db.execute({
    sql: 'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
    args: [id, req.userId]
  });
  if (existing.rows.length === 0) {
    return res.status(404).json({ error: 'Tâche introuvable' });
  }

  const current = existing.rows[0];

  // On ne modifie que les champs fournis, on garde les autres inchangés
  const text = req.body.text !== undefined ? req.body.text.trim() : current.text;
  const done = req.body.done !== undefined ? (req.body.done ? 1 : 0) : current.done;

  if (!text) {
    return res.status(400).json({ error: 'Le texte ne peut pas être vide' });
  }

  await db.execute({
    sql: 'UPDATE tasks SET text = ?, done = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [text, done, id]
  });

  const updated = await db.execute({
    sql: 'SELECT * FROM tasks WHERE id = ?',
    args: [id]
  });

  res.json(updated.rows[0]);
});

// DELETE /api/tasks/:id -> supprime une tâche, uniquement si elle appartient à l'utilisateur
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  await db.execute({
    sql: 'DELETE FROM tasks WHERE id = ? AND user_id = ?',
    args: [id, req.userId]
  });

  res.status(204).send();
});

module.exports = router;