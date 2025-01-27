import React from 'react';
import { PlusCircle, X } from "lucide-react";
import { Control, FrequencyControl } from './Controls';

export const SoundList = ({ 
  oscillators, 
  onAdd, 
  onRemove, 
  onUpdate,
  audioContext 
}) => {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Sound</h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          <PlusCircle size={14} />
          Add Sound
        </button>
      </div>
      
      {oscillators.map((osc) => (
        <div key={osc.id} className="p-3 border rounded-lg space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium text-sm">Sound {osc.id}</span>
            {oscillators.length > 1 && (
              <button
                onClick={() => onRemove(osc.id)}
                className="text-red-500 hover:text-red-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <FrequencyControl
            frequency={osc.frequency}
            onChange={freq => onUpdate(osc.id, { frequency: freq })}
          />
          
          <Control
            label="Vol"
            value={osc.volume}
            onChange={vol => onUpdate(osc.id, { volume: vol })}
            min={0}
            max={1}
          />
        </div>
      ))}
    </div>
  );
};