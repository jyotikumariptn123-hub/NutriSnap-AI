import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Local Food Database Search
  app.get("/api/food/local-search", async (req, res) => {
    const query = (req.query.q as string || "").toLowerCase();
    try {
      const commonFoods = await import("./src/data/commonFoods.json", { assert: { type: "json" } });
      const results = commonFoods.default.filter((f: any) => 
        f.foodName.toLowerCase().includes(query)
      );
      res.json(results);
    } catch (error) {
      console.error("Local Search Error:", error);
      res.status(500).json({ error: "Failed to search local database" });
    }
  });

  // USDA API Proxy
  app.get("/api/food/search", async (req, res) => {
    const query = req.query.q;
    const apiKey = process.env.USDA_API_KEY || "DEMO_KEY";
    
    if (!query) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    try {
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query as string)}&pageSize=5`
      );
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("USDA API Error:", error);
      res.status(500).json({ error: "Failed to fetch data from USDA" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
