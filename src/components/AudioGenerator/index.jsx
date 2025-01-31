import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Control } from './components/Controls';
import { SoundList } from './components/SoundList';
import { ExportControl } from './components/ExportControl';
import { useAudioContext } from './hooks/useAudioContext';
import { useEffects } from './hooks/useEffects';
import { useOscillators } from './hooks/useOscillators';
import { PlusCircle } from "lucide-react";

const presets = {
  bright: {
    name: 'Bright',
    waveform: 'sawtooth',
    filterType: 'lowpass',
    filterFreq: 1100,
    filterQ: 2
  },
  soft: {
    name: 'Soft',
    waveform: 'triangle',
    filterType: 'lowpass',
    filterFreq: 1000,
    filterQ: 3
  }
};

const AudioGenerator = () => {
  // 基础状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [globalPreset, setGlobalPreset] = useState('bright');
  const [masterVolume, setMasterVolume] = useState(0.7);
  const [vibratoRate, setVibratoRate] = useState(5);
  const [vibratoDepth, setVibratoDepth] = useState(0);
  const [mode, setMode] = useState('free');
  const [baseFrequency, setBaseFrequency] = useState(220);
  const [baseFreqInput, setBaseFreqInput] = useState('220.0');

  const { audioContext, masterGain, initAudio } = useAudioContext();
  const { reverb, lfo, vibratoGain, initEffects, cleanupEffects } = useEffects(audioContext, masterGain);
  const { 
    oscillators, 
    addOscillator, 
    removeOscillator, 
    updateOscillator,
    setOscillators 
  } = useOscillators(audioContext, masterGain);
  const updateBaseFrequency = useCallback((newFreq) => {
    setBaseFrequency(newFreq);
    
    // 直接构建新的振荡器数组
    const newOscillators = Array.from({length: oscillators.length}, (_, i) => {
      const oldOsc = oscillators[i];
      const newFrequency = newFreq * (i + 1);
      
      // 如果正在播放，更新实际频率
      if (isPlaying && oldOsc.nodes?.oscillator) {
        oldOsc.nodes.oscillator.frequency.setValueAtTime(
          newFrequency,
          audioContext.currentTime
        );
      }
      
      return {
        ...oldOsc,
        frequency: newFrequency
      };
    });
    
    setOscillators(newOscillators);
  }, [oscillators, isPlaying, audioContext]);

  // Vibrato 参数更新
  React.useEffect(() => {
    if (lfo && audioContext) {
      lfo.frequency.setValueAtTime(vibratoRate, audioContext.currentTime);
    }
  }, [vibratoRate, lfo, audioContext]);

  React.useEffect(() => {
    if (vibratoGain && audioContext) {
      vibratoGain.gain.setValueAtTime(vibratoDepth * 10, audioContext.currentTime);
    }
  }, [vibratoDepth, vibratoGain, audioContext]);

  // 更新主音量
  React.useEffect(() => {
    if (masterGain && audioContext) {
      masterGain.gain.setValueAtTime(masterVolume, audioContext.currentTime);
    }
  }, [masterVolume, masterGain, audioContext]);

  // 播放控制
  const handlePlayStop = useCallback(async () => {
    if (isPlaying) {
      // 修改停止逻辑，添加更多检查
      oscillators.forEach(osc => {
        try {
          if (osc.nodes) {
            if (osc.nodes.oscillator && typeof osc.nodes.oscillator.stop === 'function') {
              osc.nodes.oscillator.stop();
            }
            if (osc.nodes.oscillator && typeof osc.nodes.oscillator.disconnect === 'function') {
              osc.nodes.oscillator.disconnect();
            }
            if (osc.nodes.filter) {
              osc.nodes.filter.disconnect();
            }
            if (osc.nodes.gain) {
              osc.nodes.gain.disconnect();
            }
          }
        } catch (error) {
          console.warn('Error stopping oscillator:', error);
        }
      });
      
      setOscillators(oscillators.map(osc => ({
        ...osc,
        nodes: null
      })));
      setIsPlaying(false);
      cleanupEffects();
    } else {
      cleanupEffects();
      
      const { audioContext: ctx, masterGain: gain } = initAudio();
      if (!ctx || !gain) return;

      const effects = await initEffects(ctx, gain);
      
      const preset = presets[globalPreset];
      const newOscillators = oscillators.map(osc => {
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const oscillator = ctx.createOscillator();
        
        gainNode.gain.value = osc.volume;
        filter.type = preset.filterType;
        filter.frequency.value = preset.filterFreq;
        filter.Q.value = preset.filterQ;
        
        oscillator.type = preset.waveform;
        oscillator.frequency.setValueAtTime(osc.frequency, ctx.currentTime);

        // 连接 vibrato
        if (effects.vibratoGain) {
          effects.vibratoGain.connect(oscillator.frequency);
        }
        
        // 主音频路径
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(gain);
        
        oscillator.start();
        
        return { 
          ...osc, 
          nodes: { oscillator, filter, gain: gainNode }
        };
      });
      
      setOscillators(newOscillators);
      setIsPlaying(true);
    }
  }, [isPlaying, oscillators, globalPreset, initAudio, initEffects, cleanupEffects]);

  // 模式切换处理
 // 在 AudioGenerator 组件内部定义初始振荡器配置
  const defaultOscillators = [
  { 
    id: 1, 
    frequency: 440, 
    volume: 0.5,
    tremolo: {
      enabled: false,
      type: 'sine',
      bpm: 120,
      depth: 0.5,
      nodes: null,
      intervalId: null
    },
    nodes: null 
  },
  { 
    id: 2, 
    frequency: 880, 
    volume: 0.3,
    tremolo: {
      enabled: false,
      type: 'sine',
      bpm: 120,
      depth: 0.5,
      nodes: null,
      intervalId: null
    },
    nodes: null 
  }
  ];

// 修改模式切换函数
const handleModeChange = useCallback((newMode) => {
  if (isPlaying) {
    handlePlayStop();
  }
  setMode(newMode);
  if (newMode === 'harmonic') {
    // 创建包含基频和泛音的振荡器数组
    const harmonicOscillators = Array.from({length: 10}, (_, i) => ({
      id: i,
      frequency: baseFrequency * (i + 1), // 从基频开始，每个泛音乘以相应倍数
      volume: i === 0 ? 1 : 1 / ((i + 1) * 1.5),
      tremolo: {
        enabled: false,
        type: 'sine',
        bpm: 120,
        depth: 0.5,
        nodes: null,
        intervalId: null
      },
      nodes: null
    }));
    setOscillators(harmonicOscillators);
  } else {
    // 切换回 free 模式时使用默认配置
    setOscillators(defaultOscillators);
  }
}, [isPlaying, handlePlayStop, baseFrequency]);

  return (
    <Card className="w-full max-w-xl mx-auto p-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-center">Audio Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          {/* Master Controls */}
          <div className="flex gap-3 items-start">
            <button
              onClick={handlePlayStop}
              className={`px-4 py-2 rounded font-medium ${
                isPlaying
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isPlaying ? 'Stop' : 'Play'}
            </button>
            <div className="flex-1">
              <Control
                label="Master Volume"
                value={masterVolume}
                onChange={setMasterVolume}
                min={0}
                max={1}
              />
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-1">
            <label className="block text-sm">Mode:</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleModeChange('free')}
                className={`px-3 py-1.5 rounded text-sm ${
                  mode === 'free' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Free Mode
              </button>
              <button
                onClick={() => handleModeChange('harmonic')}
                className={`px-3 py-1.5 rounded text-sm ${
                  mode === 'harmonic' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Harmonic Mode
              </button>
            </div>
          </div>

          {/* Base Frequency Control for Harmonic Mode */}
          {mode === 'harmonic' && (
  <div className="space-y-2">
    <label className="block text-sm font-medium">Base Frequency</label>
    <div className="flex gap-2 items-center">
      <input
        type="number"
        min="20"
        max="10000"
        step="0.1"
        value={baseFrequency}
        onChange={(e) => updateBaseFrequency(Number(e.target.value))}
        className="w-24 px-2 py-1 border rounded text-sm"
      />
      <span className="text-sm">Hz</span>
      <input
        type="range"
        min="20"
        max="10000"
        step="0.1"
        value={baseFrequency}
        onChange={(e) => updateBaseFrequency(Number(e.target.value))}
        className="flex-1"
      />
    </div>
  </div>
)}

          {/* Preset Selection */}
          <div className="space-y-1">
            <label className="block text-sm">Timbre:</label>
            <div className="flex gap-2">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => {
                    setGlobalPreset(key);
                    if (isPlaying) {
                      oscillators.forEach(osc => {
                        if (osc.nodes?.oscillator && osc.nodes?.filter) {
                          osc.nodes.oscillator.type = preset.waveform;
                          osc.nodes.filter.type = preset.filterType;
                          osc.nodes.filter.frequency.setValueAtTime(
                            preset.filterFreq, 
                            audioContext.currentTime
                          );
                          osc.nodes.filter.Q.setValueAtTime(
                            preset.filterQ, 
                            audioContext.currentTime
                          );
                        }
                      });
                    }
                  }}
                  className={`px-3 py-1.5 rounded text-sm ${
                    globalPreset === key 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Vibrato Controls */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Vibrato</label>
            <div className="space-y-3">
              <Control
                label="Rate"
                value={vibratoRate}
                onChange={setVibratoRate}
                min={0.1}
                max={20}
                step={0.1}
                unit="Hz"
                valueMultiplier={1}
              />
              <Control
                label="Depth"
                value={vibratoDepth}
                onChange={setVibratoDepth}
                min={0}
                max={1}
              />
            </div>
          </div>

          {/* Sound List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Sound</h3>
              {mode === 'free' && (
                <button
                  onClick={addOscillator}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                >
                  <PlusCircle size={14} />
                  Add Sound
                </button>
              )}
            </div>
            
            <SoundList
              oscillators={oscillators}
              onAdd={mode === 'free' ? addOscillator : undefined}
              onRemove={mode === 'free' ? removeOscillator : undefined}
              onUpdate={updateOscillator}
              audioContext={audioContext}
            />
          </div>

          {/* Export Control */}
          <ExportControl
            audioContext={audioContext}
            oscillators={oscillators}
            masterGain={masterGain}
            initAudio={initAudio}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioGenerator;