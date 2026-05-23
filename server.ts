import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Future AI Agent endpoint for RAG
  app.post("/api/ai/query", async (req, res) => {
    const { query, userContext } = req.body;
    
    // RAG Logic Flow:
    // 1. Receive natural language query: "Am I on track for my protein?"
    // 2. Fetch recent data from Supabase (Daily Intakes, Workout Volume)
    // 3. Format as plain text context
    // 4. Inject into System Instruction
    // 5. Query Gemini
    
    const mockContext = `
      USER DATA CONTEXT (Last 7 Days):
      - Avg Calories: 2100 kcal (Target: 2500)
      - Avg Protein: 145g (Target: 180g)
      - Workout Sessions: 4 (Push, Pull, Legs, Upper)
      - Best Lift: Squat 120kg x 5 (New PR)
    `;

    res.json({ 
      answer: "Based on your context...", 
      contextUsed: mockContext 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
