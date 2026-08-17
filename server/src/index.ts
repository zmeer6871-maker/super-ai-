import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRouter from "./routes/chat";
import uploadRouter from "./routes/upload";
import historyRouter from "./routes/history";
import { errorHandler } from "./middleware/errorHandler";
import path from "path";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Serve uploaded files statically under /uploads
const uploadsPath = path.join(__dirname, "../data/uploads");
app.use('/uploads', express.static(uploadsPath));

app.use("/api/chat", chatRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/history", historyRouter);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
