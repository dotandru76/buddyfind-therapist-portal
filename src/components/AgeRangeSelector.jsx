// src/components/AgeRangeSelector.jsx
import React, { useState } from 'react';
import * as Slider from '@radix-ui/react-slider'; // <-- ייבוא הספרייה החדשה

/**
 * רכיב לבחירת טווחי גילאים מרובים
 * @param {number[][]} value - מערך של טווחים (למשל: [[6, 12], [18, 30]])
 * @param {function} onChange - פונקציה שמופעלת עם המערך החדש של הטווחים
 */
const AgeRangeSelector = ({ value = [], onChange }) => {
  // שומר את הערך הנוכחי של הסליידר (לפני הוספה)
  const [currentSliderValue, setCurrentSliderValue] = useState([18, 65]);

  const handleSliderChange = (newValue) => {
    setCurrentSliderValue(newValue);
  };

  const handleAddRange = () => {
    // מונע הוספת טווחים זהים
    const isDuplicate = value.some(
      (range) => range[0] === currentSliderValue[0] && range[1] === currentSliderValue[1]
    );

    if (!isDuplicate) {
      const newRanges = [...value, currentSliderValue];
      // ממיין את הטווחים לפי גיל התחלתי
      newRanges.sort((a, b) => a[0] - b[0]);
      onChange(newRanges);
    }
  };

  const handleRemoveRange = (indexToRemove) => {
    const newRanges = value.filter((_, index) => index !== indexToRemove);
    onChange(newRanges);
  };

  return (
    <div className="age-range-selector">
      
      {/* 1. רשימת הטווחים שנוספו */}
      {value.length > 0 && (
        <div className="age-range-pills-container">
          {value.map((range, index) => (
            <div key={index} className="age-range-pill">
              <span>{`${range[0]} - ${range[1]}`}</span>
              <button 
                type="button" 
                className="remove-range-btn" 
                onClick={() => handleRemoveRange(index)}
                title="הסר טווח"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 2. הסליידר עצמו (בשימוש ב-Radix) */}
      <div className="age-slider-container">
        <label className="age-slider-label">
          הוסף טווח גילאים: 
          <span className="age-slider-value">{`${currentSliderValue[0]} - ${currentSliderValue[1]}`}</span>
        </label>
        
        {/* --- !!! רכיב הסליידר החדש של Radix !!! --- */}
        <Slider.Root
          className="age-slider-radix"
          value={currentSliderValue}
          onValueChange={handleSliderChange}
          min={0}
          max={120}
          step={1}
          minStepsBetweenThumbs={1}
          aria-label="טווחי גילאים"
        >
          <Slider.Track className="slider-track">
            <Slider.Range className="slider-range" />
          </Slider.Track>
          <Slider.Thumb className="slider-thumb" />
          <Slider.Thumb className="slider-thumb" />
        </Slider.Root>
        {/* --- סוף הרכיב החדש --- */}
      </div>

      {/* 3. כפתור הוספה */}
      <button 
        type="button" 
        onClick={handleAddRange} 
        className="add-range-btn"
      >
        + הוסף טווח
      </button>
    </div>
  );
};

export default AgeRangeSelector;