"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { RxCross2 } from "react-icons/rx";
import { IoCopy, IoCloudUploadOutline } from "react-icons/io5";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Tags, Topics } from "@/generated/prisma";

interface UploadProps {
  formData: {
    title: string;
    subTitle: string;
    slug: string;
    content: string;
    bannerUrl: string;
    video: string;
    tags: string[];
    topics: string[];
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      title: string;
      subTitle: string;
      slug: string;
      content: string;
      bannerUrl: string;
      video: string;
      tags: Tags[];
      topics: Topics[];
    }>
  >;
}

const ImageUpload: React.FC<UploadProps> = ({ formData, setFormData }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [folderName, setFolderName] = useState(formData.title || "");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageViewer, setImageViewer] = useState(false);
  const [imageUrls, setImageUrls] = useState<
    { secure_url: string; public_id: string }[]
  >([]);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Clean up preview URLs
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  // Sync folderName with formData.title
  useEffect(() => {
    setFolderName(formData.title || "");
  }, [formData.title]);

  // Validate inputs
  const validateInputs = useCallback(() => {
    const newErrors: { [key: string]: string } = {};
    if (!folderName.trim()) newErrors.folderName = "Folder name is required";
    if (files.length === 0) newErrors.files = "At least one image is required";
    if (files.length > 5) newErrors.files = "Maximum 5 images allowed";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [folderName, files]);

  // Handle file selection (input or drop)
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles: File[] = [];
    const previews: string[] = [];

    acceptedFiles.forEach((file) => {
      if (
        file.type.startsWith("image/") &&
        file.size <= 10 * 1024 * 1024 &&
        validFiles.length < 5
      ) {
        validFiles.push(file);
        previews.push(URL.createObjectURL(file));
      }
    });

    setFiles((prev) => [...prev, ...validFiles].slice(0, 5));
    setImagePreviews((prev) => [...prev, ...previews].slice(0, 5));
    setErrors((prev) => ({ ...prev, files: "" }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpeg", ".png", ".gif", ".webp"] },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024,
  });

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviews[index]);
    setErrors((prev) => ({ ...prev, files: "" }));
  };

  // Handle upload
  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsUploading(true);
    setUploadProgress(new Array(files.length).fill(0));

    const formdata = new FormData();
    files.forEach((file) => formdata.append("file", file));
    formdata.append("folderName", folderName);

    try {
      const response = await fetch("/api/image-upload", {
        method: "POST",
        body: formdata,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload images");
      }

      const data = await response.json();
      console.log("Urls:", data.files);
      setImageUrls(data.files);
      setFormData((prev) => ({
        ...prev,
        bannerUrl: data.files[0]?.secure_url || prev.bannerUrl,
      }));
      toast.success(
        `${files.length} image${
          files.length > 1 ? "s" : ""
        } uploaded successfully!`
      );

      // Reset state
      setFiles([]);
      //   setImagePreviews([]);
      setUploadProgress([]);
    } catch (error) {
      toast.error(
        `Error uploading images: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Handle image deletion
  const handleDeleteImage = async (publicId: string) => {
    try {
      const response = await fetch(`/api/image-upload?public_id=${publicId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete image");
      }

      const deletedImage = imageUrls.find((img) => img.public_id === publicId);
      setImageUrls((prev) => prev.filter((img) => img.public_id !== publicId));
      setImagePreviews((prev) =>
        prev.filter((preview) => preview !== deletedImage?.secure_url)
      );

      if (formData.bannerUrl === deletedImage?.secure_url) {
        setFormData((prev) => ({ ...prev, bannerUrl: "" }));
      }

      toast.success("Image deleted successfully!");
    } catch (error) {
      toast.error(
        `Error deleting image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Copy URL to clipboard
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Image URL copied to clipboard!");
  };

  // Memoized mapped images
  const mappedImages = useMemo(
    () =>
      imagePreviews.map((preview, i) => ({
        preview,
        url: imageUrls[i]?.secure_url || "",
        public_id: imageUrls[i]?.public_id || "",
      })),
    [imagePreviews, imageUrls]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full">
          <label
            htmlFor="folder-name"
            className="block text-sm font-medium text-gray-700"
          >
            Folder Name
          </label>
          <input
            id="folder-name"
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Enter folder name (e.g., blog-images)"
            className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#7B00D3] focus:border-[#7B00D3] outline-none"
            aria-invalid={!!errors.folderName}
            aria-describedby={
              errors.folderName ? "folderName-error" : undefined
            }
          />
          {errors.folderName && (
            <p id="folderName-error" className="text-red-500 text-xs mt-1">
              {errors.folderName}
            </p>
          )}
        </div>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive ? "border-[#7B00D3] bg-[#7B00D3]/5" : "border-gray-300",
          errors.files ? "border-red-500" : ""
        )}
      >
        <input {...getInputProps()} id="image" />
        <IoCloudUploadOutline className="mx-auto h-12 w-12 text-[#7B00D3]" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive
            ? "Drop images here"
            : "Drag & drop images or click to select (max 5, 10MB each)"}
        </p>
        {errors.files && (
          <p className="text-red-500 text-xs mt-1">{errors.files}</p>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-4">
              <Image
                src={imagePreviews[index]}
                alt={`Preview ${index + 1}`}
                width={64}
                height={64}
                className="rounded-md object-cover"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-700">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                {isUploading && (
                  <Progress
                    value={uploadProgress[index] || 0}
                    className="h-2 mt-1"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                className="text-red-600 hover:text-red-800 focus:outline-none"
                aria-label={`Remove ${file.name}`}
              >
                <RxCross2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={imageViewer} onOpenChange={setImageViewer}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Uploaded Images</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
            {mappedImages.map((image, index) => (
              <div key={index} className="relative space-y-2">
                <Image
                  src={image.preview || image.url || "/placeholder.png"}
                  alt={`Uploaded image ${index + 1}`}
                  width={300}
                  height={300}
                  className="w-full h-auto rounded-md object-cover"
                />
                {image.url && imageUrls.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(image.url)}
                      className="p-2 bg-[#7B00D3] text-white rounded-md hover:bg-[#6A00B8]"
                      aria-label="Copy image URL"
                    >
                      <IoCopy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(image.public_id)}
                      className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                      aria-label="Delete image"
                    >
                      <RxCross2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                onClick={() => setImageViewer(false)}
              >
                Close
              </button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-4">
        {mappedImages.length > 0 && (
          <button
            type="button"
            onClick={() => setImageViewer(true)}
            className="px-4 py-2 bg-[#7B00D3] text-white rounded-md hover:bg-[#6A00B8] disabled:opacity-50"
            disabled={isUploading}
          >
            View Previews
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          className="px-4 py-2 bg-[#7B00D3] text-white rounded-md hover:bg-[#6A00B8] disabled:opacity-50"
          disabled={isUploading || files.length === 0}
        >
          {isUploading ? "Uploading..." : "Upload Images"}
        </button>
      </div>
    </div>
  );
};

export default ImageUpload;
