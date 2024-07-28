require("dotenv").config();
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
const jwtoken = require("jsonwebtoken");
var { expressjwt: jwt } = require("express-jwt");

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: "POST,GET,PUT,OPTIONS,DELETE",
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let client = null;
async function connect() {
  client = await createClient()
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

  await client.hSet(`user:${username}`, {
    username: username,
    password: hashedPassword,
  });

  return res.status(200).send({ message: "User registered successfully!" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await client.hGetAll(`user:${username}`);
  if (JSON.stringify(user) == "{}") {
    return res.status(500).send({ message: "User not found" });
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (err) {
      return res.status(500).send("Error comparing passwords:");
    }

    if (!result) {
      return res.status(401).send("Invalid password");
    }

    const token = jwtoken.sign({}, process.env.JWT_SECRET, {
      algorithm: "HS256",
      expiresIn: 3600,
      subject: user.username,
    });

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
    res.status(200).json({ message: "You are now on the home page." });
  }
);

io.on("connection", (socket) => {
  console.log("a user connected");
});

http.listen(process.env.PORT || 3000, () => {
  console.log("listening on port", process.env.PORT);
});
