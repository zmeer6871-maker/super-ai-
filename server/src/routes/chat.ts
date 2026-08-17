import express from "express";
import { getProvider } from "../providers/factory";
import { QuotaManager } from "../storage/quotas";
import { HistoryStore } from "../storage/history";

const router = express.Router();

const provider = getProvider();
const quota = new QuotaManager();
const history = new HistoryStore();

// Stable backend endpoint
router.post("/", async (req, res, next) => {
  try {
    const { messages, assistant = "ALIC", mode = "general" } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "invalid_request", message: "messages must be a non-empty array" });
    }

    // Simple quota by remote IP. In production, tie to user account.
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const allowed = quota.consume(ip);
    if (!allowed.ok) {
      return res.status(429).json({ error: "quota_exceeded", message: allowed.message });
    }

    if (!provider.available) {
      return res.status(503).json({ error: "provider_unavailable", message: provider.unavailableMessage });
    }

    const response = await provider.sendChat(messages, { assistant, mode });

    // persist to local history (append)
    await history.append({ id: Date.now().toString(), ip, assistant, mode, messages, response, createdAt: new Date().toISOString() });

    res.json({ result: response });
  } catch (err) {
    next(err);
  }
});

export default router;
