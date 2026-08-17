import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  if (err.message === "No AI provider configured") {
    return res.status(503).json({ error: "provider_unavailable", message: err.message });
  }

  if (err.status === 401) {
    return res.status(401).json({ error: "authentication_failed", message: err.body || "Authentication failed with AI provider" });
  }

  if (err.status === 402) {
    return res.status(402).json({ error: "billing_error", message: err.body || "Billing or quota problem with AI provider" });
  }

  if (err.status === 429) {
    return res.status(429).json({ error: "rate_limited", message: err.body || "Rate limit from AI provider" });
  }

  res.status(500).json({ error: "server_error", message: err.message || "Internal server error" });
}
