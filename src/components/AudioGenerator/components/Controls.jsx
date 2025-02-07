import React, { useState, useEffect } from 'react';

export const Control = ({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step = 0.01, 
  unit = '%', 
  valueMultiplier = 100,
  precision = 1  // 添加精度控制
}) => {
  const [inputValue, setInputValue] = useState((value * valueMultiplier).toFixed(precision));

  useEffect(() => {
    setInputValue((value * valueMultiplier).toFixed(precision));
  }, [value, valueMultiplier, precision]);

  return (
    <div className="space-y-1">
      <div className="flex gap-2 items-center">
        <label className="text-sm">{label}:</label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            const newValue = Number(e.target.value) / valueMultiplier;
            if (!isNaN(newValue) && newValue >= min && newValue <= max) {
              onChange(newValue);
            }
          }}
          onBlur={(e) => {
            const newValue = Number(e.target.value) / valueMultiplier;
            if (!isNaN(newValue) && newValue >= min && newValue <= max) {
              onChange(newValue);
            } else {
              setInputValue((value * valueMultiplier).toFixed(precision));
            }
          }}
          className="w-20 px-2 py-1 border rounded text-sm"
        />
        <span className="text-sm">{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => {
          const newValue = Number(e.target.value);
          onChange(newValue);
          setInputValue((newValue * valueMultiplier).toFixed(precision));
        }}
        className="w-full"
      />
    </div>
  );
};
export const FrequencyControl = ({ frequency, onChange }) => {
  const [inputValue, setInputValue] = useState(frequency.toFixed(1));

  useEffect(() => {
    setInputValue(frequency.toFixed(1));
  }, [frequency]);

  return (
    <div className="space-y-1">
      <div className="flex gap-2 items-center">
        <label className="text-sm">Frequency:</label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            const newFreq = Number(e.target.value);
            if (!isNaN(newFreq) && newFreq >= 20 && newFreq <= 10000) {
              onChange(newFreq);
            }
          }}
          onBlur={(e) => {
            const newFreq = Number(e.target.value);
            if (!isNaN(newFreq) && newFreq >= 20 && newFreq <= 10000) {
              onChange(newFreq);
            } else {
              setInputValue(frequency.toFixed(1));
            }
          }}
          className="w-24 px-2 py-1 border rounded text-sm"
        />
        <span className="text-sm">Hz</span>
      </div>
      <input
        type="range"
        min="20"
        max="10000"
        step="0.1"
        value={frequency}
        onChange={(e) => {
          const newFreq = Number(e.target.value);
          onChange(newFreq);
          setInputValue(newFreq.toFixed(1));
        }}
        className="w-full"
      />
    </div>
  );
};