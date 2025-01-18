// src/components/FileUpload.jsx
import React, { useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';

/**
 * FileUpload component:
 * - Handles drag-and-drop or manual file selection
 * - Validates file type (EPUB or PDF) and size limit (50MB)
 * - Reads the file as ArrayBuffer, then calls onFileSelect
 */
const FileUpload = ({ onFileSelect }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  /**
   * handleDrag: Called on dragenter, dragover, dragleave
   */
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      console.log('[FileUpload] Drag over area');
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      console.log('[FileUpload] Drag left area');
      setDragActive(false);
    }
  };

  /**
   * validateFile: Ensures the file has a valid extension and is under 50MB.
   */
  const validateFile = (file) => {
    console.log('[FileUpload] Validating file:', file.name, file.size, file.type);

    const validExtensions = ['.epub', '.pdf'];
    const lowerName = file.name.toLowerCase();
    const isValidExt = validExtensions.some(ext => lowerName.endsWith(ext));

    if (!isValidExt) {
      console.log('[FileUpload] Validation failed: not an EPUB or PDF file');
      setError('Please upload an EPUB or PDF file');
      return false;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      console.log('[FileUpload] Validation failed: file too large');
      setError('File size must be less than 50MB');
      return false;
    }

    console.log('[FileUpload] File validation passed');
    setError('');
    return true;
  };

  /**
   * processFile: Reads the file as an ArrayBuffer, then calls onFileSelect
   */
  const processFile = async (file) => {
    if (!validateFile(file)) {
      return;
    }

    try {
      console.log('[FileUpload] Starting to read file:', file.name);
      const buffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          console.log('[FileUpload] File read successfully');
          resolve(e.target.result);
        };

        reader.onerror = (e) => {
          console.error('[FileUpload] FileReader error event:', e);
          console.error('[FileUpload] FileReader error details:', reader.error);
          reject(new Error('Failed to read file. FileReader reported an error.'));
        };

        reader.onabort = () => {
          console.warn('[FileUpload] File reading was aborted');
          reject(new Error('File reading was aborted.'));
        };

        reader.readAsArrayBuffer(file);
      });

      console.log('[FileUpload] File read into ArrayBuffer, size:', buffer.byteLength, 'bytes');
      setSelectedFile(file);

      // Provide file data + name to onFileSelect
      console.log('[FileUpload] Passing file data to onFileSelect callback');
      onFileSelect(buffer, file.name);
    } catch (err) {
      console.error('[FileUpload] Error processing file:', err);
      setError('Error processing file. Please try another EPUB or PDF file.');
    }
  };

  /**
   * handleDrop: Called when a file is dropped onto the drag area
   */
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    console.log('[FileUpload] File dropped');

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      console.log('[FileUpload] Dropped file:', file.name);
      await processFile(file);
    } else {
      console.warn('[FileUpload] No file found in drop event');
    }
  };

  /**
   * handleChange: Called when a file is selected from the file input dialog
   */
  const handleChange = async (e) => {
    e.preventDefault();
    const file = e.target.files && e.target.files[0];
    if (file) {
      console.log('[FileUpload] File selected via input:', file.name);
      await processFile(file);
    } else {
      console.warn('[FileUpload] No file selected from file input dialog');
    }
  };

  /**
   * handleClick: Programmatically open the file input dialog
   */
  const handleClick = () => {
    console.log('[FileUpload] Triggering file input dialog');
    inputRef.current.click();
  };

  /**
   * removeFile: Clear the selected file from state
   */
  const removeFile = () => {
    console.log('[FileUpload] Removing selected file:', selectedFile ? selectedFile.name : 'none');
    setSelectedFile(null);
    setError('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`relative p-6 border-2 border-dashed rounded-lg 
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${selectedFile ? 'bg-green-50' : 'bg-white'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".epub,.pdf"
          onChange={handleChange}
          className="hidden"
        />

        {!selectedFile ? (
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop your EPUB or PDF here, or{' '}
              <button
                type="button"
                onClick={handleClick}
                className="text-blue-500 hover:text-blue-600 focus:outline-none focus:underline"
              >
                browse
              </button>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Maximum file size: 50MB
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-green-500" />
              <span className="ml-2 text-sm text-gray-600">
                {selectedFile.name}
              </span>
            </div>
            <button
              onClick={removeFile}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default FileUpload;
