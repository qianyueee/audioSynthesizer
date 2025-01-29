import { useState, useEffect, useCallback } from 'react';

export const useEffects = (audioContext, masterGain) => {
  const [nodes, setNodes] = useState({
    reverb: null,
    lfo: null,
    vibratoGain: null
  });

  const cleanupEffects = useCallback(() => {
    if (nodes.lfo) {
      nodes.lfo.stop();
      nodes.lfo.disconnect();
    }
    if (nodes.vibratoGain) {
      nodes.vibratoGain.disconnect();
    }
    if (nodes.reverb) {
      nodes.reverb.disconnect();
    }
  }, [nodes]);

  const initEffects = useCallback(async (context, master) => {
    if (!context || !master) return;

    // 先清理现有的效果
    cleanupEffects();

    const convolver = context.createConvolver();
    const impulseLength = 0.5;
    const impulse = context.createBuffer(
      2,
      context.sampleRate * impulseLength,
      context.sampleRate
    );

    for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * 0.1));
      }
    }
    
    convolver.buffer = impulse;
    const reverbGain = context.createGain();
    const lfo = context.createOscillator();
    const vibratoGain = context.createGain();

    reverbGain.gain.value = 0.16;
    lfo.frequency.value = 5;
    vibratoGain.gain.value = 0;

    master.connect(convolver);
    convolver.connect(reverbGain);
    reverbGain.connect(context.destination);
    lfo.connect(vibratoGain);
    lfo.start();

    setNodes({
      reverb: convolver,
      lfo,
      vibratoGain
    });

    return {
      reverb: convolver,
      lfo,
      vibratoGain
    };
  }, [cleanupEffects]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanupEffects();
    };
  }, [cleanupEffects]);

  return {
    ...nodes,
    initEffects,
    cleanupEffects
  };
};