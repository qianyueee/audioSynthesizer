import React from 'react';
import { Control } from './Controls';

export const TremoloControl = ({ tremolo, onChange }) => {
  if (!tremolo) return null;

  return (
    <div className="mt-4 space-y-2 border-t pt-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Tremolo</label>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ ...tremolo, enabled: !tremolo.enabled })}
            className={`px-2 py-1 rounded text-xs ${
              tremolo.enabled 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {tremolo.enabled ? 'ON' : 'OFF'}
          </button>
          <select
            value={tremolo.type}
            onChange={(e) => onChange({ ...tremolo, type: e.target.value })}
            className="text-xs px-2 py-1 rounded border"
            disabled={!tremolo.enabled}
          >
            <option value="sine">Sine</option>
            <option value="decay">Decay</option>
          </select>
        </div>
      </div>
      
      {tremolo.enabled && (
        <div className="space-y-2">
          <Control
            label="BPM"
            value={tremolo.bpm}
            onChange={(v) => onChange({ ...tremolo, bpm: v })}
            min={30}
            max={240}
            step={1}
            unit=" BPM"
            valueMultiplier={1}
          />
{tremolo.type === 'sine' ? (
  <Control
    label="Depth"
    value={tremolo.depth}
    onChange={(v) => onChange({ ...tremolo, depth: v })}
    min={0}
    max={1}
    step={0.01}
  />
) : (
  <Control
    label="Decay Ratio"
    value={tremolo.depth}
    onChange={(v) => onChange({ ...tremolo, depth: v })}
    min={0.2}  // 避免完全没有衰减时间
    max={1  }  // 避免完全没有维持时间
    step={0.01}
  />
)}
        </div>
      )}
    </div>
  );
};