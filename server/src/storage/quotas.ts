import fs from "fs/promises";
import path from "path";

const PATH = path.join(__dirname, "../../data/quotas.json");

function dayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export class QuotaManager {
  freeLimit = parseInt(process.env.FREE_MESSAGES_PER_DAY || "150", 10);

  async load() {
    try {
      await fs.mkdir(path.dirname(PATH), { recursive: true });
      const raw = await fs.readFile(PATH, "utf-8");
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }

  async save(data: any) {
    await fs.writeFile(PATH, JSON.stringify(data, null, 2), "utf-8");
  }

  async consume(ip: string) {
    const data = await this.load();
    const key = dayKey();
    data[key] = data[key] || {};
    data[key][ip] = (data[key][ip] || 0) + 1;
    await this.save(data);
    if (data[key][ip] > this.freeLimit) {
      return { ok: false, message: `Free plan daily limit reached (${this.freeLimit} messages).` };
    }
    return { ok: true };
  }
}
