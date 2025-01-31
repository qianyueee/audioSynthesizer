import { useState, useCallback } from 'react';

export const useAudioContext = () => {
  const [audioContext, setAudioContext] = useState(null);
  const [masterGain, setMasterGain] = useState(null);

  const initAudio = useCallback(() => {
    if (audioContext) {
      return { audioContext, masterGain };
    }
  
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const master = context.createGain();
    master.connect(context.destination);
    
    setAudioContext(context);
    setMasterGain(master);
  
    return { audioContext: context, masterGain: master };
  }, [audioContext, masterGain]);
  return { audioContext, masterGain, initAudio };
};