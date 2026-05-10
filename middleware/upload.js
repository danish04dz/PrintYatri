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

// ─────────────────────────────────────────────────
// Allowed file types
// ─────────────────────────────────────────────────
const allowedFormats = ["jpg", "jpeg", "png", "webp"];

// ─────────────────────────────────────────────────
// Storage: Conductor Profile Photos
// ─────────────────────────────────────────────────
const conductorStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "printyatri/conductors",
    allowed_formats: allowedFormats,
    transformation: [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
    public_id: (req, file) =>
      `conductor_${req.params.id || req.user._id}_${Date.now()}`,
  },
});

// ─────────────────────────────────────────────────
// Storage: Agency Logo / Owner Photo
// ─────────────────────────────────────────────────
const agencyStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "printyatri/agencies",
    allowed_formats: allowedFormats,
    transformation: [{ width: 500, height: 500, crop: "fill", quality: "auto" }],
    public_id: (req, file) =>
      `agency_${req.user._id}_${Date.now()}`,
  },
});

// ─────────────────────────────────────────────────
// Storage: User Self-Upload (conductor own photo)
// ─────────────────────────────────────────────────
const userStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "printyatri/users",
    allowed_formats: allowedFormats,
    transformation: [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
    public_id: (req, file) => `user_${req.user._id}_${Date.now()}`,
  },
});

// ─────────────────────────────────────────────────
// Storage: Company Assets (Blogs, Team)
// ─────────────────────────────────────────────────
const companyStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "printyatri/company",
    allowed_formats: allowedFormats,
    transformation: [{ width: 1000, quality: "auto" }],
    public_id: (req, file) => `company_${Date.now()}`,
  },
});

// ─────────────────────────────────────────────────
// Storage: Local Shop Advertisement (on ticket bottom)
// ─────────────────────────────────────────────────
const advertiseStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "printyatri/advertise",
    allowed_formats: allowedFormats,
    transformation: [{ width: 600, height: 200, crop: "fill", quality: "auto" }],
    public_id: (req, file) => `advertise_${req.user._id}_${Date.now()}`,
  },
});

// ─────────────────────────────────────────────────
// File filter — reject non-images
// ─────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)"), false);
  }
};

// ─────────────────────────────────────────────────
// Multer instances
// ─────────────────────────────────────────────────
const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB

const uploadConductorPhoto = multer({
  storage: conductorStorage,
  fileFilter,
  limits,
}).single("photo");

const uploadAgencyLogo = multer({
  storage: agencyStorage,
  fileFilter,
  limits,
}).single("logo");

const uploadUserPhoto = multer({
  storage: userStorage,
  fileFilter,
  limits,
}).single("photo");

const uploadCompanyImage = multer({
  storage: companyStorage,
  fileFilter,
  limits,
}).single("image");

const uploadAdvertiseImage = multer({
  storage: advertiseStorage,
  fileFilter,
  limits,
}).single("advertise");

// ─────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────
module.exports = {
  uploadConductorPhoto,
  uploadAgencyLogo,
  uploadUserPhoto,
  uploadCompanyImage,
  uploadAdvertiseImage,
  cloudinary, // export for direct delete operations
};
