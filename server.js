import express from "express";

const app = express();
const PORT = 1987;

// Serve static files from Vite's build output
app.use(express.static("dist"));

// Example API endpoint
app.get("/api/message", (req, res) => {
  res.json({ message: "Hello from the server!" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
