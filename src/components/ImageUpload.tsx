import { useState, useRef } from 'react';

interface ImageUploadProps {
  currentImageUrl?: string;
  onUpload: (file: File) => Promise<string>;
  label: string;
  placeholder?: string;
}

function ImageUpload({ currentImageUrl, onUpload, label, placeholder }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      await onUpload(file);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.message || 'Failed to upload image');
      setPreview(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-slate-300">{label}</label>

      <div className="flex items-center gap-4">
        {/* Image Preview */}
        <div className="w-24 h-24 rounded-xl bg-slate-900/50 border-2 border-white/10 overflow-hidden flex items-center justify-center">
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-4xl text-slate-600">
              {placeholder || '📷'}
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleButtonClick}
            disabled={uploading}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {uploading ? 'Uploading...' : preview ? 'Change Image' : 'Upload Image'}
          </button>
          <p className="text-xs text-slate-400 mt-2">
            JPG, PNG or GIF. Max 5MB.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ImageUpload;
