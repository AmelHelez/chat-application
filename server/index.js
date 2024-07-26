const app = require("express")();
const http = require("http").createServer(app);
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const { createClient } = require("redis");
const io = require("socket.io")(http, {
  cors: {
    origins: ["https://localhost:4200"],
  },
});
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: "POST,GET,PUT,OPTIONS,DELETE"
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = createClient();
client.on("error", (err) => console.log("Redis not started.."));
console.log("Connected");
client.connect();

// const users = {};

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  // console.log("Hashed: ", hashedPassword);
  client.hSet(
    `user:${username}`,
    {
      username: username,
      password: hashedPassword,
    },
    (err, res) => {
      if (err) {
        console.error("Error storing user in Redis:", err);
        return res.status(400).json({ message: "Cannot create user" });
      } else {
        console.log(`User ${username} stored successfully!`);
        return res.status(200).json({ message: "User registered successfully" });
      }
    }
  );
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  try {
    verifyUser(username, password, (err, authenticated) => {
      console.log("ERR: ", err);
      console.log("Authenticated: ", authenticated);
      if (err) throw err;
      if (authenticated) {
        console.log("User login successful");
      } else {
        console.log("User login failed");
      }
    });
  } catch (e) {
    console.log("Error");
  }
  // const user = users[username];
  // checkPassword(password, saltRounds);
  // if (!user || user.password !== password) {
  //   return res.status(400).json({ message: "Invalid credentials" });
  // }
  // req.session.username = username;
  // res.status(200).json({ message: "User logged in successfully" });
});

function checkPassword(password, saltRounds) {
  bcrypt
    .hash(password, saltRounds)
    .then((hash) => {
      userHash = hash;
      console.log("Hash ", hash);
      validateUser(hash);
    })
    .catch((err) => console.error(err.message));

  function validateUser(hash) {
    bcrypt
      .compare(password, hash)
      .then((res) => {
        console.log("They are correct!");
        console.log(res); // return true
      })
      .catch((err) => console.error(err.message));
  }
}

function verifyUser(username, password, callback) {
  client.hGetAll(`user:${username}`, (err, user) => {
    console.log("GET ALL");
    if (err) {
      console.error("Error retrieving user from Redis:", err);
      callback(err, null);
      return;
    }

    if (!user) {
      console.log("User not found");
      callback(null, false);
      return;
    }

    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        console.error("Error comparing passwords:", err);
        callback(err, null);
        return;
      }

      if (result) {
        console.log("User authenticated successfully");
        callback(null, true);
      } else {
        console.log("Password incorrect");
        callback(null, false);
      }
    });
  });
}

app.get("/", (req, res) => {
  res.send("<h1>Hey Socket.io</h1>");
});

io.on("connection", (socket) => {
  // let token = socket.handshake.auth.token;
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("my message", (msg) => {
    io.emit("my broadcast", `server: ${msg}`);
  });
});

http.listen(3000, () => {
  console.log("listening on port 3000");
});
