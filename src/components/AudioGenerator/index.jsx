import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Control } from './components/Controls';
import { SoundList } from './components/SoundList';
import { useAudioContext } from './hooks/useAudioContext';
import { useEffects } from './hooks/useEffects';
import { useOscillators } from './hooks/useOscillators';
import { PlusCircle } from "lucide-react";

const presets = {
  bright: {
    name: 'bright',
    waveform: 'sawtooth',
    filterType: 'lowpass',
    filterFreq: 1100,
    filterQ: 2
  },
  soft: {
    name: 'soft',
    waveform: 'triangle',
    filterType: 'lowpass',
    filterFreq: 1000,
    filterQ: 3
  }
};

const HARMONICS = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // 泛音序列

const AudioGenerator = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [globalPreset, setGlobalPreset] = useState('bright');
  const [masterVolume, setMasterVolume] = useState(0.7);
  const [vibratoRate, setVibratoRate] = useState(5);
  const [vibratoDepth, setVibratoDepth] = useState(0);
  const [mode, setMode] = useState('free');
  const [baseFrequency, setBaseFrequency] = useState(220);

  const { audioContext, masterGain, initAudio } = useAudioContext();
  const { reverb, lfo, vibratoGain, initEffects, cleanupEffects } = useEffects(audioContext, masterGain);  // 添加 cleanupEffects
  const { 
    oscillators, 
    addOscillator, 
    removeOscillator, 
    updateOscillator,
    setOscillators 
  } = useOscillators(audioContext, masterGain);

  const handleModeChange = useCallback((newMode) => {
    if (isPlaying) {
      handlePlayStop();
    }
    setMode(newMode);
    if (newMode === 'harmonic') {
      const harmonicOscillators = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({
        id: n,
        frequency: baseFrequency * n,
        volume: 1 / (n * 1.5),
        nodes: null
      }));
      setOscillators(harmonicOscillators);
    } else {
      setOscillators([
        { id: 1, frequency: 440, volume: 0.5, nodes: null },
        { id: 2, frequency: 880, volume: 0.3, nodes: null }
      ]);
    }
  }, [isPlaying, handlePlayStop, baseFrequency, setOscillators]);
    
  const handlePlayStop = useCallback(async () => {
    if (isPlaying) {
      oscillators.forEach(osc => {
        if (osc.nodes) {
          try {
            // 检查并停止主振荡器
            if (osc.nodes.oscillator && osc.nodes.oscillator.playbackState === 'playing') {
              osc.nodes.oscillator.stop();
            }
            osc.nodes.oscillator?.disconnect();
            osc.nodes.filter?.disconnect();
            osc.nodes.gain?.disconnect();
  
            // 检查并停止颤音节点
            if (osc.tremolo?.nodes) {
              if (osc.tremolo.nodes.oscillator && osc.tremolo.nodes.oscillator.playbackState === 'playing') {
                osc.tremolo.nodes.oscillator.stop();
              }
              osc.tremolo.nodes.oscillator?.disconnect();
              osc.tremolo.nodes.gain?.disconnect();
              
              // 清除衰减模式的定时器
              if (osc.tremolo.type === 'decay' && osc.tremolo.intervalId) {
                clearInterval(osc.tremolo.intervalId);
              }
            }
          } catch (e) {
            console.error('Error managing audio nodes:', e);
          }
        }
      });
      setOscillators(oscillators.map(osc => ({
        ...osc,
        nodes: null,
        tremolo: osc.tremolo ? {
          ...osc.tremolo,
          nodes: null,
          intervalId: null
        } : null
      })));
      setIsPlaying(false);
      cleanupEffects();
    } else {
      cleanupEffects();
      
      const { audioContext: ctx, masterGain: gain } = initAudio();
      if (!ctx || !gain) return;
  
      await initEffects(ctx, gain);
      
      const preset = presets[globalPreset];
      const newOscillators = oscillators.map(osc => {
        // 创建主音频节点
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const oscillator = ctx.createOscillator();
        
        gainNode.gain.value = osc.volume;
        filter.type = preset.filterType;
        filter.frequency.value = preset.filterFreq;
        filter.Q.value = preset.filterQ;
        
        oscillator.type = preset.waveform;
        oscillator.frequency.setValueAtTime(osc.frequency, ctx.currentTime);
        
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(gain);
        
        if (vibratoGain) {
          vibratoGain.connect(oscillator.frequency);
        }
  
        // 设置颤音
        let tremoloNodes = null;
        if (osc.tremolo?.enabled) {
          const tremOsc = ctx.createOscillator();
          const tremGain = ctx.createGain();
          
          tremGain.gain.value = osc.tremolo.depth;
          
          if (osc.tremolo.type === 'sine') {
            tremOsc.type = 'sine';
            tremOsc.frequency.value = osc.tremolo.bpm / 60;
            
            tremOsc.connect(tremGain);
            tremGain.connect(gainNode.gain);
            tremOsc.start();
          } else if (osc.tremolo.type === 'decay') {
            // 清除之前的间隔定时器（如果存在）
            if (osc.tremolo.intervalId) {
              clearInterval(osc.tremolo.intervalId);
            }
          
            const period = 60 / osc.tremolo.bpm; // 完整周期（秒）
            // 使用 depth 来控制衰减时长占周期的比例
            const decayTime = period * osc.tremolo.depth * 3; // 衰减时长
            const sustainTime = period - decayTime; // 维持时长
          
            // 创建初始包络
            gainNode.gain.setValueAtTime(1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decayTime);
          
            // 设置周期性的音量包络
            const intervalId = setInterval(() => {
              const now = ctx.currentTime;
              gainNode.gain.cancelScheduledValues(now);
              gainNode.gain.setValueAtTime(1, now);
              // 使用 exponentialRampToValueAtTime 创建自然的衰减效果
              gainNode.gain.exponentialRampToValueAtTime(0.001, now + decayTime);
            }, period * 1000);
          
            // 保存间隔定时器ID以便后续清理
            osc.tremolo.intervalId = intervalId;
          }
          
          tremoloNodes = {
            oscillator: tremOsc,
            gain: tremGain
          };
        }
        
        oscillator.start();
        
        return {
          ...osc,
          nodes: {
            oscillator,
            filter,
            gain: gainNode
          },
          tremolo: osc.tremolo ? {
            ...osc.tremolo,
            nodes: tremoloNodes
          } : null
        };
      });
      
      setOscillators(newOscillators);
      setIsPlaying(true);
    }
  }, [isPlaying, oscillators, globalPreset, initAudio, initEffects, vibratoGain, cleanupEffects]);

  React.useEffect(() => {
    if (lfo) lfo.frequency.setValueAtTime(vibratoRate, audioContext?.currentTime);
  }, [vibratoRate, lfo, audioContext]);

  React.useEffect(() => {
    if (vibratoGain) vibratoGain.gain.setValueAtTime(vibratoDepth * 10, audioContext?.currentTime);
  }, [vibratoDepth, vibratoGain, audioContext]);

  React.useEffect(() => {
    if (masterGain) masterGain.gain.setValueAtTime(masterVolume, audioContext?.currentTime);
  }, [masterVolume, masterGain, audioContext]);

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
                label="master"
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

{/* Base Frequency Control */}
{mode === 'harmonic' && (
  <div className="space-y-2">
    <label className="block text-sm font-medium">Base Frequency</label>
    <div className="flex gap-2 items-center">
      <input
        type="number"
        min="20"
        max="10000"
        step="0.1"  // 添加步进值为0.1
        value={Number(baseFrequency).toFixed(1)}  // 固定显示一位小数
        onChange={(e) => {
          const newFreq = Number(e.target.value);
          setBaseFrequency(newFreq);
          
          if (isPlaying) {
            oscillators.forEach((osc, index) => {
              if (osc.nodes?.oscillator) {
                const harmonicNumber = index + 1;
                osc.nodes.oscillator.frequency.setValueAtTime(
                  newFreq * harmonicNumber,
                  audioContext.currentTime
                );
              }
            });
          } else {
            const harmonicOscillators = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({
              id: n,
              frequency: newFreq * n,
              volume: 1 / (n * 1.5),
              nodes: null
            }));
            setOscillators(harmonicOscillators);
          }
        }}
        className="w-24 px-2 py-1 border rounded text-sm"
      />
      <span className="text-sm">Hz</span>
      <input
        type="range"
        min="20"
        max="10000"
        step="0.1"  // 添加步进值为0.1
        value={baseFrequency}
        onChange={(e) => {
          const newFreq = Number(e.target.value);
          setBaseFrequency(newFreq);
          
          if (isPlaying) {
            oscillators.forEach((osc, index) => {
              if (osc.nodes?.oscillator) {
                const harmonicNumber = index + 1;
                osc.nodes.oscillator.frequency.setValueAtTime(
                  newFreq * harmonicNumber,
                  audioContext.currentTime
                );
              }
            });
          } else {
            const harmonicOscillators = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({
              id: n,
              frequency: newFreq * n,
              volume: 1 / (n * 1.5),
              nodes: null
            }));
            setOscillators(harmonicOscillators);
          }
        }}
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
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioGenerator;