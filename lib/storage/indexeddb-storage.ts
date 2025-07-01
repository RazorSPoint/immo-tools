/**
 * IndexedDB Storage for Large Timeline Files
 * Handles storing large timeline data in IndexedDB with better capacity limits
 */

import { TimelineData } from '@/lib/location/simple-analyzer';

const DB_NAME = 'ImmoToolsDB';
const DB_VERSION = 1;
const STORE_NAME = 'timelineFiles';

interface TimelineFileData {
  id: string;
  data: TimelineData;
  compressed: boolean;
  originalSize: number;
}

/**
 * Initialize IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store for timeline files
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('id', 'id', { unique: true });
        console.log('📁 Created IndexedDB object store for timeline files');
      }
    };
  });
}

/**
 * Save timeline data to IndexedDB
 */
export async function saveTimelineDataToDB(id: string, data: TimelineData): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Calculate original size
    const originalSize = new Blob([JSON.stringify(data)]).size;

    // For now, store uncompressed (can add compression later if needed)
    const fileData: TimelineFileData = {
      id,
      data,
      compressed: false,
      originalSize
    };

    return new Promise((resolve, reject) => {
      const request = store.put(fileData);

      request.onsuccess = () => {
        console.log('✅ Timeline data saved to IndexedDB:', id);
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to save timeline data to IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
    throw new Error('Failed to save timeline data to IndexedDB');
  }
}

/**
 * Load timeline data from IndexedDB
 */
export async function loadTimelineDataFromDB(id: string): Promise<TimelineData | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(id);

      request.onsuccess = () => {
        const result = request.result as TimelineFileData;
        if (result) {
          console.log('✅ Timeline data loaded from IndexedDB:', id);
          resolve(result.data);
        } else {
          console.warn('⚠️ Timeline data not found in IndexedDB:', id);
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to load timeline data from IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error loading from IndexedDB:', error);
    throw new Error('Failed to load timeline data from IndexedDB');
  }
}

/**
 * Delete timeline data from IndexedDB
 */
export async function deleteTimelineDataFromDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('🗑️ Timeline data deleted from IndexedDB:', id);
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete timeline data from IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error deleting from IndexedDB:', error);
    throw new Error('Failed to delete timeline data from IndexedDB');
  }
}

/**
 * Get all timeline file IDs from IndexedDB
 */
export async function getAllTimelineFileIds(): Promise<string[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAllKeys();

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      request.onerror = () => {
        reject(new Error('Failed to get timeline file IDs from IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error getting file IDs from IndexedDB:', error);
    return [];
  }
}

/**
 * Get IndexedDB storage usage
 */
export async function getIndexedDBUsage(): Promise<{ used: number; quota: number }> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0
      };
    }
  } catch (error) {
    console.warn('Could not estimate IndexedDB storage usage:', error);
  }

  return { used: 0, quota: 0 };
}

/**
 * Clear all timeline data from IndexedDB
 */
export async function clearAllTimelineDataFromDB(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        console.log('🧹 All timeline data cleared from IndexedDB');
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear timeline data from IndexedDB'));
      };
    });
  } catch (error) {
    console.error('Error clearing IndexedDB:', error);
    throw new Error('Failed to clear timeline data from IndexedDB');
  }
}

/**
 * Check if IndexedDB is available
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}
