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
// File filter — accept images from both browser and
// React Native Android (which sends octet-stream).
// ─────────────────────────────────────────────────
const IMAGE_EXTENSION_RE = /\.(jpe?g|png|webp|gif)$/i;

const fileFilter = (req, file, cb) => {
  const isImageMime = file.mimetype.startsWith("image/");
  const isOctetStream = file.mimetype === "application/octet-stream";
  const hasImageExtension = IMAGE_EXTENSION_RE.test(file.originalname || "");

  if (isImageMime || (isOctetStream && hasImageExtension)) {
    // Normalise MIME type so Cloudinary always gets a proper image type
    if (isOctetStream && hasImageExtension) {
      const ext = file.originalname.split(".").pop().toLowerCase();
      file.mimetype = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    }
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)"), false);
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
// Middleware factory: boundary-fix + multer + cloudinary
// ─────────────────────────────────────────────────
function makeUploadMiddleware(fieldName, cloudinaryOptions) {
  const upload = multer({ storage: memoryStorage, fileFilter, limits }).single(fieldName);

  // Return an array of middleware so Express calls them in sequence:
  // [0] fixMultipartBoundary  — patches Content-Type before multer sees it
  // [1] multer single upload  — parses multipart and populates req.file
  // [2] cloudinary uploader   — streams buffer to Cloudinary
  return [
    fixMultipartBoundary,

    (req, res, next) => {
      upload(req, res, (err) => {
        if (err) return next(err);
        next();
      });
    },

    async (req, res, next) => {
      if (!req.file) return next(); // no file — let controller handle the 400

      try {
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

        // Attach Cloudinary result so controllers can read it
        req.file.cloudinary = result;
        req.file.path = result.secure_url;    // drop-in compat
        req.file.filename = result.public_id; // drop-in compat

        next();
      } catch (uploadErr) {
        next(uploadErr);
      }
    },
  ];
}

// ─────────────────────────────────────────────────
// Upload Middlewares
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
  cloudinary,
};
