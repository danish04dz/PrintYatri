const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
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
// fixMultipartBoundary
//
// ROOT CAUSE of React Native upload failures:
//
// The React Native client sets:
//   headers: { "Content-Type": "multipart/form-data" }
//
// Axios passes that header as-is to React Native's XHR.
// React Native XHR adds the boundary to the actual byte-stream
// but does NOT update the Content-Type header string — so the
// server receives:
//   Content-Type: multipart/form-data          ← no boundary!
//
// Multer v2 uses the `type-is` package which checks the
// Content-Type header. When it sees "multipart/form-data"
// WITHOUT a boundary it treats the request as non-multipart
// and skips processing entirely → req.file stays undefined
// → controller returns "No image provided".
//
// Fix: peek at the first chunk of the raw body, extract the
// real boundary string (e.g. --abc123), and patch the header
// BEFORE multer runs.  This is safe because we re-assemble
// the stream from the buffered chunk + the rest of the socket.
// ─────────────────────────────────────────────────
function fixMultipartBoundary(req, res, next) {
  const contentType = req.headers["content-type"] || "";

  // Only patch when the header says multipart but has no boundary
  const isMultipart = contentType.includes("multipart/form-data");
  const hasBoundary = contentType.includes("boundary=");

  if (!isMultipart || hasBoundary) {
    return next(); // header is already correct — nothing to do
  }

  // Read the first chunk to detect the boundary line
  // A multipart body always starts with "--<boundary>\r\n"
  let firstChunk = null;

  req.once("data", (chunk) => {
    firstChunk = chunk;

    // The boundary is the content of the first line minus the leading "--"
    const firstLine = chunk.toString("latin1").split("\r\n")[0];
    if (firstLine.startsWith("--")) {
      const boundary = firstLine.slice(2); // strip "--"
      req.headers["content-type"] = `multipart/form-data; boundary=${boundary}`;
    }

    // Re-assemble the stream: push the buffered chunk back, then continue
    const readable = new Readable({
      read() {},
    });
    readable.push(firstChunk);

    // Pipe remaining data from the original request into our new readable
    req.on("data", (d) => readable.push(d));
    req.on("end", () => readable.push(null));
    req.on("error", (e) => readable.destroy(e));

    // Replace req's stream interface so multer reads from our rebuilt stream
    req.pipe = readable.pipe.bind(readable);
    req.on = readable.on.bind(readable);
    req.once = readable.once.bind(readable);
    req.resume = readable.resume.bind(readable);
    req.unpipe = readable.unpipe.bind(readable);
    req.readable = true;

    next();
  });

  req.once("error", next);

  // If the request ends before any data (empty body), just continue
  req.once("end", () => {
    if (!firstChunk) next();
  });
}

// ─────────────────────────────────────────────────
// Simple and clean createUploader factory
// ─────────────────────────────────────────────────
const createUploader = (folderName, fieldName, options = {}) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      // Resolve custom public_id callback or default fallback pattern
      const publicId = typeof options.publicIdResolver === "function"
        ? options.publicIdResolver(req, file)
        : `${folderName}_${Date.now()}_${file.originalname ? file.originalname.split(".")[0] : "image"}`;

      return {
        folder: `printyatri/${folderName}`,
        allowed_formats: allowFormats,
        transformation: options.transformation || [{ width: 500, height: 500, crop: "fill", quality: "auto" }],
        public_id: publicId,
      };
    },
  });

  const upload = multer({
    storage,
    limits,
    fileFilter,
  }).single(fieldName);

  // Return a middleware array so that fixMultipartBoundary patches the headers before multer parses it
  return [
    fixMultipartBoundary,
    (req, res, next) => {
      upload(req, res, (err) => {
        if (err) return next(err);
        
        if (req.file) {
          // Provide backward compatibility with controllers expecting the raw cloudinary result shape
          req.file.cloudinary = {
            secure_url: req.file.path,
            public_id: req.file.filename,
          };
        }
        next();
      });
    },
  ];
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
