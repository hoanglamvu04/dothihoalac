import { v2 as cloudinary } from "cloudinary";

if (!process.env.CLOUDINARY_URL) {
  throw new Error("CLOUDINARY_URL is not configured");
}

// Cloudinary tự đọc CLOUDINARY_URL từ process.env.
cloudinary.config({
  secure: true,
});

export default cloudinary;