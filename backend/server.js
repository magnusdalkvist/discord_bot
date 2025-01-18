const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.use(express.json({ limit: "1mb" }));
const PORT = 4000; // Change if needed
const SOUND_DIR = path.join(__dirname, "../bot/sounds/");
const SOUNDS_FILE = path.join(__dirname, "../bot/sounds.json");
const USERS_FILE = path.join(__dirname, "../bot/users.json");

// Enable CORS
app.use(cors());
app.use(express.json());

// Ensure the sounds directory exists
if (!fs.existsSync(SOUND_DIR)) {
  fs.mkdirSync(SOUND_DIR, { recursive: true });
}

// Function to sanitize filenames
const sanitizeFilename = (filename) => {
  return filename.trim().replace(/[^a-zA-Z0-9.-]/g, "_");
};

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: SOUND_DIR,
  filename: (req, file, cb) => {
    const sanitizedFilename = sanitizeFilename(file.originalname);
    cb(null, sanitizedFilename);
  },
});

const upload = multer({ storage, limits: { fileSize: 1 * 1024 * 1024 } });

// API Endpoint to Upload an Audio File with Display Name
app.post("/api/upload", upload.single("audio"), (req, res) => {
  const { displayname, uploadedBy } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const allowedTypes = ["audio/mpeg", "audio/wav", "audio/ogg"];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res
      .status(400)
      .json({ message: "Invalid file type. Only mp3, wav, and ogg are allowed." });
  }

  if (!displayname) {
    return res.status(400).json({ message: "No display name provided" });
  }

  // Update sounds.json
  let sounds = [];
  if (fs.existsSync(SOUNDS_FILE)) {
    sounds = JSON.parse(fs.readFileSync(SOUNDS_FILE));
  }

  const sanitizedFilename = sanitizeFilename(req.file.originalname);

  // Check for duplicate filename
  const duplicateFilename = sounds.find((sound) => sound.filename === sanitizedFilename);
  if (duplicateFilename) {
    return res.status(400).json({ message: "Filename already exists" });
  }

  // Check for duplicate displayname
  const duplicateDisplayname = sounds.find(
    (sound) => sound.displayname.trim() === displayname.trim()
  );
  if (duplicateDisplayname) {
    return res.status(400).json({ message: "Display name already exists" });
  }

  const newSound = {
    filename: sanitizedFilename,
    displayname: displayname,
    category: "default",
    favorite: false,
    uploadedBy: JSON.parse(uploadedBy),
  };
  sounds.push(newSound);

  fs.writeFileSync(SOUNDS_FILE, JSON.stringify(sounds, null, 2));

  res.json({ message: "File uploaded successfully", sound: newSound });
});

// API Endpoint to Favorite/Unfavorite a Sound
app.post("/api/sounds/favorite", (req, res) => {
  const { filename, userId, favorite } = req.body;

  if (!filename || !userId || typeof favorite !== "boolean") {
    return res.status(400).json({ message: "Invalid request data" });
  }

  if (!fs.existsSync(SOUNDS_FILE)) {
    return res.status(404).json({ message: "Sounds file not found" });
  }

  const sounds = JSON.parse(fs.readFileSync(SOUNDS_FILE));
  const sound = sounds.find((sound) => sound.filename === filename);

  if (!sound) {
    return res.status(404).json({ message: "Sound not found" });
  }

  fs.writeFileSync(SOUNDS_FILE, JSON.stringify(sounds, null, 2));

  res.json({ message: "Sound favorite status updated", sound });
});

// API Endpoint to set a Sound as Entrance Sound
app.post("/api/sounds/entrance", (req, res) => {
  const { filename, userId } = req.body;

  if (!filename || !userId) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  if (!fs.existsSync(SOUNDS_FILE)) {
    return res.status(404).json({ message: "Sounds file not found" });
  }

  const sounds = JSON.parse(fs.readFileSync(SOUNDS_FILE));
  const sound = sounds.find((sound) => sound.filename === filename);

  if (!sound) {
    return res.status(404).json({ message: "Sound not found" });
  }

  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  const user = users.find((user) => user.id === userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // check if user is in users.json. If not, add user. If yes, update users entrance sound to filename
  const userIndex = users.findIndex((user) => user.id === userId);
  if (userIndex === -1) {
    users.push({ id: userId, entrance_sound: filename });
  } else {
    if (users[userIndex].entrance_sound === filename) {
      users[userIndex].entrance_sound = null;
    } else {
      users[userIndex].entrance_sound = filename;
    }
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  res.json({ message: "Entrance sound updated", sound });
});

app.get("/api/sounds/entrance", (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "Invalid request data" });
  }

  if (!fs.existsSync(USERS_FILE)) {
    return res.status(404).json({ message: "Users file not found" });
  }

  const users = JSON.parse(fs.readFileSync(USERS_FILE));
  const user = users.find((user) => user.id === userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ entrance_sound: user.entrance_sound });
});

// API Endpoint to Get Sounds List
app.get("/api/sounds", (req, res) => {
  if (fs.existsSync(SOUNDS_FILE)) {
    const sounds = JSON.parse(fs.readFileSync(SOUNDS_FILE));
    res.json(sounds);
  } else {
    res.json([]);
  }
});

// API Endpoint to Get Sound File
app.get("/api/sounds/:filename", (req, res) => {
  const soundPath = path.join(SOUND_DIR, req.params.filename);
  if (fs.existsSync(soundPath)) {
    res.sendFile(soundPath);
  } else {
    res.status(404).json({ message: "File not found" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
