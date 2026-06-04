const http = require("http");
const fs = require("fs");
const path = require("path");

// Create a dummy JPEG file
const filePath = path.join(__dirname, "test_file.jpg");
fs.writeFileSync(filePath, "dummy jpeg content");

console.log("Created dummy file:", filePath);

// Construct multipart body manually to avoid external dependencies
const boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW";
const filename = "test_file.jpg";
const fieldname = "logo";
const mimeType = "image/jpeg";

const header = `--${boundary}\r\n` +
               `Content-Disposition: form-data; name="${fieldname}"; filename="${filename}"\r\n` +
               `Content-Type: ${mimeType}\r\n\r\n`;

const footer = `\r\n--${boundary}--\r\n`;

const fileData = fs.readFileSync(filePath);
const body = Buffer.concat([
  Buffer.from(header, "utf-8"),
  fileData,
  Buffer.from(footer, "utf-8")
]);

console.log("Sending POST request to http://localhost:5000/api/test-upload-logo...");

const req = http.request({
  host: "localhost",
  port: 5000,
  path: "/api/test-upload-logo",
  method: "POST",
  headers: {
    "Content-Type": `multipart/form-data; boundary=${boundary}`,
    "Content-Length": body.length
  }
}, (res) => {
  let responseData = "";
  res.on("data", (chunk) => { responseData += chunk; });
  res.on("end", () => {
    console.log("Status Code:", res.statusCode);
    console.log("Response Body:", responseData);
    
    // Clean up
    try { fs.unlinkSync(filePath); } catch (e) {}
    process.exit(res.statusCode === 200 ? 0 : 1);
  });
});

req.on("error", (err) => {
  console.error("Request Error:", err);
  try { fs.unlinkSync(filePath); } catch (e) {}
  process.exit(1);
});

req.write(body);
req.end();
