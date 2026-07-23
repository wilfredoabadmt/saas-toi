import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Endpoint = process.env.S3_ENDPOINT;
const s3AccessKeyId = process.env.S3_ACCESS_KEY_ID;
const s3SecretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const s3BucketName = process.env.S3_BUCKET_NAME || 'saas-toi-files';

export const s3Client = new S3Client({
  region: 'auto',
  endpoint: s3Endpoint,
  credentials: {
    accessKeyId: s3AccessKeyId || 'dummy',
    secretAccessKey: s3SecretAccessKey || 'dummy',
  },
});

export async function uploadToS3(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ key: string; bucket: string }> {
  const command = new PutObjectCommand({
    Bucket: s3BucketName,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  });

  await s3Client.send(command);
  return { key: params.key, bucket: s3BucketName };
}

export async function getPresignedDownloadUrl(key: string, expiresInSeconds = 900): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: s3BucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: s3BucketName,
    Key: key,
  });

  await s3Client.send(command);
}

export function buildS3ProofKey(organizationId: string, subscriberId: string, filename: string): string {
  const timestamp = Date.now();
  return `${organizationId}/comprobantes/${subscriberId}/${timestamp}_${filename}`;
}
