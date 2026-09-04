import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_KEY,
  },
});

/**
 * Uploads a file to S3 and returns the public URL
 * @param {File} file - The file object to upload
 * @param {string} folder - Optional folder path in the bucket
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
export const uploadToS3 = async (file, folder = "posters") => {
  if (!file) return null;

  const fileName = `${folder}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const params = {
    Bucket: import.meta.env.VITE_AWS_BUCKET_NAME,
    Key: fileName,
    Body: await file.arrayBuffer(), // ✅ FIX
    ContentType: file.type,
  };

  try {
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Public URL construction
    return `https://${params.Bucket}.s3.${import.meta.env.VITE_AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error("Full S3 Upload Error:", error);
    throw new Error(`S3 Upload failed: ${error.message}`);
  }
};
