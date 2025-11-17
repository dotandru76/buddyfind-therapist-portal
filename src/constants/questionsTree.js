// src/constants/questionsTree.js
// --- עותק של הלוגיקה הקיימת, עבור העורך החדש ---

// --- Static map for translating profession ID to UX description ---
const professionDescriptions = {
    1: 'שיקום יכולת תנועה, כוח וכאב', 
    2: 'השבת עצמאות מלאה במטלות יומיומיות',
    3: 'אבחון וטיפול במצוקה נפשית ורגשית',
    4: 'התמודדות עם משברים מערכתיים וחברתיים',
    5: 'טיפול במערכות יחסים, זוגיות או משפחה',
    6: 'טיפול רגשי דרך אמצעים יצירתיים',
    7: 'שיפור דיבור, שפה, קול או קשיי בליעה', 
    8: 'ייעוץ תזונתי לניהול מחלות ושיפור אורח חיים',
};

export const questionsTree = {
  start: {
    id: 'mainCategory',
    text: 'מהו תחום הטיפול העיקרי?', 
    type: 'single',
    optionsKey: 'mainCategories', 
    
    // ID 2 = טיפולים רגשיים ונפשיים (תחום הנפש)
    next: (value) => {
        if (value === 2) { 
          return 'targetEntity'; // אם בחר "נפש", שאל "עבור מי"
        }
        return 'audience'; // עבור כל השאר - דלג ישר לגיל
    }
  },
  
  targetEntity: {
    id: 'targetEntity',
    text: 'עבור מי הטיפול מתבצע?', 
    type: 'single',
    options: [
      { label: 'טיפול יחידני (עבור אדם אחד)', value: 'individual' },
      { label: 'עבור הזוגיות (טיפול זוגי)', value: 'couple' },
      { label: 'עבור המשפחה (טיפול משפחתי)', value: 'family' },
      { label: 'עבור קבוצה / סדנה', value: 'group' },
    ],
    next: (value) => 'audience', 
  },
  
  audience: {
    id: 'audience',
    text: 'מהו גיל קהל היעד העיקרי לטיפול?', 
    type: 'slider',
    min: 0,
    max: 120,
    defaultValue: 30,
    next: (value) => 'profession', 
  },
  
  profession: {
    id: 'profession',
    text: 'מהי מטרת הטיפול העיקרית?', 
    type: 'single',
    
    optionsKey: (answers, initialData) => {
        const { mainCategory, targetEntity } = answers; 
        
        if (!mainCategory || !initialData || !initialData.professions) return [];
        
        let filteredProfessions = initialData.professions
            .filter(p => p.main_category_id === mainCategory);
        
        // ID 5 = טיפול זוגי ומשפחתי
        if (targetEntity === 'couple' || targetEntity === 'family') {
            filteredProfessions = filteredProfessions.filter(p => p.id === 5);
        }

        return filteredProfessions.map(p => ({
            label: professionDescriptions[p.id] || p.name, 
            value: p.id
        }));
    },
    
    next: (value) => {
        // דילוג על סימפטומים
        if (value === 4 || value === 5 || value === 6) {
            return 'preferences';
        }
        return 'symptoms'; 
    }
  },
  
  symptoms: {
    id: 'symptoms',
    text: 'איזה מהסימפטומים הבאים מאפיין את הקושי שלך? (בחר/י אחד או יותר)', 
    type: 'multiple',
    optionsKey: (answers, initialData) => {
        const selectedProfessionId = answers.profession; 
        if (!selectedProfessionId || !initialData || !initialData.symptoms) return [];
        
        return initialData.symptoms
            .filter(s => s.profession_id === selectedProfessionId || s.profession_id === parseInt(selectedProfessionId))
            .map(s => ({
                label: s.name, 
                value: s.search_key 
            }));
    },
    next: (value) => 'preferences',
  },

  preferences: {
    id: 'preferences',
    text: 'האם יש לך דרישות נוספות? (בחירה מרובה - אופציונלי)',
    type: 'multiple',
    isOptional: true,
    options: [
        { label: 'קליניקה נגישה לנכים', value: 'is_accessible' },
        { label: 'טיפול בתעריף מוזל', value: 'offers_reduced_fee' }
    ],
    next: () => 'region',
  },
  
  region: {
    id: 'region', 
    text: 'באיזה אזור גיאוגרפי תרצה/י לחפש מטפל/ת?', 
    type: 'single',
    
    optionsKey: (answers, initialData) => {
        if (!initialData || !initialData.regions) return [];
        return initialData.regions.map(r => ({
            label: r.region_name_he,
            value: r.region_key
        }));
    },
    
    next: () => 'final',
  },
};