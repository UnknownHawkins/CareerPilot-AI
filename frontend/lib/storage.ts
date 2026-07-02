/**
 * Firebase Storage Utilities
 * 
 * Provides helper functions for uploading, downloading, and deleting
 * files in Firebase Storage. Designed to be used anywhere in the
 * CareerPilot AI frontend (resume uploads, profile images, etc.)
 */

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
  StorageReference,
  UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from './firebase';

export type UploadProgressCallback = (progress: number) => void;

export interface UploadResult {
  downloadUrl: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

/**
 * Uploads a file to Firebase Storage with real-time progress tracking.
 *
 * @param file          The File object to upload.
 * @param storagePath   Destination path inside Storage bucket, e.g. `resumes/{userId}/resume.pdf`
 * @param onProgress    Optional callback receiving upload progress (0–100).
 * @returns             Resolved UploadResult on success.
 */
export async function uploadFile(
  file: File,
  storagePath: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const storageRef: StorageReference = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
    });

    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(progress);
      },
      (error) => {
        console.error('[Firebase Storage] Upload failed:', error);
        reject(new Error(`Upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            storagePath,
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type,
          });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Uploads a resume PDF for a specific user.
 * Path: resumes/{userId}/{timestamp}_{filename}
 */
export async function uploadResume(
  file: File,
  userId: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `resumes/${userId}/${timestamp}_${safeFileName}`;
  return uploadFile(file, storagePath, onProgress);
}

/**
 * Uploads a profile avatar image for a specific user.
 * Path: avatars/{userId}/avatar.{ext}
 */
export async function uploadAvatar(
  file: File,
  userId: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const storagePath = `avatars/${userId}/avatar.${ext}`;
  return uploadFile(file, storagePath, onProgress);
}

/**
 * Deletes a file from Firebase Storage by its full storage path.
 *
 * @param storagePath  The exact path of the file to delete.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error: any) {
    // Silently ignore "object not found" errors (already deleted)
    if (error?.code !== 'storage/object-not-found') {
      console.error('[Firebase Storage] Delete failed:', error);
      throw error;
    }
  }
}

/**
 * Deletes all files in a storage directory (prefix).
 * Useful for cleaning up when a user is deleted.
 *
 * @param directoryPath  The storage directory path, e.g. `resumes/{userId}`
 */
export async function deleteDirectory(directoryPath: string): Promise<void> {
  const dirRef = ref(storage, directoryPath);
  const list = await listAll(dirRef);

  const deletionPromises = list.items.map((itemRef) =>
    deleteObject(itemRef).catch((err) => {
      if (err?.code !== 'storage/object-not-found') throw err;
    })
  );

  await Promise.all(deletionPromises);
}

/**
 * Gets a public download URL for a file stored in Firebase Storage.
 *
 * @param storagePath  The exact path of the file.
 * @returns            A signed public download URL.
 */
export async function getFileUrl(storagePath: string): Promise<string> {
  const storageRef = ref(storage, storagePath);
  return getDownloadURL(storageRef);
}
