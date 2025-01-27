import { useState, useCallback } from 'react';

export const useOscillators = (audioContext, masterGain) => {
  const [oscillators, setOscillators] = useState([
    { id: 1, frequency: 440, volume: 0.5, nodes: null },
    { id: 2, frequency: 880, volume: 0.3, nodes: null }
  ]);
  const [nextId, setNextId] = useState(3);

  const addOscillator = useCallback(() => {
    setOscillators(prev => [
      ...prev,
      { id: nextId, frequency: 440, volume: 0.5, nodes: null }
    ]);
    setNextId(prev => prev + 1);
  }, [nextId]);

  const removeOscillator = useCallback((id) => {
    setOscillators(prev => {
      const osc = prev.find(o => o.id === id);
      if (osc?.nodes) {
        osc.nodes.oscillator?.stop();
        osc.nodes.oscillator?.disconnect();
        osc.nodes.filter?.disconnect();
        osc.nodes.gain?.disconnect();
      }
      return prev.filter(o => o.id !== id);
    });
  }, []);

  const updateOscillator = useCallback((id, updates) => {
    if (!audioContext) return;

    setOscillators(prev => prev.map(osc => {
      if (osc.id !== id) return osc;
      
      const newOsc = { ...osc, ...updates };
      
      if (osc.nodes) {
        if (updates.frequency !== undefined) {
          osc.nodes.oscillator.frequency.setValueAtTime(
            updates.frequency,
            audioContext.currentTime
          );
        }
        if (updates.volume !== undefined) {
          osc.nodes.gain.gain.value = updates.volume;
        }
      }
      
      return newOsc;
    }));
  }, [audioContext]);

  return {
    oscillators,
    addOscillator,
    removeOscillator,
    updateOscillator,
    setOscillators
  };
};