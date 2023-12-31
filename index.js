import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());

const server = http.createServer(app);

const REACT_URL = process.env.REACT_URL;
const PORT = process.env.PORT;

const io = new Server(server, {
  cors: {
    origin: REACT_URL,
    methods: ["GET", "POST"],
  },
});

const rooms = [];

io.on("connection", (socket) => {
  socket.on("join", ({ roomId, username, isSetUp }, callback) => {
    let targetRoom = rooms.find((room) => room.id === roomId);

    if (!targetRoom && !isSetUp) {
      callback({ isValid: false, message: "Geçersiz kod." });
    } else {
      if (!targetRoom && isSetUp) {
        targetRoom = { id: roomId, users: [] };
        rooms.push(targetRoom);
      }
      targetRoom.users.push({ socketId: socket.id, username });
      socket.join(roomId);
      io.to(roomId).emit("joinReturn", {
        message: `${username} odaya katıldı.`,
        users: targetRoom.users,
        type: "action",
      });
      callback({ isValid: true });
    }
  });

  socket.on("sendMessage", ({ roomId, username, message }) => {
    io.to(roomId).emit("msgReturn", { username, message, type: "message" });
  });

  socket.on("disconnect", () => {
    rooms.forEach((room) => {
      const userIndex = room.users.findIndex(
        (user) => user.socketId === socket.id
      );

      if (userIndex !== -1) {
        const username = room.users[userIndex].username;

        room.users.splice(userIndex, 1);

        if (room.users.length === 0) {
          rooms.splice(rooms.indexOf(room), 1);
        }

        io.to(room.id).emit("joinReturn", {
          message: `${username} odadan ayrıldı.`,
          users: room.users,
          type: "action",
        });
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`server is running on ${PORT}`);
});
