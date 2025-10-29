import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage'; // ייבוא פונקציית העזר

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // פונקציה זו נקראת בכל פעם שהמשתמש מזיז/חותך
  const onCropChange = useCallback((location) => {
    setCrop(location);
  }, []);

  // פונקציה זו נקראת בסיום החיתוך (שחרור עכבר)
  const onCropFullComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // פונקציית זום
  const onZoomChange = useCallback((zoom) => {
    setZoom(zoom);
  }, []);

  // פונקציית השמירה
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // שימוש בפונקציית העזר שלנו ליצירת ה-Blob
      const croppedImageBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels
      );
      // שליחת ה-Blob החתוך בחזרה לרכיב האב
      onCropComplete(croppedImageBlob);
    } catch (e) {
      console.error('Error cropping image:', e);
      setIsSaving(false);
    }
  };

  return (
    // רקע מודאל שחור שקוף
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-lg h-3/4 bg-gray-800 rounded-lg shadow-xl">
        {/* אזור החיתוך */}
        <div className="relative w-full h-full max-h-[calc(100%-120px)]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1} // יחס 1:1 (ריבוע)
            cropShape="round" // הצגת מסגרת עגולה (החיתוך עצמו עדיין ריבוע)
            showGrid={false}
            onCropChange={onCropChange}
            onCropComplete={onCropFullComplete}
            onZoomChange={onZoomChange}
          />
        </div>

        {/* פקדי זום */}
        <div className="absolute bottom-16 left-0 right-0 p-4">
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg accent-primary-blue"
          />
        </div>
        
        {/* כפתורי פעולה */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between p-4 bg-gray-800 rounded-b-lg border-t border-gray-700">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="px-6 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 text-sm font-medium text-white bg-primary-blue rounded-md hover:bg-secondary-purple disabled:opacity-50"
          >
            {isSaving ? 'שומר...' : 'אשר וחתוך'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;