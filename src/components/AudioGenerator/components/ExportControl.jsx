import React, { useState } from 'react';

export const ExportControl = ({
  audioContext,
  oscillators,
  masterGain,
  initAudio,
  duration = 5
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    sampleRate: 44100,
    bitDepth: 16,
    duration: duration
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
  
      // 确保音频上下文已初始化
      let ctx = audioContext;
      let gain = masterGain;
      if (!ctx || !gain) {
        const audio = await initAudio();
        ctx = audio.audioContext;
        gain = audio.masterGain;
      }
  
      if (!ctx || !gain || !oscillators.length) {
        console.error('Failed to initialize audio context or no oscillators');
        return;
      }
  
      // 创建离线音频上下文
      const offlineContext = new OfflineAudioContext({
        numberOfChannels: 2,
        length: Math.ceil(exportSettings.sampleRate * exportSettings.duration),
        sampleRate: exportSettings.sampleRate
      });
  
      // 创建主增益节点
      const offlineMasterGain = offlineContext.createGain();
      offlineMasterGain.connect(offlineContext.destination);
      offlineMasterGain.gain.value = gain.gain.value;
  
      // 重新创建所有振荡器
      oscillators.forEach(osc => {
        const oscillator = offlineContext.createOscillator();
        const oscGain = offlineContext.createGain();
        const filter = offlineContext.createBiquadFilter();
  
        // 设置基本参数
        oscillator.type = osc.nodes?.oscillator?.type || 'sine';
        oscillator.frequency.value = osc.frequency;
        oscGain.gain.value = osc.volume;
  
        // 设置滤波器
        if (osc.nodes?.filter) {
          filter.type = osc.nodes.filter.type;
          filter.frequency.value = osc.nodes.filter.frequency.value;
          filter.Q.value = osc.nodes.filter.Q.value;
        }
  
        // 连接节点
        oscillator.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(offlineMasterGain);
  
        // 颤音效果，确保速率正确
        if (osc.tremolo?.enabled) {
          if (osc.tremolo.type === 'sine') {
            const tremOsc = offlineContext.createOscillator();
            const tremGain = offlineContext.createGain();
  
            tremOsc.type = 'sine';
            tremOsc.frequency.value = osc.tremolo.bpm / 60;  // 转换 BPM 为 Hz
            tremGain.gain.value = osc.tremolo.depth;
  
            tremOsc.connect(tremGain);
            tremGain.connect(oscGain.gain);
            tremOsc.start();
          } else {
            // 衰减模式
            const period = 60 / osc.tremolo.bpm;  // 将 BPM 转换为周期时长（秒）
            const decayTime = period * osc.tremolo.depth;
  
            // 创建整个持续时间的包络
            for (let time = 0; time < exportSettings.duration; time += period) {
              oscGain.gain.setValueAtTime(1, time);
              oscGain.gain.exponentialRampToValueAtTime(0.001, time + decayTime);
            }
          }
        }
  
        oscillator.start();
      });
  
      // 渲染音频
      const audioBuffer = await offlineContext.startRendering();
  
      // 转换为指定位深度
      const numberOfChannels = audioBuffer.numberOfChannels;
      const length = audioBuffer.length;
      const bytesPerSample = exportSettings.bitDepth / 8;
      const bufferLength = length * numberOfChannels * bytesPerSample;
  
      // 创建 WAV 文件头
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);
  
      // WAV 文件头格式
      view.setUint32(0, 0x52494646); // "RIFF"
      view.setUint32(4, 36 + bufferLength, true); // 文件大小
      view.setUint32(8, 0x57415645); // "WAVE"
      view.setUint32(12, 0x666D7420); // "fmt "
      view.setUint32(16, 16, true); // fmt chunk size
      view.setUint16(20, 1, true); // 音频格式 (1 = PCM)
      view.setUint16(22, numberOfChannels, true);
      view.setUint32(24, exportSettings.sampleRate, true);
      view.setUint32(28, exportSettings.sampleRate * numberOfChannels * bytesPerSample, true);
      view.setUint16(32, numberOfChannels * bytesPerSample, true);
      view.setUint16(34, exportSettings.bitDepth, true);
      view.setUint32(36, 0x64617461); // "data"
      view.setUint32(40, bufferLength, true);
  
      // 创建音频数据
      const audioData = new Float32Array(length * numberOfChannels);
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        audioData.set(channelData, channel * length);
      }
  
      // 转换为指定位深度
      let outputData;
      if (exportSettings.bitDepth === 16) {
        outputData = new Int16Array(length * numberOfChannels);
        for (let i = 0; i < audioData.length; i++) {
          const s = Math.max(-1, Math.min(1, audioData[i]));
          outputData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
      } else if (exportSettings.bitDepth === 24 || exportSettings.bitDepth === 32) {
        outputData = new Int32Array(length * numberOfChannels);
        for (let i = 0; i < audioData.length; i++) {
          const s = Math.max(-1, Math.min(1, audioData[i]));
          outputData[i] = s < 0 ? s * 0x80000000 : s * 0x7FFFFFFF;
        }
      }
  
      // 合并文件头和音频数据
      const blob = new Blob([wavHeader, outputData], { type: 'audio/wav' });
  
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audio_export_${exportSettings.sampleRate}Hz_${exportSettings.bitDepth}bit.wav`;
      link.click();
  
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="text-sm font-medium">Export Settings</h3>
      <div className="space-y-2">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm">Sample Rate</label>
            <select
              value={exportSettings.sampleRate}
              onChange={(e) => setExportSettings(prev => ({
                ...prev,
                sampleRate: Number(e.target.value)
              }))}
              className="w-full px-2 py-1 border rounded text-sm"
              disabled={isExporting}
            >
              <option value="44100">44.1 kHz</option>
              <option value="48000">48 kHz</option>
              <option value="96000">96 kHz</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm">Bit Depth</label>
            <select
              value={exportSettings.bitDepth}
              onChange={(e) => setExportSettings(prev => ({
                ...prev,
                bitDepth: Number(e.target.value)
              }))}
              className="w-full px-2 py-1 border rounded text-sm"
              disabled={isExporting}
            >
              <option value="16">16 bit</option>
              <option value="24">24 bit</option>
              <option value="32">32 bit</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm">Duration (s)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={exportSettings.duration}
              onChange={(e) => setExportSettings(prev => ({
                ...prev,
                duration: Number(e.target.value)
              }))}
              className="w-full px-2 py-1 border rounded text-sm"
              disabled={isExporting}
            />
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`w-full px-4 py-2 rounded font-medium ${
            isExporting
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isExporting ? 'Exporting...' : 'Export WAV'}
        </button>
      </div>
    </div>
  );
};