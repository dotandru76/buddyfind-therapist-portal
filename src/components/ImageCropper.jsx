// src/components/ImageCropper.jsx
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage'; // Ensure this path is correct

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const onCropChange = useCallback((location) => { setCrop(location); }, []);
  const onCropFullComplete = useCallback((croppedArea, croppedAreaPixelsVal) => { setCroppedAreaPixels(croppedAreaPixelsVal); }, []);
  const onZoomChange = useCallback((zoomVal) => { setZoom(zoomVal); }, []);

  const handleSave = async () => {
    if (isSaving || !croppedAreaPixels) return;
    setIsSaving(true);
    try {
      const croppedImageBlob = await getCroppedImg( imageSrc, croppedAreaPixels );
      onCropComplete(croppedImageBlob); // Pass Blob back to ProfileEditor
    } catch (e) {
      console.error('Error cropping image:', e);
      setIsSaving(false); // Allow retry on error
      // Optionally show an error message to the user here
      alert(`שגיאה בחיתוך התמונה: ${e.message}`);
    }
    // No finally block needed here, isSaving remains true if onCropComplete navigates away
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg h-3/4 bg-gray-800 rounded-lg shadow-xl flex flex-col">
        {/* Cropper takes up most space */}
        <div className="relative flex-grow w-full h-[calc(100%-120px)]">
          <Cropper
            image={imageSrc} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false}
            onCropChange={onCropChange} onCropComplete={onCropFullComplete} onZoomChange={onZoomChange}
            classes={{ containerClassName: 'rounded-t-lg' }} // Optional: ensure rounded corners inside
          />
        </div>

        {/* Zoom Control Area */}
        <div className="p-4 bg-gray-800">
           <label htmlFor="zoom-slider" className="block text-center text-sm font-medium text-gray-300 mb-2">Zoom</label>
           <input
            id="zoom-slider" type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg accent-primary-blue"
          />
        </div>

        {/* Action Buttons Area */}
        <div className="flex justify-between p-4 bg-gray-800 rounded-b-lg border-t border-gray-700">
          <button onClick={onCancel} disabled={isSaving} className="px-6 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 disabled:opacity-50">
            ביטול
          </button>
          <button onClick={handleSave} disabled={isSaving || !croppedAreaPixels} className="px-6 py-2 text-sm font-medium text-white bg-primary-blue rounded-md hover:bg-secondary-purple disabled:opacity-50">
            {isSaving ? 'שומר...' : 'אשר וחתוך'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;