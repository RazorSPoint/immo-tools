/**
 * Timeline File Storage Management
 * Hybrid storage: metadata in localStorage, large data in IndexedDB
 */

import { TimelineData } from '@/lib/location/simple-analyzer';
import {
  saveTimelineDataToDB,
  loadTimelineDataFromDB,
  deleteTimelineDataFromDB,
  clearAllTimelineDataFromDB,
  getIndexedDBUsage,
  isIndexedDBAvailable
} from './indexeddb-storage';

export interface SavedTimelineFile {
  id: string;
  filename: string;
  uploadDate: string;
  fileSize: number;
  analysisCount: number;
  lastAnalyzed?: string;
  // Note: data is now stored in IndexedDB, not here
}

export interface SavedTimelineFileWithData extends SavedTimelineFile {
  data: TimelineData;
}

const STORAGE_KEY = 'immo_timeline_files';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit

/**
 * Get all saved timeline files from localStorage
 */
export function getSavedTimelineFiles(): SavedTimelineFile[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const files = JSON.parse(stored) as SavedTimelineFile[];
    return files.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  } catch (error) {
    console.error('Error loading saved timeline files:', error);
    return [];
  }
}

/**
 * Save a timeline file using hybrid storage
 */
export async function saveTimelineFile(file: File, data: TimelineData): Promise<SavedTimelineFile> {
  const fileId = generateFileId();

  const newFile: SavedTimelineFile = {
    id: fileId,
    filename: file.name,
    uploadDate: new Date().toISOString(),
    fileSize: file.size,
    analysisCount: 0,
  };

  try {
    // First, try to save data to IndexedDB
    if (isIndexedDBAvailable()) {
      await saveTimelineDataToDB(fileId, data);
      console.log('✅ Timeline data saved to IndexedDB:', file.name);
    } else {
      throw new Error('IndexedDB not available. Cannot save large files.');
    }

    // Then save metadata to localStorage
    const existingFiles = getSavedTimelineFiles();

    // Check if file with same name already exists
    const existingIndex = existingFiles.findIndex(f => f.filename === file.name);
    if (existingIndex !== -1) {
      // Delete old data from IndexedDB first
      const oldFileId = existingFiles[existingIndex].id;
      try {
        await deleteTimelineDataFromDB(oldFileId);
      } catch (error) {
        console.warn('Could not delete old file data:', error);
      }
      // Replace existing file metadata
      existingFiles[existingIndex] = newFile;
    } else {
      // Add new file metadata
      existingFiles.unshift(newFile);
    }

    // Save metadata to localStorage (should be small now)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingFiles));
    console.log('✅ Timeline metadata saved to localStorage:', file.name);

    return newFile;
  } catch (error: any) {
    console.error('Error saving timeline file:', error);

    // Try to cleanup if partial save occurred
    try {
      await deleteTimelineDataFromDB(fileId);
    } catch {
      // Ignore cleanup errors
    }

    // Provide user-friendly error messages
    if (error.message?.includes('IndexedDB')) {
      throw new Error('Failed to save file to browser storage. Your browser may not support large file storage.');
    } else if (error.message?.includes('quota') || error.message?.includes('storage')) {
      throw new Error('Storage quota exceeded. Please clear some saved files and try again.');
    } else {
      throw new Error(error.message || 'Failed to save timeline file');
    }
  }
}

/**
 * Load timeline data for a saved file
 */
export async function loadTimelineData(fileId: string): Promise<TimelineData | null> {
  try {
    if (isIndexedDBAvailable()) {
      return await loadTimelineDataFromDB(fileId);
    } else {
      throw new Error('IndexedDB not available');
    }
  } catch (error) {
    console.error('Error loading timeline data:', error);
    return null;
  }
}

/**
 * Delete a saved timeline file
 */
export async function deleteTimelineFile(fileId: string): Promise<void> {
  try {
    // Delete from IndexedDB
    if (isIndexedDBAvailable()) {
      await deleteTimelineDataFromDB(fileId);
    }

    // Delete metadata from localStorage
    const files = getSavedTimelineFiles();
    const filteredFiles = files.filter(f => f.id !== fileId);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredFiles));
    console.log('🗑️ Timeline file deleted:', fileId);
  } catch (error) {
    console.error('Error deleting timeline file:', error);
    throw new Error('Failed to delete timeline file');
  }
}

/**
 * Update analysis count for a file
 */
export function updateFileAnalysisCount(fileId: string): void {
  try {
    const files = getSavedTimelineFiles();
    const fileIndex = files.findIndex(f => f.id === fileId);

    if (fileIndex !== -1) {
      files[fileIndex].analysisCount += 1;
      files[fileIndex].lastAnalyzed = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    }
  } catch (error) {
    console.error('Error updating analysis count:', error);
  }
}

/**
 * Clear all saved timeline files
 */
export async function clearAllTimelineFiles(): Promise<void> {
  try {
    // Clear IndexedDB
    if (isIndexedDBAvailable()) {
      await clearAllTimelineDataFromDB();
    }

    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY);
    console.log('🧹 All timeline files cleared');
  } catch (error) {
    console.error('Error clearing timeline files:', error);
    throw new Error('Failed to clear timeline files');
  }
}

/**
 * Get storage usage information (both localStorage and IndexedDB)
 */
export async function getStorageUsage(): Promise<{
  localStorage: { used: number; percentage: number; maxSize: number };
  indexedDB: { used: number; quota: number };
  total: { used: number; quota: number };
}> {
  try {
    // localStorage usage (metadata only now)
    const localStored = localStorage.getItem(STORAGE_KEY);
    const localUsed = localStored ? new Blob([localStored]).size : 0;
    const localPercentage = (localUsed / MAX_STORAGE_SIZE) * 100;

    // IndexedDB usage
    const idbUsage = await getIndexedDBUsage();

    return {
      localStorage: {
        used: localUsed,
        percentage: Math.min(localPercentage, 100),
        maxSize: MAX_STORAGE_SIZE
      },
      indexedDB: idbUsage,
      total: {
        used: localUsed + idbUsage.used,
        quota: idbUsage.quota || 0
      }
    };
  } catch (error) {
    console.error('Error getting storage usage:', error);
    return {
      localStorage: { used: 0, percentage: 0, maxSize: MAX_STORAGE_SIZE },
      indexedDB: { used: 0, quota: 0 },
      total: { used: 0, quota: 0 }
    };
  }
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format date in human-readable format
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Unknown';
  }
}

/**
 * Generate unique file ID
 */
function generateFileId(): string {
  return `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
