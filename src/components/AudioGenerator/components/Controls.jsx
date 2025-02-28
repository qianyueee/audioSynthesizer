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
  const [inputValue, setInputValue] = useState(frequency.toFixed(2));  // 改为两位小数

  useEffect(() => {
    setInputValue(frequency.toFixed(2));  // 改为两位小数
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
              onChange(Number(newFreq.toFixed(2)));  // 确保更新时也保持两位小数
            }
          }}
          onBlur={(e) => {
            const newFreq = Number(e.target.value);
            if (!isNaN(newFreq) && newFreq >= 20 && newFreq <= 10000) {
              onChange(Number(newFreq.toFixed(2)));
              setInputValue(newFreq.toFixed(2));
            } else {
              setInputValue(frequency.toFixed(2));
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
        step="0.01"  // 改为 0.01 以支持两位小数
        value={frequency}
        onChange={(e) => {
          const newFreq = Number(Number(e.target.value).toFixed(2));  // 确保是两位小数
          onChange(newFreq);
          setInputValue(newFreq.toFixed(2));
        }}
        className="w-full"
      />
    </div>
  );
};