import fs from "fs/promises";
import path from "path";

const DB_PATH = path.join(__dirname, "../../data/history.json");

export class HistoryStore {
  async append(item: any) {
    try {
      await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
      let arr: any[] = [];
      try {
        const raw = await fs.readFile(DB_PATH, "utf-8");
        arr = JSON.parse(raw);
      } catch (e) {
        arr = [];
      }
      arr.push(item);
      // keep only last 5000 entries to avoid uncontrolled growth
      if (arr.length > 5000) arr = arr.slice(-5000);
      await fs.writeFile(DB_PATH, JSON.stringify(arr, null, 2), "utf-8");
    } catch (e) {
      console.error("Failed to append history", e);
    }
  }

  async list(limit = 100) {
    try {
      const raw = await fs.readFile(DB_PATH, "utf-8");
      const arr = JSON.parse(raw);
      return arr.slice(-limit);
    } catch (e) {
      return [];
    }
  }
}
