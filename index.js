const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

// 2 Alag WebSocket Servers
// 1. Android se frame receive karne ke liye
const androidWSS = new WebSocket.Server({ noServer: true });

// 2. React Dashboard ko frame bhejne ke liye
const dashboardWSS = new WebSocket.Server({ noServer: true });

let dashboardClients = new Set();

// Android Connect Hoga
androidWSS.on("connection", (ws) => {
  console.log("📱 Android Connected!");

  ws.on("message", (data) => {
    // Saare Dashboard clients ko frame bhejo
    dashboardClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });

  ws.on("close", () => {
    console.log("📱 Android Disconnected!");
  });
});

// Dashboard Connect Hoga
dashboardWSS.on("connection", (ws) => {
  console.log("⚛️ Dashboard Connected!");
  dashboardClients.add(ws);

  ws.on("close", () => {
    dashboardClients.delete(ws);
    console.log("⚛️ Dashboard Disconnected!");
  });
});

// Routing — Kaun Kahan Jaega
server.on("upgrade", (request, socket, head) => {
  if (request.url === "/android") {
    androidWSS.handleUpgrade(request, socket, head, (ws) => {
      androidWSS.emit("connection", ws, request);
    });
  } else if (request.url === "/dashboard") {
    dashboardWSS.handleUpgrade(request, socket, head, (ws) => {
      dashboardWSS.emit("connection", ws, request);
    });
  }
});

// Health Check
app.get("/", (req, res) => {
  res.send("✅ Camera Server Running!");
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});