import React, { useState } from 'react';

export const ExportControl = ({
  audioContext,
  oscillators,
  masterGain,
  initAudio,
  globalPreset,
  presets
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    sampleRate: 44100,
    bitDepth: 16,
    duration: 5
  });

  // 辅助函数：写入字符串到 DataView
  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  // 辅助函数：Float32 转换为 16-bit PCM
  function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }

  // 辅助函数：Float32 转换为 24-bit PCM
  function floatTo24BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 3) {
      const s = Math.max(-1, Math.min(1, input[i]));
      const val = s < 0 ? s * 0x800000 : s * 0x7FFFFF;
      output.setUint8(offset, val & 0xFF);
      output.setUint8(offset + 1, (val >> 8) & 0xFF);
      output.setUint8(offset + 2, (val >> 16) & 0xFF);
    }
  }

  // 辅助函数：Float32 转换为 32-bit PCM
  function floatTo32BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 4) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setFloat32(offset, s, true);
    }
  }

  // 辅助函数：创建 WAV 文件头和数据
  function encodeWAV(samples, sampleRate, bitDepth) {
    const buffer = new ArrayBuffer(44 + samples.length * (bitDepth / 8));
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * (bitDepth / 8), true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * (bitDepth / 8), true);

    switch (bitDepth) {
      case 16:
        floatTo16BitPCM(view, 44, samples);
        break;
      case 24:
        floatTo24BitPCM(view, 44, samples);
        break;
      case 32:
        floatTo32BitPCM(view, 44, samples);
        break;
      default:
        floatTo16BitPCM(view, 44, samples);
    }

    return view;
  }

  // 辅助函数：将多声道音频数据交织在一起
  function interleaveChannels(buffer) {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length * numChannels;
    const result = new Float32Array(length);

    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        result[i * numChannels + channel] = buffer.getChannelData(channel)[i];
      }
    }

    return result;
  }

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // 创建离线上下文
      const offlineContext = new OfflineAudioContext({
        numberOfChannels: 2,
        length: Math.ceil(exportSettings.sampleRate * exportSettings.duration),
        sampleRate: exportSettings.sampleRate
      });

      // 创建主增益节点
      const offlineMaster = offlineContext.createGain();
      offlineMaster.connect(offlineContext.destination);
      offlineMaster.gain.value = masterGain.gain.value;

      // 获取当前预设
      const preset = presets[globalPreset];

      // 为每个振荡器创建音频节点
      oscillators.forEach(osc => {
        // 基本节点
        const oscillator = offlineContext.createOscillator();
        const gain = offlineContext.createGain();
        const filter = offlineContext.createBiquadFilter();

        // 设置基本参数
        oscillator.type = preset.waveform;
        oscillator.frequency.value = osc.frequency;
        gain.gain.value = osc.volume;

        // 设置滤波器
        filter.type = preset.filterType;
        filter.frequency.value = preset.filterFreq;
        filter.Q.value = preset.filterQ;

        // Tremolo 效果
        if (osc.tremolo?.enabled) {
          if (osc.tremolo.type === 'sine') {
            const tremOsc = offlineContext.createOscillator();
            const tremGain = offlineContext.createGain();

            tremOsc.frequency.value = osc.tremolo.bpm / 60;
            tremGain.gain.value = osc.tremolo.depth;

            tremOsc.connect(tremGain);
            tremGain.connect(gain.gain);
            tremOsc.start();
          } else {
            // Decay 模式
            const period = 60 / osc.tremolo.bpm;
            const decayTime = period * osc.tremolo.depth;

            let time = 0;
            while (time < exportSettings.duration) {
              gain.gain.setValueAtTime(1, time);
              gain.gain.exponentialRampToValueAtTime(0.001, time + decayTime);
              time += period;
            }
          }
        }

        // 连接节点
        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(offlineMaster);

        // 启动振荡器
        oscillator.start();
      });

      // 渲染音频
      const renderedBuffer = await offlineContext.startRendering();

      // 交织声道
      const interleaved = interleaveChannels(renderedBuffer);

      // 编码为 WAV
      const wavData = encodeWAV(interleaved, exportSettings.sampleRate, exportSettings.bitDepth);

      // 创建 Blob 并下载
      const blob = new Blob([wavData.buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audio_export_${exportSettings.sampleRate}Hz_${exportSettings.bitDepth}bit.wav`;
      link.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
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
              <option value="88200">88.2 kHz</option>
              <option value="96000">96 kHz</option>
              <option value="176400">176.4 kHz</option>
              <option value="192000">192 kHz</option>
              <option value="352800">352.8 kHz</option>
              <option value="384000">384 kHz</option>
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