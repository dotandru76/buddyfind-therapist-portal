// src/utils/cropImage.js

/**
 * Creates a cropped image Blob from a source image and crop data.
 * @param {string} imageSrc - The source image URL (dataURL or regular URL).
 * @param {object} pixelCrop - The pixel crop data { x, y, width, height }.
 * @param {number} [rotation=0] - Rotation degrees (currently unused but part of standard cropper signature).
 * @returns {Promise<Blob>} A Promise that resolves with the cropped image Blob.
 */
export const getCroppedImg = (imageSrc, pixelCrop, rotation = 0) => {
  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous'); // Needed for loading external URLs or dataURLs sometimes
      image.src = url;
    });

  return new Promise(async (resolve, reject) => {
    if (!pixelCrop) {
      return reject(new Error('pixelCrop parameter is required.'));
    }

    try {
      const image = await createImage(imageSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Failed to get 2d context'));
      }

      // TODO: Handle rotation if needed in the future
      // const R = rotation * (Math.PI / 180); // Convert degrees to radians

      // Set canvas size to match the cropped area size
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // Draw the cropped image onto the canvas
      // The arguments define: source image, source x, source y, source width, source height,
      // destination x, destination y, destination width, destination height
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0, // Draw at top-left corner of canvas
        0,
        pixelCrop.width, // Scale to canvas width
        pixelCrop.height // Scale to canvas height
      );

      // Convert canvas to Blob
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Canvas is empty or browser blob creation failed');
          return reject(new Error('Failed to create blob from canvas'));
        }
        // Optionally add a filename to the blob
        // blob.name = 'cropped_profile.jpeg';
        resolve(blob);
      }, 'image/jpeg', 0.90); // Use JPEG format with 90% quality

    } catch (e) {
      console.error('Error in getCroppedImg:', e);
      reject(e);
    }
  });
};