import express from "express";
import { HistoryStore } from "../storage/history";

const router = express.Router();
const history = new HistoryStore();

// GET /api/history?limit=100
router.get('/', async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) || '100', 10), 1000);
  const list = await history.list(limit);
  res.json({ items: list });
});

export default router;
