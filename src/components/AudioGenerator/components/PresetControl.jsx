import React, { useState, useEffect } from 'react';

export const PresetControl = ({ 
  onSave, 
  onLoad, 
  presets = [] 
}) => {
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState(presets);
  const [selectedPreset, setSelectedPreset] = useState('');

  // 加载保存的预设
  useEffect(() => {
    const loadedPresets = JSON.parse(localStorage.getItem('audioGeneratorPresets') || '[]');
    setSavedPresets(loadedPresets);
  }, []);

  // 保存预设
  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    
    const preset = {
      id: Date.now(),
      name: presetName,
      data: onSave()
    };
    
    const updatedPresets = [...savedPresets, preset];
    localStorage.setItem('audioGeneratorPresets', JSON.stringify(updatedPresets));
    setSavedPresets(updatedPresets);
    setPresetName('');
  };

  // 加载预设
  const handleLoadPreset = () => {
    if (!selectedPreset) return;
    
    const preset = savedPresets.find(p => p.id === Number(selectedPreset));
    if (preset) {
      onLoad(preset.data);
    }
  };

  // 删除预设
  const handleDeletePreset = () => {
    if (!selectedPreset) return;
    
    const updatedPresets = savedPresets.filter(p => p.id !== Number(selectedPreset));
    localStorage.setItem('audioGeneratorPresets', JSON.stringify(updatedPresets));
    setSavedPresets(updatedPresets);
    setSelectedPreset('');
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="text-sm font-medium">Presets</h3>
      <div className="space-y-3">
        {/* Save Preset */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            className="flex-1 px-2 py-1 border rounded text-sm"
          />
          <button
            onClick={handleSavePreset}
            disabled={!presetName.trim()}
            className={`px-3 py-1 rounded text-sm ${
              !presetName.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            Save
          </button>
        </div>
        
        {/* Load Preset */}
        <div className="flex gap-2">
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            className="flex-1 px-2 py-1 border rounded text-sm"
          >
            <option value="">Select a preset</option>
            {savedPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleLoadPreset}
            disabled={!selectedPreset}
            className={`px-3 py-1 rounded text-sm ${
              !selectedPreset
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Load
          </button>
          <button
            onClick={handleDeletePreset}
            disabled={!selectedPreset}
            className={`px-3 py-1 rounded text-sm ${
              !selectedPreset
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};