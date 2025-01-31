import { useState, useCallback } from 'react';

const initialOscillators = [
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

// 修改为导出函数而不是对象
export function useOscillators(audioContext, masterGain) {
  const [oscillators, setOscillators] = useState(initialOscillators);

  const addOscillator = useCallback(() => {
    setOscillators(prev => [
      ...prev,
      {
        id: prev.length + 1,
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
      }
    ]);
  }, []);

  const removeOscillator = useCallback((id) => {
    setOscillators(prev => {
      const osc = prev.find(o => o.id === id);
      if (osc?.nodes) {
        if (osc.nodes.oscillator) osc.nodes.oscillator.stop();
        if (osc.nodes.oscillator) osc.nodes.oscillator.disconnect();
        if (osc.nodes.filter) osc.nodes.filter.disconnect();
        if (osc.nodes.gain) osc.nodes.gain.disconnect();
      }
      if (osc?.tremolo?.intervalId) {
        clearInterval(osc.tremolo.intervalId);
      }
      return prev.filter(o => o.id !== id);
    });
  }, []);

  const updateOscillator = useCallback((id, updates) => {
    setOscillators(prev => prev.map(osc => {
      if (osc.id !== id) return osc;
      const newOsc = { ...osc, ...updates };
      
      if (osc.nodes?.oscillator && updates.frequency !== undefined) {
        osc.nodes.oscillator.frequency.setValueAtTime(
          updates.frequency,
          audioContext.currentTime
        );
      }
      
      if (osc.nodes?.gain && updates.volume !== undefined) {
        osc.nodes.gain.gain.value = updates.volume;
      }
      
      return newOsc;
    }));
  }, [audioContext]);

  return {
    oscillators,
    setOscillators,
    addOscillator,
    removeOscillator,
    updateOscillator
  };
}