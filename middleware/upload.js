const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// ─────────────────────────────────────────────────
// Cloudinary Configuration
// ─────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Allowed file types & MIME types
const allowFormats = ["jpg", "jpeg", "png", "webp"];

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg", // Support React Native's manual image/jpg type resolution
  "image/png",
  "image/webp",
  "image/gif",
  "application/octet-stream", // Allow React Native octet-stream fallback
];

const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp|gif)$/i;

// ─────────────────────────────────────────────────
// File filter — accept images from both browser and
// React Native Android (which sends octet-stream).
// ─────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const isImageMime = allowedMimeTypes.includes(file.mimetype);
  const isOctetStream = file.mimetype === "application/octet-stream";
  const hasImageExtension = IMAGE_EXTENSION_RE.test(file.originalname || "");

  if (isImageMime || (isOctetStream && hasImageExtension)) {
    // Normalise MIME type so Cloudinary always gets a proper image type
    if (isOctetStream && hasImageExtension) {
      const ext = file.originalname.split(".").pop().toLowerCase();
      file.mimetype = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    } else if (file.mimetype === "image/jpg") {
      file.mimetype = "image/jpeg";
    }
    cb(null, true);
  } else {
    cb(new Error("Only jpg, png, jpeg, webp allowed"), false);
  }
};

const limits = { fileSize: 5 * 1024 * 1024 }; // 5 MB

// ─────────────────────────────────────────────────
// Simple and clean createUploader factory
// ─────────────────────────────────────────────────
const createUploader = (folderName, fieldName, options = {}) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `printyatri/${folderName}`,
      allowed_formats: allowFormats,
      transformation: options.transformation || [{ width: 500, height: 500, crop: "fill", quality: "auto" }],
      public_id: (req, file) => {
        const publicId = typeof options.publicIdResolver === "function"
          ? options.publicIdResolver(req, file)
          : `${folderName}_${Date.now()}_${file.originalname ? file.originalname.split(".")[0] : "image"}`;
        
        // Sanitize to prevent spaces or special characters in Cloudinary public_id
        return publicId.replace(/[^a-zA-Z0-9_\-]/g, "_");
      },
    },
  });

  const upload = multer({
    storage,
    limits,
    fileFilter,
  }).single(fieldName);

  // Return middleware that parses the upload and formats req.file for backward compatibility
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        console.error(`❌ Upload Error for field [${fieldName}]:`, err);
        return next(err);
      }
      
      if (req.file) {
        // Provide backward compatibility with controllers expecting the raw cloudinary result shape
        req.file.cloudinary = {
          secure_url: req.file.path,
          public_id: req.file.filename,
        };
      }
      next();
    });
  };
};

// ─────────────────────────────────────────────────
// Upload Middlewares
// ─────────────────────────────────────────────────

const uploadConductorPhoto = createUploader("conductors", "photo", {
  transformation: [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
  publicIdResolver: (req) =>
    `conductor_${req.params.conductorId || String(req.user._id)}_${Date.now()}`,
});

const uploadAgencyLogo = createUploader("agencies", "logo", {
  transformation: [{ width: 500, height: 500, crop: "fill", quality: "auto" }],
  publicIdResolver: (req) => `agency_${String(req.user._id)}_${Date.now()}`,
});

const uploadUserPhoto = createUploader("users", "photo", {
  transformation: [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
  publicIdResolver: (req) => `user_${String(req.user._id)}_${Date.now()}`,
});

const uploadCompanyImage = createUploader("company", "image", {
  transformation: [{ width: 1000, quality: "auto" }],
  publicIdResolver: () => `company_${Date.now()}`,
});

const uploadAdvertiseImage = createUploader("advertise", "advertise", {
  transformation: [{ width: 600, height: 200, crop: "fill", quality: "auto" }],
  publicIdResolver: (req) => `advertise_${String(req.user._id)}_${Date.now()}`,
});

// ─────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────
module.exports = {
  uploadConductorPhoto,
  uploadAgencyLogo,
  uploadUserPhoto,
  uploadCompanyImage,
  uploadAdvertiseImage,
  cloudinary,
};
