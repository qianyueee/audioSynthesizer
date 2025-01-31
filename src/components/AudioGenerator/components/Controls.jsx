import React, { useState } from 'react';

export const Control = ({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step = 0.01, 
  unit = '%', 
  valueMultiplier = 100 
}) => (
  <div className="space-y-1">
    <label className="block text-sm">
      {label}: {Math.round(value * valueMultiplier)}{unit}
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full"
    />
  </div>
);

export const FrequencyControl = ({ frequency, onChange }) => {
  // 添加本地状态用于输入
  const [inputValue, setInputValue] = useState(frequency.toFixed(1));

  // 处理实际的频率更新
  const handleFrequencyUpdate = (value) => {
    const newFreq = Number(value);
    if (!isNaN(newFreq) && newFreq >= 20 && newFreq <= 10000) {
      onChange(newFreq);
      setInputValue(newFreq.toFixed(1));
    } else {
      // 如果输入无效，恢复到当前频率
      setInputValue(frequency.toFixed(1));
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2 items-center">
        <label className="text-sm">Frequency:</label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={(e) => handleFrequencyUpdate(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.target.blur();
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