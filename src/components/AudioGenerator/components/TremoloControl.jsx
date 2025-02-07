import React from 'react';
import { Control } from './Controls';

export const TremoloControl = ({ tremolo, onChange, audioContext, gainNode }) => {
  if (!tremolo) return null;

  const updateTremoloParams = (updates) => {
    let newTremolo = { ...tremolo, ...updates };
    
    // 如果是开启/关闭颤音
    if ('enabled' in updates) {
      if (updates.enabled) {
        newTremolo = {
          ...newTremolo,
          nodes: newTremolo.nodes || null
        };
      } else {
        // 如果是关闭颤音，清理节点和定时器
        if (newTremolo.intervalId) {
          clearInterval(newTremolo.intervalId);
        }
        if (newTremolo.nodes) {
          newTremolo.nodes.oscillator?.stop();
          newTremolo.nodes.oscillator?.disconnect();
          newTremolo.nodes.gain?.disconnect();
        }
        newTremolo = {
          ...newTremolo,
          nodes: null,
          intervalId: null
        };

        // 重置增益值
        if (gainNode) {
          gainNode.gain.cancelScheduledValues(audioContext?.currentTime || 0);
          gainNode.gain.setValueAtTime(tremolo.volume || 1, audioContext?.currentTime || 0);
        }
      }
    }

    // 如果正在播放且颤音已启用，更新参数
    if (gainNode && newTremolo.enabled) {
      if (newTremolo.type === 'sine') {
        // 创建或更新正弦波节点
        if (!newTremolo.nodes?.oscillator) {
          const oscillator = audioContext.createOscillator();
          const tremGain = audioContext.createGain();
          
          oscillator.type = 'sine';
          oscillator.frequency.value = newTremolo.bpm / 60;
          tremGain.gain.value = newTremolo.depth;

          oscillator.connect(tremGain);
          tremGain.connect(gainNode.gain);
          oscillator.start();

          newTremolo.nodes = {
            oscillator,
            gain: tremGain
          };
        } else {
          // 更新现有节点参数
          newTremolo.nodes.oscillator.frequency.setValueAtTime(
            newTremolo.bpm / 60,
            audioContext.currentTime
          );
          newTremolo.nodes.gain.gain.setValueAtTime(
            newTremolo.depth,
            audioContext.currentTime
          );
        }
      } else if (newTremolo.type === 'decay') {
        // 清理之前的正弦波节点
        if (newTremolo.nodes?.oscillator) {
          newTremolo.nodes.oscillator.stop();
          newTremolo.nodes.oscillator.disconnect();
          newTremolo.nodes.gain.disconnect();
          newTremolo.nodes = null;
        }

        // 更新衰减参数
        const period = 60 / newTremolo.bpm;
        const decayTime = period * newTremolo.depth;

        // 清理之前的定时器
        if (newTremolo.intervalId) {
          clearInterval(newTremolo.intervalId);
        }

        // 设置新的衰减周期
        const now = audioContext.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

        const intervalId = setInterval(() => {
          const currentTime = audioContext.currentTime;
          gainNode.gain.cancelScheduledValues(currentTime);
          gainNode.gain.setValueAtTime(1, currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + decayTime);
        }, period * 1000);

        newTremolo.intervalId = intervalId;
      }
    }

    onChange(newTremolo);
  };

  return (
    <div className="mt-4 space-y-2 border-t pt-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Tremolo</label>
        <div className="flex gap-2">
          <button
            onClick={() => updateTremoloParams({ enabled: !tremolo.enabled })}
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
            onChange={(e) => updateTremoloParams({ type: e.target.value })}
            className="text-xs px-2 py-1 rounded border"
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
            onChange={(v) => updateTremoloParams({ bpm: v })}
            min={30}
            max={240}
            step={1}
            unit=" BPM"
            valueMultiplier={1}
            precision={0}
          />
          <Control
            label={tremolo.type === 'sine' ? 'Depth' : 'Decay Ratio'}
            value={tremolo.depth}
            onChange={(v) => updateTremoloParams({ depth: v })}
            min={0}
            max={1}
            step={0.01}
            unit="%"
            valueMultiplier={100}
            precision={1}
          />
        </div>
      )}
    </div>
  );
};