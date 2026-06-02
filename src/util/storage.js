import { Storage } from '@google-cloud/storage';
import { format } from 'util';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Configuración mediante variables de entorno:
// GC_PROJECT_ID, GC_KEYFILE (ruta opcional al JSON), GC_KEYFILE_JSON (contenido JSON), GC_BUCKET
const storageOptions = {};
if (process.env.GC_PROJECT_ID) storageOptions.projectId = process.env.GC_PROJECT_ID;
if (process.env.GC_KEYFILE_JSON) {
  try {
    storageOptions.credentials = JSON.parse(process.env.GC_KEYFILE_JSON);
  } catch (err) {
    console.warn('GC_KEYFILE_JSON no es JSON válido:', err.message);
  }
} else if (process.env.GC_KEYFILE) {
  storageOptions.keyFilename = process.env.GC_KEYFILE;
} else {
  const localKeyPath = path.join(process.cwd(), 'service-account.json');
  if (fs.existsSync(localKeyPath)) {
    storageOptions.keyFilename = localKeyPath;
  }
}

const storageClient = new Storage(storageOptions);

const bucketName = process.env.GC_BUCKET || '';
if (!bucketName) {
  console.warn('GC_BUCKET is not set. uploadToGCS will fail until GC_BUCKET is configured.');
}
const bucket = storageClient.bucket(bucketName);

export const uploadToGCS = (file, destPath) => {
  return new Promise((resolve, reject) => {
    if (!file || !destPath) return reject(new Error('Parámetros inválidos para uploadToGCS'));

    const uuid = uuidv4();
    const fileUpload = bucket.file(destPath);

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: uuid,
        },
      },
    });

    stream.on('error', (err) => {
      reject(err);
    });

    stream.on('finish', () => {
      const url = format(
        `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileUpload.name)}?alt=media&token=${uuid}`
      );
      resolve(url);
    });

    stream.end(file.buffer);
  });
};
