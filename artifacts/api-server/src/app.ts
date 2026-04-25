import express, { type Express } from "express";
import cors from "cors";
import proxyRouter from "./routes/proxy.js";

const app: Express = express();
const PORT = parseInt(process.env.PORT ?? "3000", 10);

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/v1", proxyRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server listening on port ${PORT}`);
});

export default app;
