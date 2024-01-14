const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

app.use(express.json());

const secret = "SEcr3t";

const authenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, secret, (err, user) => {
      if (err) {
        res.status(403).json({ message: "Something went wrong in jwt verify" });
      } else {
        req.user = user;
        next();
      }
    });
  }
};

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  purchasedCourse: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
});

const adminSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  published: Boolean,
});

const User = mongoose.model("User", userSchema);
const Admin = mongoose.model("Admin", adminSchema);
const Course = mongoose.model("Course", courseSchema);

try {
  mongoose.connect(
    "mongodb+srv://<your username>:<Your Password>@cluster0.kah3sg2.mongodb.net/<database name>"
  );
  console.log("Connected to mongoDB");
} catch (error) {
  console.log(
    "Something went wrong while connecting to the database, " + error
  );
}

app.post("/admin/signup", async (req, res) => {
  const { username, password } = req.body;
  const existingAdmin = await Admin.findOne({ username });
  if (existingAdmin) {
    res.status(403).json({ message: "User already exist" });
  } else {
    const newAdmin = new Admin({ username, password });
    await newAdmin.save();
    res.json({ message: "Admin created successfully" });
  }
});

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username, password });
  if (admin) {
    const token = jwt.sign({ username, role: "admin" }, secret, {
      expiresIn: "1h",
    });
    res
      .status(201)
      .json({ message: "Admin logged in successfully", admintoken: token });
  } else {
    res.json({ message: "Admin does not exist" });
  }
});

app.post("/admin/course", authenticateJwt, async (req, res) => {
  const course = new Course(req.body);
  await course.save();
  res.json({ message: "course created successfully", courseId: course.id });
});

app.put("/admin/course/:courseId", authenticateJwt, async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.courseId, req.body, {
    new: true,
  });
  if (course) {
    res.status(200).json({ message: "Course created successfully" });
  } else {
    res.status(404).json({ message: "course not found" });
  }
});

app.get("/admin/course", authenticateJwt, async (req, res) => {
  const course = await Course.find({});
  res.json({ course });
});

app.post("/user/signup", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user) {
    res.status(403).json({ message: "User already exist" });
  } else {
    const newUser = new User({ username, password });
    await newUser.save();
    res.status(201).json({ message: "user created successfully" });
  }
});

app.post("/user/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    const token = jwt.sign({ username, role: "user" }, secret, {
      expiresIn: "1h",
    });
    res.json({ message: "User logged in successfully", token });
  } else {
    res.status(404).json({ message: "user not found" });
  }
});

app.get("/user/course", authenticateJwt, async (req, res) => {
  const course = await Course.find({ published: true });
  res.json({ course });
});

app.post("/user/course/:courseId", authenticateJwt, async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (course) {
    const user = await User.findOne({ username: req.user.username });
    if (user) {
      user.purchasedCourse.push(course);
      await user.save();
      res.json({ message: "Course purchased successfully" });
    } else {
      res.status(404).json({ message: "User does not found" });
    }
  } else {
    res.status(404).json({ message: "course not found" });
  }
});

app.get("/user/purchasedcourse", authenticateJwt, async (req, res) => {
  const user = await User.findOne({ username: req.user.username }).populate(
    "purchasedCourse"
  );
  if (user) {
    res.json({ purchasedCourse: user.purchasedCourse || [] });
  } else {
    res.status(404).json({ message: "User does not found" });
  }
});

app.listen(3000, () => {
  console.log("App running on port " + 3000);
});
