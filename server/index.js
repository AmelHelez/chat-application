require("dotenv").config();
const app = require("express")();
const http = require("http").createServer(app);
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const { createClient } = require("redis");

const io = require("socket.io")(http, {
  cors: {
    origin: "https://chatapp-29de5.web.app",
  },
});
const jwtoken = require("jsonwebtoken");
var { expressjwt: jwt } = require("express-jwt");
app.use(
  cors({
    origin: "https://chatapp-29de5.web.app",
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let client = null;

const MESSAGE_LIMIT = 20;
const LIMIT_DURATION = 60;

async function connect() {
  client = await createClient({
    password: "GjtK5Yrht9Eo6Lk2iFpioLVknuyMrosu",
    socket: {
      host: "redis-10306.c328.europe-west3-1.gce.redns.redis-cloud.com",
      port: 10306,
    },
  })
    .on("error", (err) => console.log("Redis Client Error", err))
    .connect();
}

connect();

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const userExists = await client.hGetAll(`user:${username}`);
  if (JSON.stringify(userExists) != "{}") {
    return res.status(500).send({ message: "Username already exists" });
  }

  const allRooms = await client.keys("rooms:*");
  let rooms = [];
  if (allRooms.length > 0) {
    rooms = await Promise.all(
      allRooms.map(async (key) => {
        const room = await client.hGetAll(key);
        if (room && Object.keys(room).length > 0 && +room.type == 1) {
          await client.hSet(`${key}`, "name", `${room.name}-${username}`);
          const users = JSON.parse(room.users);
          users.push({ username: username, joined: "" });
          await client.hSet(`${key}`, "users", JSON.stringify(users));

          return +room.id;
        }

        return null;
      })
    );
  }

  await client.hSet(`user:${username}`, {
    username: username,
    password: hashedPassword,
    status: 0,
    rooms:
      rooms.length == 0
        ? JSON.stringify([])
        : JSON.stringify(rooms.filter((r) => r !== null)),
  });

  res
    .status(200)
    .send({ message: "User registered successfully!", username: username });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await client.hGetAll(`user:${username}`);
  if (JSON.stringify(user) == "{}") {
    return res.status(500).send({ message: "User not found" });
  }

  bcrypt.compare(password, user.password, async (err, result) => {
    if (err) {
      return res.status(500).send("Error comparing passwords:");
    }

    if (!result) {
      return res.status(401).send({ message: "Invalid password" });
    }

    const token = jwtoken.sign({}, process.env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: 3600,
      subject: user.username,
    });

    await client.hSet(`user:${username}`, "status", "1");

    res.status(200).json({
      token: { idToken: token, expiresIn: 3600 },
      user: user.username,
    });
  });
});

app.get(
  "/",
  jwt({ secret: process.env.JWT_SECRET, algorithms: ["HS256"] }),
  async function (req, res) {
    const allUsers = await client?.keys("user:*");
    if (allUsers.length > 0) {
      const users = await Promise.all(
        allUsers.map(async (key) => {
          const user = await client.hGetAll(key);
          if (user && Object.keys(user).length > 0) {
            return {
              username: user.username,
              rooms: JSON.parse(user.rooms),
              status: +user.status,
            };
          }

          return null;
        })
      );

      const currentUser = users.find((user) => user.username == req.auth.sub);
      const filteredUsers = users.filter(
        (user) => user !== null && user.username !== currentUser.username
      );

      const rooms = await Promise.all(
        currentUser.rooms?.map(async (r) => {
          const room = await client.hGetAll(`rooms:${r}`);
          if (JSON.stringify(room) != "{}") {
            let roomTitle = room.name
              .replace("room-", "")
              .replace(`-${req.auth.sub}`, "")
              .replace(`${req.auth.sub}-`, "");

            roomTitle = roomTitle.replaceAll("-", ", ");

            return {
              id: +room.id,
              users: JSON.parse(room.users),
              name: room.name,
              type: +room.type,
              title: +room.type == 0 ? `${roomTitle} (priv)` : roomTitle,
            };
          }

          return null;
        })
      );

      currentUser.rooms = rooms;

      return res.status(200).json({
        message: "You are now on the home page.",
        users: filteredUsers,
        currentUser: currentUser,
      });
    }

    res.status(200).json({
      message: "You are now on the home page.",
      users: [],
    });
  }
);

io.on("connection", async (socket) => {
  console.log("a user connected");

  if (
    client &&
    socket.handshake.auth &&
    socket.handshake.auth?.user.length > 0
  ) {
    await client.set(`sockets:${socket.handshake.auth.user}`, `${socket.id}`);
  }

  socket.on("login", async (username) => {
    if (client && username.length > 0) {
      await client.set(`sockets:${username}`, `${socket.id}`);
    }
  });

  socket.on("createRoom", async (roomName, users, roomCreator, isPrivate) => {
    const allRooms = await client.keys("rooms:*");
    const roomUsers = [];
    users.map((u) => {
      const roomUser = {
        username: u,
        joined: u == roomCreator ? new Date() : "",
      };
      roomUsers.push(roomUser);
    });

    await client.hSet(`rooms:${allRooms.length + 1}`, {
      id: allRooms.length + 1,
      users: JSON.stringify(roomUsers),
      name: roomName,
      messages: JSON.stringify([]),
      type: isPrivate ? 0 : 1,
    });

    let userSockets = [];

    if (isPrivate) {
      userSockets = await Promise.all(
        users.map(async (u) => {
          const user = await client.hGetAll(`user:${u}`);
          if (JSON.stringify(user) != "{}") {
            const rooms = JSON.parse(user.rooms);
            rooms.push(allRooms.length + 1);
            await client.hSet(`user:${u}`, "rooms", JSON.stringify(rooms));
            const userSocket = await client.get(`sockets:${u}`);

            return userSocket
              ? { user: user.username, socket: userSocket }
              : null;
          }

          return null;
        })
      );

      userSockets = userSockets.filter((socket) => socket !== null);
    } else {
      const allUsers = await client.keys("user:*");
      if (allUsers.length > 0) {
        userSockets = await Promise.all(
          allUsers.map(async (u) => {
            const user = await client.hGetAll(u);
            if (JSON.stringify(user) != "{}") {
              const rooms = JSON.parse(user.rooms);
              rooms.push(allRooms.length + 1);
              await client.hSet(u, "rooms", JSON.stringify(rooms));
              const userSocket = await client.get(`sockets:${user.username}`);

              return userSocket
                ? { user: user.username, socket: userSocket }
                : null;
            }

            return null;
          })
        );

        userSockets = userSockets.filter((socket) => socket !== null);
      }
    }

    socket.join(roomName);
    let roomTitle = roomName
      .replace("room-", "")
      .replace(`-${socket.handshake.auth.user}`, "")
      .replace(`${socket.handshake.auth.user}-`, "");
    roomTitle = roomTitle.replaceAll("-", ", ");

    socket.emit("room-created", allRooms.length + 1, roomName, roomTitle);

    userSockets?.map((us) => {
      let roomTitleNotify = roomName
        .replace("room-", "")
        .replace(`-${us.user}`, "")
        .replace(`${us.user}-`, "");
      roomTitleNotify = roomTitleNotify.replaceAll("-", ", ");
      if (isPrivate) roomTitleNotify = `${roomTitleNotify} (priv)`;

      io.to(us.socket).emit(
        "room-created-notify",
        allRooms.length + 1,
        roomName,
        roomTitleNotify
      );

      io.to(us.socket).emit("active-user", roomCreator);
    });
  });

  socket.on("join-room", async (roomId, username) => {
    allRooms = await client.keys("rooms:*");
    allRooms = allRooms?.filter((r) => r !== `rooms:${roomId}`);
    const room = await client.hGetAll(`rooms:${roomId}`);
    if (JSON.stringify(room) != "{}") {
      let users = [];
      let newName = "";
      let isFirstJoin = false;
      if (!room.name.includes(`${username}`)) {
        newName = `${room.name}-${username}`;
        users = JSON.parse(room.users);
        users.push({ username: username, joined: new Date() });
        isFirstJoin = true;
      } else {
        users = JSON.parse(room.users);
        const roomUserIndex = users.findIndex((ru) => ru.username == username);
        if (users[roomUserIndex].joined == "") {
          users[roomUserIndex].joined = new Date();
          isFirstJoin = true;
        }
      }

      await client.hSet(`rooms:${roomId}`, "users", JSON.stringify(users));
      if (newName.length > 0) {
        await client.hSet(`rooms:${roomId}`, "name", newName);
      }
      socket.join(room.name);
      let roomTitle = room.name
        .replace("room-", "")
        .replace(`-${username}`, "")
        .replace(`${username}-`, "");
      roomTitle = roomTitle.replaceAll("-", ", ");

      let newUserMessages = [];
      //tried the "recent messages for new users" logic
      if (
        isFirstJoin &&
        JSON.parse(room.users).length > 3 &&
        JSON.parse(room.messages).length > 5
      ) {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 1000);

        newUserMessages = JSON.parse(room.messages);
        newUserMessages = newUserMessages.filter((x) => {
          const messageTime = new Date(x.timestamp);
          return messageTime > oneHourAgo;
        });
      }
      socket.emit("room-joined", roomId, roomTitle, JSON.parse(room.messages));

      const roomUsers = JSON.parse(room.users);
      if (roomUsers && roomUsers.length > 0) {
        let sockets = await Promise.all(
          roomUsers.map(async (roomUser) => {
            const userSocket = await client.get(`sockets:${roomUser.username}`);
            if (userSocket != null) {
              return { user: roomUser.username, socket: userSocket };
            }
          })
        );

        sockets = sockets.filter(
          (socket) => socket != null && socket != undefined
        );
        sockets?.map((s) => {
          let roomTitleNotify = room.name
            .replace("room-", "")
            .replace(`-${s.user}`, "")
            .replace(`${s.user}-`, "");
          roomTitleNotify = roomTitleNotify.replaceAll("-", ", ");
          if (+room.type == 0) roomTitleNotify = `${roomTitleNotify} (priv)`;
          io.to(s.socket).emit("active-user", username);
          io.to(s.socket).emit(
            "new-user-joined-room",
            roomId,
            room.name,
            roomTitleNotify
          );
        });
      }

      if (allRooms?.length > 0) {
        let rooms = await Promise.all(
          allRooms.map(async (key) => {
            const room = await client.hGetAll(key);
            if (room && Object.keys(room).length > 0) {
              return room.name;
            }

            return null;
          })
        );

        rooms = rooms.filter((room) => room !== null);
        io.to(rooms).emit("user-left-room", username);
      }
    }
  });

  const checkMessageLimit = async (user) => {
    const rateLimitKey = `rate_limit:${user}`;
    const count = await client.incr(rateLimitKey);
    if (count == 1) {
      client.expire(rateLimitKey, LIMIT_DURATION);
    }
    if (count > MESSAGE_LIMIT) {
      socket.emit(
        "rateLimitExceeded",
        "You are sending messages too fast. Please slow down."
      );
      return;
    }
  };

  socket.on("send-message", async (user, roomId, message) => {
    await checkMessageLimit(user);
    const room = await client.hGetAll(`rooms:${roomId}`);
    if (JSON.stringify(room) != "{}") {
      const roomMessages = JSON.parse(room.messages);
      const newMessage = {
        sender: user,
        message: message,
        timestamp: new Date(),
      };

      roomMessages.push(newMessage);
      await client.hSet(
        `rooms:${roomId}`,
        "messages",
        JSON.stringify(roomMessages)
      );

      io.to(room.name).emit("message-sent", roomMessages);
    }
  });

  socket.on("logout-user", async (logoutUser) => {
    const username = logoutUser.replace(/"/g, "");
    const user = await client.hGetAll(`user:${username}`);
    if (user != null) {
      const userRooms = JSON.parse(user.rooms);
      const userRoomNames = await Promise.all(
        userRooms.map(async (userRoom) => {
          const room = await client.hGetAll(`rooms:${userRoom}`);
          if (room != null) {
            return room.name;
          }
        })
      );

      io.to(userRoomNames).emit("user-left-room", username);
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected.");
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log("listening on port", process.env.PORT || 3000);
});
