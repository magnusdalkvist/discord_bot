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
const LOGS_FILE = path.join(__dirname, "../bot/logs.json");

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

// API Endpoint to Upload an Audio File with Display Name
app.post("/api/sounds/upload", upload.single("audio"), (req, res) => {
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
    return res.status(400).json({ message: "No name provided" });
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
    return res.status(400).json({ message: "Name already exists" });
  }

  const newSound = {
    filename: sanitizedFilename,
    displayname: displayname,
    category: "default",
    uploadedBy: JSON.parse(uploadedBy),
  };
  sounds.push(newSound);

  fs.writeFileSync(SOUNDS_FILE, JSON.stringify(sounds, null, 2));

  res.json({ message: "File uploaded successfully", sound: newSound });
});

// API Endpoint to Delete an Audio File
app.delete("/api/sounds/:filename", (req, res) => {
  const { filename } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "No user id provided" });
  }

  if (!filename) {
    return res.status(400).json({ message: "No filename provided" });
  }

  if (!fs.existsSync(SOUNDS_FILE)) {
    return res.status(404).json({ message: "Sounds file not found" });
  }

  const sounds = JSON.parse(fs.readFileSync(SOUNDS_FILE));
  const soundIndex = sounds.findIndex((sound) => sound.filename === filename);

  if (soundIndex === -1) {
    return res.status(404).json({ message: "Sound not found" });
  }

  if (sounds[soundIndex].uploadedBy.id !== userId) {
    return res.status(403).json({ message: "You are not authorized to delete this file" });
  }

  sounds.splice(soundIndex, 1);
  fs.writeFileSync(SOUNDS_FILE, JSON.stringify(sounds, null, 2));

  const soundPath = path.join(SOUND_DIR, filename);
  if (fs.existsSync(soundPath)) {
    fs.unlinkSync(soundPath);
  }

  res.json({ message: "File deleted successfully" });
});

// API Endpoint to Edit Sound
app.put("/api/sounds/:filename", upload.none(), (req, res) => {
  const { filename } = req.params;
  const { displayname, category, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "No user id provided" });
  }

  if (!filename) {
    return res.status(400).json({ message: "No filename provided" });
  }

  if (!displayname && !category) {
    return res.status(400).json({ message: "No data provided to update" });
  }

  if (!fs.existsSync(SOUNDS_FILE)) {
    return res.status(404).json({ message: "Sounds file not found" });
  }

  const sounds = JSON.parse(fs.readFileSync(SOUNDS_FILE));
  const sound = sounds.find((sound) => sound.filename === filename);

  if (!sound) {
    return res.status(404).json({ message: "Sound not found" });
  }

  if (sound.uploadedBy.id !== userId) {
    return res.status(403).json({ message: "You are not authorized to update this file" });
  }

  if (displayname) {
    sound.displayname = displayname;
  }

  if (category) {
    sound.category = category;
  }

  fs.writeFileSync(SOUNDS_FILE, JSON.stringify(sounds, null, 2));

  res.json({ message: "Sound updated successfully", sound });
});

// API Endpoint to Favorite/Unfavorite a Sound
app.put(`/api/users/:userId/favorites/:filename`, (req, res) => {
  const { favorite } = req.body;
  const { filename, userId } = req.params;

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

  if (favorite) {
    if (!sound.favoritedBy) {
      sound.favoritedBy = [];
    }
    if (!sound.favoritedBy.includes(userId)) {
      sound.favoritedBy.push(userId);
    }
  } else {
    if (sound.favoritedBy) {
      const index = sound.favoritedBy.indexOf(userId);
      if (index !== -1) {
        sound.favoritedBy.splice(index, 1);
      }
    }
  }

  fs.writeFileSync(SOUNDS_FILE, JSON.stringify(sounds, null, 2));

  res.json({ message: "Sound favorite status updated", sound });
});

// API Endpoint to set a Sound as Entrance Sound
app.put(`/api/users/:userId/entrance`, (req, res) => {
  const { filename } = req.body;
  const { userId } = req.params;

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

// API Endpoint to Get User's Entrance Sound
app.get(`/api/users/:userId/entrance`, (req, res) => {
  const { userId } = req.params;

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

app.get("/api/logs", (req, res) => {
  const logs = JSON.parse(fs.readFileSync(LOGS_FILE));
  res.json(logs);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
