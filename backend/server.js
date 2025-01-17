const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 4000; // Change if needed
const SOUND_DIR = path.join(__dirname, "../bot/sounds/");
const JSON_FILE = path.join(__dirname, "../bot/sounds.json");

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

const upload = multer({ storage });

// API Endpoint to Upload an Audio File with Display Name
app.post("/api/upload", upload.single("audio"), (req, res) => {
    const { displayname, uploadedBy } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const allowedTypes = ["audio/mpeg", "audio/wav", "audio/ogg"];
    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only mp3, wav, and ogg are allowed." });
    }

    if (!displayname) {
        return res.status(400).json({ message: "No display name provided" });
    }

    // Update sounds.json
    let sounds = [];
    if (fs.existsSync(JSON_FILE)) {
        sounds = JSON.parse(fs.readFileSync(JSON_FILE));
    }

    const sanitizedFilename = sanitizeFilename(req.file.originalname);

    // Check for duplicate filename
    const duplicateFilename = sounds.find((sound) => sound.filename === sanitizedFilename);
    if (duplicateFilename) {
        return res.status(400).json({ message: "Filename already exists" });
    }

    // Check for duplicate displayname
    const duplicateDisplayname = sounds.find((sound) => sound.displayname.trim() === displayname.trim());
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

    fs.writeFileSync(JSON_FILE, JSON.stringify(sounds, null, 2));

    res.json({ message: "File uploaded successfully", sound: newSound });
});

// API Endpoint to Favorite/Unfavorite a Sound
app.post("/api/sounds/favorite", (req, res) => {
  const { filename, userId, favorite } = req.body;

  if (!filename || !userId || typeof favorite !== "boolean") {
    return res.status(400).json({ message: "Invalid request data" });
  }

  if (!fs.existsSync(JSON_FILE)) {
    return res.status(404).json({ message: "Sounds file not found" });
  }

  const sounds = JSON.parse(fs.readFileSync(JSON_FILE));
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
      sound.favoritedBy = sound.favoritedBy.filter((id) => id !== userId);
    }
  }

  fs.writeFileSync(JSON_FILE, JSON.stringify(sounds, null, 2));

  res.json({ message: "Sound favorite status updated", sound });
});

// API Endpoint to Get Sounds List
app.get("/api/sounds", (req, res) => {
  if (fs.existsSync(JSON_FILE)) {
    const sounds = JSON.parse(fs.readFileSync(JSON_FILE));
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
