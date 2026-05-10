const express = require("express");
const router = express.Router();
const { verifyJWT, isAdmin } = require("../middleware/auth");
const { uploadCompanyImage } = require("../middleware/upload");

const blogController = require("../controllers/blog.controller");
const jobController = require("../controllers/job.controller");
const teamController = require("../controllers/team.controller");

// ─── Public Routes ───────────────────────────────
router.get("/blogs", blogController.getBlogs);
router.get("/jobs", jobController.getJobs);
router.get("/team", teamController.getTeam);

// ─── Admin Protected Routes ──────────────────────
// Image Upload Utility
router.post("/upload", verifyJWT, isAdmin, uploadCompanyImage, (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  res.json({ url: req.file.path });
});
// Blogs
router.post("/blogs", verifyJWT, isAdmin, blogController.createBlog);
router.put("/blogs/:id", verifyJWT, isAdmin, blogController.updateBlog);
router.delete("/blogs/:id", verifyJWT, isAdmin, blogController.deleteBlog);

// Jobs
router.post("/jobs", verifyJWT, isAdmin, jobController.createJob);
router.put("/jobs/:id", verifyJWT, isAdmin, jobController.updateJob);
router.delete("/jobs/:id", verifyJWT, isAdmin, jobController.deleteJob);

// Team
router.post("/team", verifyJWT, isAdmin, teamController.createTeamMember);
router.put("/team/:id", verifyJWT, isAdmin, teamController.updateTeamMember);
router.delete("/team/:id", verifyJWT, isAdmin, teamController.deleteTeamMember);

module.exports = router;
