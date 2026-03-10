const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const androidWSS = new WebSocket.Server({ noServer: true });
const dashboardWSS = new WebSocket.Server({ noServer: true });

let dashboardClients = new Set();
let androidClient = null;

// Android Connect
androidWSS.on("connection", (ws) => {
  console.log("📱 Android Connected!");
  androidClient = ws;

  // Dashboard ko batao Android aaya
  dashboardClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: "android_status", connected: true }));
    }
  });

  ws.on("message", (data) => {
    // Agar text message hai (status update)
    if (typeof data === "string" || data instanceof Buffer && data[0] === 123) {
      dashboardClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    } else {
      // Binary = camera frame
      dashboardClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    }
  });

  ws.on("close", () => {
    console.log("📱 Android Disconnected!");
    androidClient = null;
    dashboardClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: "android_status", connected: false }));
      }
    });
  });
});

// Dashboard Connect
dashboardWSS.on("connection", (ws) => {
  console.log("⚛️ Dashboard Connected!");
  dashboardClients.add(ws);

  // Batao Android connected hai ya nahi
  ws.send(JSON.stringify({
    type: "android_status",
    connected: androidClient !== null
  }));

  // Dashboard se command aaye to Android ko bhejo
  ws.on("message", (data) => {
    if (androidClient && androidClient.readyState === WebSocket.OPEN) {
      androidClient.send(data);
    }
  });

  ws.on("close", () => {
    dashboardClients.delete(ws);
    console.log("⚛️ Dashboard Disconnected!");
  });
});

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

app.get("/", (req, res) => res.send("✅ Camera Server Running!"));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));