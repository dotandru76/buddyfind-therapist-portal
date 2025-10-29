/**
 * יוצר תמונה חתוכה (Blob) מתוך תמונת מקור ונתוני חיתוך.
 * @param {string} imageSrc - ה-URL של תמונת המקור (dataURL או URL רגיל).
 * @param {object} pixelCrop - אובייקט עם נתוני הפיקסלים לחיתוך (x, y, width, height).
 * @param {number} rotation - סיבוב (כרגע לא בשימוש, אבל נדרש לחתימה).
 * @returns {Promise<Blob>} - הבטחה שמחזירה את התמונה החתוכה כ-Blob.
 */
export const getCroppedImg = (imageSrc, pixelCrop, rotation = 0) => {
  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous'); // נדרש לטעינת תמונות מ-URL חיצוני
      image.src = url;
    });

  return new Promise(async (resolve, reject) => {
    try {
      const image = await createImage(imageSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Failed to get 2d context'));
      }

      // הגדרות גודל הקנבס למידות החיתוך
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // ציור התמונה החתוכה על הקנבס
      ctx.drawImage(
        image,
        pixelCrop.x, // נקודת התחלה x בחיתוך
        pixelCrop.y, // נקודת התחלה y בחיתוך
        pixelCrop.width, // רוחב החיתוך
        pixelCrop.height, // גובה החיתוך
        0, // ציור בפינה 0 של הקנבס
        0, // ציור בפינה 0 של הקנבס
        pixelCrop.width, // מתיחה לרוחב הקנבס
        pixelCrop.height // מתיחה לגובה הקנבס
      );

      // המרת הקנבס ל-Blob
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          return reject(new Error('Canvas is empty'));
        }
        // blob.name = 'profile.jpg'; // נוכל להוסיף שם אם נרצה
        resolve(blob);
      }, 'image/jpeg', 0.95); // איכות 95%
    } catch (e) {
      reject(e);
    }
  });
};