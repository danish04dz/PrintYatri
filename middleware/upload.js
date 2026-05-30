const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { Readable } = require("stream");

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
// Use memory storage — files held in buffer, then
// streamed directly to Cloudinary v2 API
// ─────────────────────────────────────────────────
const memoryStorage = multer.memoryStorage();

// ─────────────────────────────────────────────────
// File filter — reject non-images
// ─────────────────────────────────────────────────
// NOTE: Android React Native sends images as "application/octet-stream"
// instead of "image/jpeg" etc., so we fall back to checking the file
// extension when the MIME type is octet-stream.
const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp|gif)$/i;

const fileFilter = (req, file, cb) => {
  const isImageMime = file.mimetype.startsWith("image/");
  const isOctetStream = file.mimetype === "application/octet-stream";
  const hasImageExtension = IMAGE_EXTENSION_RE.test(file.originalname || "");

  if (isImageMime || (isOctetStream && hasImageExtension)) {
    // Normalise the MIME type so Cloudinary receives "image/jpeg" etc.
    if (isOctetStream && hasImageExtension) {
      const ext = file.originalname.split(".").pop().toLowerCase();
      file.mimetype = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    }
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)"), false);
  }
};

const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB

// ─────────────────────────────────────────────────
// Helper: stream a buffer to Cloudinary v2
// ─────────────────────────────────────────────────
function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

// ─────────────────────────────────────────────────
// Middleware factory: wraps multer + cloudinary upload
// ─────────────────────────────────────────────────
function makeUploadMiddleware(fieldName, cloudinaryOptions) {
  const upload = multer({ storage: memoryStorage, fileFilter, limits }).single(fieldName);

  return async (req, res, next) => {
    upload(req, res, async (err) => {
      if (err) return next(err);
      if (!req.file) return next(); // no file uploaded — let route handle it

      try {
        // Build public_id dynamically (same logic as before)
        const publicId =
          typeof cloudinaryOptions.public_id === "function"
            ? cloudinaryOptions.public_id(req, req.file)
            : cloudinaryOptions.public_id;

        const result = await uploadToCloudinary(req.file.buffer, {
          folder: cloudinaryOptions.folder,
          allowed_formats: cloudinaryOptions.allowed_formats || ["jpg", "jpeg", "png", "webp"],
          transformation: cloudinaryOptions.transformation,
          public_id: publicId,
        });

        // Attach Cloudinary result to req.file so controllers can read it
        req.file.cloudinary = result;
        req.file.path = result.secure_url;      // drop-in compat with old storage
        req.file.filename = result.public_id;   // drop-in compat with old storage

        next();
      } catch (uploadErr) {
        next(uploadErr);
      }
    });
  };
}

// ─────────────────────────────────────────────────
// Upload Middlewares (same API surface as before)
// ─────────────────────────────────────────────────

const uploadConductorPhoto = makeUploadMiddleware("photo", {
  folder: "printyatri/conductors",
  allowed_formats: ["jpg", "jpeg", "png", "webp"],
  transformation: [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
  public_id: (req) =>
    `conductor_${req.params.conductorId || String(req.user._id)}_${Date.now()}`,
});

const uploadAgencyLogo = makeUploadMiddleware("logo", {
  folder: "printyatri/agencies",
  allowed_formats: ["jpg", "jpeg", "png", "webp"],
  transformation: [{ width: 500, height: 500, crop: "fill", quality: "auto" }],
  public_id: (req) => `agency_${String(req.user._id)}_${Date.now()}`,
});

const uploadUserPhoto = makeUploadMiddleware("photo", {
  folder: "printyatri/users",
  allowed_formats: ["jpg", "jpeg", "png", "webp"],
  transformation: [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
  public_id: (req) => `user_${String(req.user._id)}_${Date.now()}`,
});

const uploadCompanyImage = makeUploadMiddleware("image", {
  folder: "printyatri/company",
  allowed_formats: ["jpg", "jpeg", "png", "webp"],
  transformation: [{ width: 1000, quality: "auto" }],
  public_id: () => `company_${Date.now()}`,
});

const uploadAdvertiseImage = makeUploadMiddleware("advertise", {
  folder: "printyatri/advertise",
  allowed_formats: ["jpg", "jpeg", "png", "webp"],
  transformation: [{ width: 600, height: 200, crop: "fill", quality: "auto" }],
  public_id: (req) => `advertise_${String(req.user._id)}_${Date.now()}`,
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
  cloudinary, // export for direct delete operations
};
