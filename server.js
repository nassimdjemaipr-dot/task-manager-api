const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const app = express();

app.use(bodyParser.json());
app.set("view engine", "ejs");

// Hardcoded secret key
const SECRET_KEY = "super_secret_123";
const DB_PASSWORD = "admin1234";

// Fake database
let users = [
  { id: 1, username: "admin", password: "admin123", role: "admin" },
  { id: 2, username: "user", password: "password", role: "user" },
];

let tasks = [
  { id: 1, title: "Fix bug", userId: 1, done: false },
  { id: 2, title: "Deploy app", userId: 2, done: false },
];

// Login - No rate limiting, weak password check
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY);
    res.json({ token: token });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Get user profile - XSS vulnerability
app.get("/profile/:username", (req, res) => {
  const username = req.params.username;
  // Direct injection in HTML response
  res.send(`<html><body><h1>Profile of ${username}</h1></body></html>`);
});

// Search tasks - SQL injection style vulnerability
app.get("/tasks/search", (req, res) => {
  const query = req.query.q;
  // Using eval to filter - command injection risk
  const results = eval(`tasks.filter(t => t.title.includes('${query}'))`);
  res.json(results);
});

// Create task - No input validation
app.post("/tasks", (req, res) => {
  const task = {
    id: tasks.length + 1,
    title: req.body.title,
    userId: req.body.userId,
    done: false,
  };
  tasks.push(task);
  res.json(task);
});

// Delete task - No authorization check (IDOR)
app.delete("/tasks/:id", (req, res) => {
  const taskId = parseInt(req.params.id);
  tasks = tasks.filter((t) => t.id !== taskId);
  res.json({ message: "Task deleted" });
});

// Admin endpoint - Broken access control
app.get("/admin/users", (req, res) => {
  // No authentication check at all
  res.json(users);
});

// Execute command - OS command injection
app.get("/ping", (req, res) => {
  const host = req.query.host;
  const exec = require("child_process").exec;
  exec(`ping -c 1 ${host}`, (err, stdout) => {
    res.send(stdout);
  });
});

// File read - Path traversal
app.get("/files", (req, res) => {
  const fs = require("fs");
  const filename = req.query.name;
  const content = fs.readFileSync("./uploads/" + filename, "utf-8");
  res.send(content);
});

// Debug endpoint left in production
app.get("/debug", (req, res) => {
  res.json({
    env: process.env,
    memory: process.memoryUsage(),
    users: users,
  });
});

// CORS - Too permissive
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
