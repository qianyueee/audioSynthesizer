import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Control } from './components/Controls';
import { SoundList } from './components/SoundList';
import { ExportControl } from './components/ExportControl';
import { PresetControl } from './components/PresetControl';
import { useAudioContext } from './hooks/useAudioContext';
import { useEffects } from './hooks/useEffects';
import { useOscillators } from './hooks/useOscillators';
import { PlusCircle } from "lucide-react";
import { WaveformVisualizer } from './components/WaveformVisualizer';

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
  
  const { audioContext, masterGain, initAudio } = useAudioContext();
  const { reverb, lfo, vibratoGain, initEffects, cleanupEffects } = useEffects(audioContext, masterGain);
  const { 
    oscillators, 
    addOscillator, 
    removeOscillator, 
    updateOscillator,
    setOscillators 
  } = useOscillators(audioContext, masterGain);

  // 默认振荡器配置
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

  // 播放/停止控制
  const handlePlayStop = useCallback(async () => {
    if (isPlaying) {
      // 停止播放
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
          
          // 清理 tremolo
          if (osc.tremolo?.intervalId) {
            clearInterval(osc.tremolo.intervalId);
          }
        } catch (error) {
          console.warn('Error stopping oscillator:', error);
        }
      });
      
      setOscillators(oscillators.map(osc => ({
        ...osc,
        nodes: null,
        tremolo: {
          ...osc.tremolo,
          nodes: null,
          intervalId: null
        }
      })));
      setIsPlaying(false);
      cleanupEffects();
    } else {
      // 开始播放
      cleanupEffects();
      
      const { audioContext: ctx, masterGain: gain } = initAudio();
      if (!ctx || !gain) return;

      await initEffects(ctx, gain);
      
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
        
        // 先连接 vibrato，确保它在其他效果之前
        if (vibratoGain) {
          vibratoGain.connect(oscillator.frequency);
        }
        
        // 然后是主信号路径
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(gain);
        
        // 处理 tremolo
        let tremoloNodes = null;
        let intervalId = null;
        
        if (osc.tremolo?.enabled) {
          if (osc.tremolo.type === 'sine') {
            const tremOsc = ctx.createOscillator();
            const tremGain = ctx.createGain();
            
            tremOsc.type = 'sine';
            tremOsc.frequency.value = osc.tremolo.bpm / 60;
            tremGain.gain.value = osc.tremolo.depth;
            
            tremOsc.connect(tremGain);
            tremGain.connect(gainNode.gain);
            tremOsc.start();
            
            tremoloNodes = { oscillator: tremOsc, gain: tremGain };
          } else {
            // Decay 模式
            const period = 60 / osc.tremolo.bpm;
            const decayTime = period * osc.tremolo.depth;
            
            gainNode.gain.setValueAtTime(1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decayTime);
            
            intervalId = setInterval(() => {
              const now = ctx.currentTime;
              gainNode.gain.cancelScheduledValues(now);
              gainNode.gain.setValueAtTime(1, now);
              gainNode.gain.exponentialRampToValueAtTime(0.001, now + decayTime);
            }, period * 1000);
          }
        }
        
        oscillator.start();
        
        return { 
          ...osc, 
          nodes: { oscillator, filter, gain: gainNode },
          tremolo: osc.tremolo ? {
            ...osc.tremolo,
            nodes: tremoloNodes,
            intervalId
          } : null
        };
      });
      
      setOscillators(newOscillators);
      setIsPlaying(true);
    }
  }, [isPlaying, oscillators, globalPreset, initAudio, initEffects, vibratoGain, cleanupEffects]);

  // 模式切换控制
  const handleModeChange = useCallback((newMode) => {
    if (isPlaying) {
      handlePlayStop();
    }
    setMode(newMode);
    if (newMode === 'harmonic') {
      // 创建包含基频和泛音的振荡器数组
      const harmonicOscillators = Array.from({length: 10}, (_, i) => ({
        id: i,
        frequency: Number((baseFrequency * (i + 1)).toFixed(2)),
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

  // 预设保存和加载
  const savePreset = useCallback(() => {
    // 收集所有当前状态
    return {
      mode,
      baseFrequency,
      globalPreset,
      masterVolume,
      vibratoRate,
      vibratoDepth,
      oscillators: oscillators.map(osc => ({
        frequency: osc.frequency,
        volume: osc.volume,
        tremolo: osc.tremolo ? {
          enabled: osc.tremolo.enabled,
          type: osc.tremolo.type,
          bpm: osc.tremolo.bpm,
          depth: osc.tremolo.depth
        } : null
      }))
    };
  }, [mode, baseFrequency, globalPreset, masterVolume, vibratoRate, vibratoDepth, oscillators]);

  const loadPreset = useCallback((preset) => {
    // 应用预设状态
    setMode(preset.mode);
    setBaseFrequency(preset.baseFrequency);
    setGlobalPreset(preset.globalPreset);
    setMasterVolume(preset.masterVolume);
    setVibratoRate(preset.vibratoRate);
    setVibratoDepth(preset.vibratoDepth);
    
    // 停止当前播放
    if (isPlaying) {
      handlePlayStop();
    }
    
    // 设置振荡器
    setOscillators(preset.oscillators.map((osc, index) => ({
      id: index + 1,
      frequency: osc.frequency,
      volume: osc.volume,
      tremolo: osc.tremolo || {
        enabled: false,
        type: 'sine',
        bpm: 120,
        depth: 0.5,
        nodes: null,
        intervalId: null
      },
      nodes: null
    })));
  }, [isPlaying, handlePlayStop, setOscillators]);

  // 效果更新
  useEffect(() => {
    if (lfo && audioContext) {
      lfo.frequency.setValueAtTime(vibratoRate, audioContext.currentTime);
    }
  }, [vibratoRate, lfo, audioContext]);

  useEffect(() => {
    if (vibratoGain && audioContext) {
      vibratoGain.gain.setValueAtTime(vibratoDepth * 10, audioContext.currentTime);
    }
  }, [vibratoDepth, vibratoGain, audioContext]);

  useEffect(() => {
    if (masterGain) {
      masterGain.gain.value = masterVolume;
    }
  }, [masterVolume, masterGain]);

  return (
    <Card className="w-full max-w-xl mx-auto p-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-center">Audio Generator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          {/* 主控制区域 */}
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
                precision={2}
              />
            </div>
          </div>

          {/* 模式选择 */}
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

          {/* 基频控制 (Harmonic 模式) */}
          {mode === 'harmonic' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">Base Frequency</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="20"
                  max="10000"
                  step="0.01"
                  value={Number(baseFrequency).toFixed(2)}
                  onChange={(e) => {
                    const newFreq = Number(Number(e.target.value).toFixed(2));
                    setBaseFrequency(newFreq);
                    
                    if (isPlaying) {
                      oscillators.forEach((osc, index) => {
                        if (osc.nodes?.oscillator) {
                          const harmonicNumber = index + 1;
                          osc.nodes.oscillator.frequency.setValueAtTime(
                            Number((newFreq * harmonicNumber).toFixed(2)),
                            audioContext.currentTime
                          );
                        }
                      });
                    }
                    
                    const updatedOscillators = oscillators.map((osc, index) => ({
                      ...osc,
                      frequency: Number((newFreq * (index + 1)).toFixed(2))
                    }));
                    setOscillators(updatedOscillators);
                  }}
                  className="w-24 px-2 py-1 border rounded text-sm"
                />
                <span className="text-sm">Hz</span>
                <input
                  type="range"
                  min="20"
                  max="10000"
                  step="0.01"
                  value={baseFrequency}
                  onChange={(e) => {
                    const newFreq = Number(Number(e.target.value).toFixed(2));
                    setBaseFrequency(newFreq);
                    
                    if (isPlaying) {
                      oscillators.forEach((osc, index) => {
                        if (osc.nodes?.oscillator) {
                          const harmonicNumber = index + 1;
                          osc.nodes.oscillator.frequency.setValueAtTime(
                            Number((newFreq * harmonicNumber).toFixed(2)),
                            audioContext.currentTime
                          );
                        }
                      });
                    }
                    
                    const updatedOscillators = oscillators.map((osc, index) => ({
                      ...osc,
                      frequency: Number((newFreq * (index + 1)).toFixed(2))
                    }));
                    setOscillators(updatedOscillators);
                  }}
                  className="flex-1"
                />
              </div>
            </div>
          )}

          {/* 音色选择 */}
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

          {/* Vibrato 控制 */}
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
                precision={1}
              />
              <Control
                label="Depth"
                value={vibratoDepth}
                onChange={setVibratoDepth}
                min={0}
                max={1}
                precision={2}
              />
            </div>
          </div>

          {/* 振荡器列表 */}
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

          {/* 预设控制 */}
          <PresetControl
            onSave={savePreset}
            onLoad={loadPreset}
          />

          {/* 导出控制 */}
          <ExportControl
            audioContext={audioContext}
            oscillators={oscillators}
            masterGain={masterGain}
            initAudio={initAudio}
            globalPreset={globalPreset}
            presets={presets}
          />
          <WaveformVisualizer
            audioContext={audioContext}
            masterGain={masterGain}
            isPlaying={isPlaying}
            height={150}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioGenerator;