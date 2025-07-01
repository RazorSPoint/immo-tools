'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, Upload, HardDrive, AlertCircle } from 'lucide-react';
import {
  SavedTimelineFile,
  getSavedTimelineFiles,
  deleteTimelineFile,
  clearAllTimelineFiles,
  getStorageUsage,
  formatFileSize,
  formatDate
} from '@/lib/storage/timeline-storage';

interface SavedTimelinesCardProps {
  currentFileId?: string;
  onLoadFile: (file: SavedTimelineFile) => void;
  onFilesChange: () => void;
}

export function SavedTimelinesCard({
  currentFileId,
  onLoadFile,
  onFilesChange
}: SavedTimelinesCardProps) {
  const [savedFiles, setSavedFiles] = useState<SavedTimelineFile[]>([]);
  const [storageUsage, setStorageUsage] = useState({ used: 0, percentage: 0, maxSize: 0 });
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Load saved files on component mount and when files change
  useEffect(() => {
    loadSavedFiles();
  }, []);

  const loadSavedFiles = async () => {
    const files = getSavedTimelineFiles();
    setSavedFiles(files);

    // Get updated storage usage (now async)
    const usage = await getStorageUsage();
    setStorageUsage({
      used: usage.total.used,
      percentage: usage.total.quota > 0 ? (usage.total.used / usage.total.quota) * 100 : 0,
      maxSize: usage.total.quota || 0
    });

    onFilesChange();
  };

  const handleLoadFile = async (file: SavedTimelineFile) => {
    await onLoadFile(file);
  };

  const handleDeleteFile = async (fileId: string, filename: string) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      try {
        await deleteTimelineFile(fileId);
        await loadSavedFiles();
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('Failed to delete file. Please try again.');
      }
    }
  };

  const handleClearAll = async () => {
    if (showConfirmClear) {
      try {
        await clearAllTimelineFiles();
        await loadSavedFiles();
        setShowConfirmClear(false);
      } catch (error) {
        console.error('Error clearing files:', error);
        alert('Failed to clear files. Please try again.');
      }
    } else {
      setShowConfirmClear(true);
      // Reset confirmation after 3 seconds
      setTimeout(() => setShowConfirmClear(false), 3000);
    }
  };

  const getStorageBarColor = () => {
    if (storageUsage.percentage > 80) return 'bg-red-500';
    if (storageUsage.percentage > 60) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Saved Timeline Files ({savedFiles.length})
          </span>
          {savedFiles.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className={`text-red-500 hover:text-red-700 ${showConfirmClear ? 'bg-red-50' : ''}`}
              title="Clear all saved files"
            >
              {showConfirmClear ? 'Click again to confirm' : 'Clear All'}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Storage Usage Bar */}
        {savedFiles.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1">
                <HardDrive className="h-4 w-4" />
                Browser Storage Usage
              </span>
              <span>
                {storageUsage.maxSize > 0
                  ? `${formatFileSize(storageUsage.used)} / ${formatFileSize(storageUsage.maxSize)}`
                  : `${formatFileSize(storageUsage.used)} used`
                }
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 relative overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getStorageBarColor()}`}
                style={{
                  width: `${Math.min(storageUsage.percentage, 100)}%`
                }}
              />
            </div>
            {storageUsage.percentage > 80 && (
              <div className="flex items-center gap-1 mt-2 text-sm text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span>Storage nearly full. Large files may fail to save.</span>
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleClearAll}
                  className="p-0 h-auto text-orange-600 underline"
                >
                  Clear space
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Saved Files List */}
        {savedFiles.length === 0 ? (
          <div className="text-center text-gray-500 py-6">
            <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No saved timeline files yet.</p>
            <p className="text-sm">Upload a JSON file to get started.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {savedFiles.map((file) => (
              <div
                key={file.id}
                className={`p-3 rounded-lg border transition-all ${
                  currentFileId === file.id
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {file.filename}
                      {currentFileId === file.id && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </h4>
                    <div className="text-sm text-gray-500 mt-1">
                      <div>Uploaded: {formatDate(file.uploadDate)}</div>
                      <div className="flex items-center gap-4 mt-1">
                        <span>Size: {formatFileSize(file.fileSize)}</span>
                        <span>Analyzed: {file.analysisCount} times</span>
                        {file.lastAnalyzed && (
                          <span>Last: {formatDate(file.lastAnalyzed)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadFile(file)}
                      disabled={currentFileId === file.id}
                      className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                    >
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.id, file.filename)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
