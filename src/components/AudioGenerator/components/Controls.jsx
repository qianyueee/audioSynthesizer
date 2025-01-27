import React from 'react';

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

export const FrequencyControl = ({ frequency, onChange }) => (
  <div className="space-y-1">
    <div className="flex gap-2 items-center">
      <label className="text-sm">freq:</label>
      <input
        type="number"
        min="20"
        max="20000"
        value={frequency}
        onChange={e => onChange(Number(e.target.value))}
        className="w-20 px-2 py-1 border rounded text-sm"
      />
      <span className="text-sm">Hz</span>
    </div>
    <input
      type="range"
      min="20"
      max="2000"
      value={frequency}
      onChange={e => onChange(Number(e.target.value))}
      className="w-full"
    />
  </div>
);