const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();

app.use(express.json()); //for parsing application/json

//secret key for sign jwt
const secretKey = process.env.mySecretKey;
//for 2 days in sec
const maxTime = 3 * 24 * 60 * 60;
//create token for the given user
const generateToken = (userHandle) => {
  return jwt.sign({ userHandle }, secretKey, { expiresIn: maxTime });
};

//middleware to validate JWT
const authenticateToken = (req, res, next) => {
  //get authorization header from rqst
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    //if no header respond 401
    return res.sendStatus(401);
  }
  //extract the token from bearer
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.sendStatus(401);
  }
  //verify token
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.sendStatus(401);
    }
    //attach user info to rqst obj
    req.user = user;
    next();
  });
};

//get request to fetch highscore
app.get("/high-scores", (req, res) => {
  //get level query parameter
  const level = req.query.level;
  //get page query parameter and the default value is one
  const page = parseInt(req.query.page) || 1;
  //set 20 number of items per page
  const pageSize = 20;
  console.log("level:", level);
  console.log("page: ", page);

  if (!level || typeof level !== "string") {
    return res
      .status(400)
      .send("Missing or invalid required query parameter: level");
  }
  //ensure highScores is an array before filtering
  if (!Array.isArray(highScores)) {
    return res.status(500).send("Server error: highScores data is missing.");
  }

  //filter high scores by level
  const scoresByLevel = highScores.filter((score) => score.level === level);

  //if no scores found for the level, return an empty array
  if (scoresByLevel.length === 0) {
    return res.status(200).json([]);
  }

  // Sort the scores in descending order based on the score property
  const sortedScores = scoresByLevel.sort((a, b) => b.score - a.score);
  const paginatedScores = sortedScores.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  console.log("sorted Score:", sortedScores);

  res.status(200).json(paginatedScores);
  console.log("paginated scores:", paginatedScores);
});

//array to store users
const users = [];

//register new user
app.post("/signup", async (req, res) => {
  //extract userHandle and password from body
  const { userHandle, password } = req.body;
  //if they are not given then send 400
  if (!userHandle || !password) {
    return res
      .status(400)
      .send("Missing required fields: userHandle, password");
  }
  //userHandle should be at least 6 characters long
  if (userHandle.length < 6) {
    return res
      .status(400)
      .send("userHandle should be at least 6 characters long");
  }
  //password should be at least 6 characters long
  if (password.length < 6) {
    return res
      .status(400)
      .send("password should be at least 6 characters long");
  }
  //save user data in array
  users.push({ userHandle, password });
  console.log(users);

  res.status(201).json({
    message: "User registered successfully",
    data: { userHandle, password },
  });
});

//login user
app.post("/login", async (req, res) => {
  const { userHandle, password } = req.body;

  console.log("Login attempt:", { userHandle, password });

  if (!userHandle || !password) {
    return res
      .status(400)
      .send("Missing required fields: userHandle, password");
  }
  if (typeof userHandle !== "string" || typeof password !== "string") {
    return res.status(400).send("userHandle and password must be strings");
  }
  if (userHandle.length < 6) {
    return res
      .status(400)
      .send("userHandle should be at least 6 characters long");
  }
  if (password.length < 6) {
    return res
      .status(400)
      .send("password should be at least 6 characters long");
  }
  //array of allowed fields. only userHandle and password should be present in request body
  const allowedFields = ["userHandle", "password"];
  const extraFields = Object.keys(req.body).filter(
    (field) => !allowedFields.includes(field)
  );
  if (extraFields.length > 0) {
    return res.status(400).send("Request contains additional fields");
  }
  // Log the current state of the users array
  console.log("Current users:", users);

  //check if the user exists in the users array or not
  const user = users.find(
    (user) => user.userHandle === userHandle && user.password === password
  );
  console.log("User found:", user);

  if (!user) {
    return res
      .status(401)
      .send("Incorrect username or password. Please sign up.");
  }
  // Generate token for the user
  const token = generateToken(userHandle);
  res.json({
    jsonWebToken: token,
  });
});


//array to store high scores
const highScores = [];
//post a high score
app.post("/high-scores", authenticateToken, (req, res) => {
  //extract required field from request body
  const { level, userHandle, score, timestamp } = req.body;
  //check if any required fields are missing and return a 400 status
  if (!level || !userHandle || !score || !timestamp) {
    return res
      .status(400)
      .send("Missing required fields: level, userHandle, score, timestamp");
  }
  //save the posted data in highScores array
  highScores.push({ level, userHandle, score, timestamp });
  console.log(highScores);
  res.status(201).json({
    message: "High score posted successfully",
    data: { level, userHandle, score, timestamp },
  });
});

let serverInstance = null;
module.exports = {
  //fun to start the server
  start: function () {
    serverInstance = app.listen(port, () => {
      console.log(`Example app listening at http://localhost:${port}`);
    });
  },
  //function to close the server
  close: function () {
    serverInstance.close();
  },
};

//if this module is the main module, start the server
if (require.main === module) {
  module.exports.start();
}
