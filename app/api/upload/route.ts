import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configuration
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Interface for Cloudinary upload result
interface CloudinaryUploadResult {
  public_id: string;
  format: string;
  resource_type: "image" | "video" | "raw" | "auto";
  secure_url: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
  original_filename: string;
  tags?: string[];
  folder?: string;
}

// Force Node.js runtime to avoid Vercel Edge issues
export const runtime = "nodejs";

// Constants for validation
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

// Utility function to validate file
const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Invalid file type: ${
        file.type
      }. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`,
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    };
  }
  return { isValid: true };
};

export async function POST(request: NextRequest) {
  try {
    // Validate content-type
    if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("file") as File[];
    const folderName = formData.get("folderName") as string | null;
    const tags =
      formData
        .get("tags")
        ?.toString()
        .split(",")
        .map((tag) => tag.trim()) || [];

    // Validate inputs
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files. Maximum allowed: ${MAX_FILES}` },
        { status: 400 }
      );
    }
    if (!folderName) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    const uploadedFiles: { secure_url: string; public_id: string }[] = [];

    for (const file of files) {
      // Validate file type and size
      const { isValid, error } = validateFile(file);
      if (!isValid) {
        return NextResponse.json({ error }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result = await new Promise<CloudinaryUploadResult>(
        (resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: folderName,
              tags: tags.length > 0 ? tags : undefined,
              resource_type: "image",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as CloudinaryUploadResult);
            }
          );
          uploadStream.end(buffer);
        }
      );

      uploadedFiles.push({
        secure_url: result.secure_url,
        public_id: result.public_id,
      });
    }

    return NextResponse.json(
      {
        message: "Files uploaded successfully",
        files: uploadedFiles,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading files to Cloudinary:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get("public_id");

    if (!publicId) {
      return NextResponse.json(
        { error: "Public ID is required" },
        { status: 400 }
      );
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    if (result.result !== "ok") {
      return NextResponse.json(
        { error: "Failed to delete image" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Image deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}
