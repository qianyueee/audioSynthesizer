import React, { useEffect, useRef, useState } from 'react';

export const WaveformVisualizer = ({ 
  audioContext, 
  masterGain, 
  isPlaying, 
  height = 200
}) => {
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastDataRef = useRef([]);
  const frameCountRef = useRef(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 创建分析器节点
  useEffect(() => {
    if (!audioContext || !masterGain) return;
    
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    masterGain.connect(analyser);
    analyserRef.current = analyser;
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioContext, masterGain]);

  // 绘制波形
  useEffect(() => {
    if (!analyserRef.current || !canvasRef.current || isMinimized) return;
    
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    // 确保canvas大小正确
    const updateCanvasSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = height;
    };
    updateCanvasSize();
    
    // 添加窗口大小变化事件
    window.addEventListener('resize', updateCanvasSize);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // 初始化上一帧数据
    if (lastDataRef.current.length === 0) {
      lastDataRef.current = new Array(bufferLength).fill(128);
    }
    
    const drawSpeed = 3;
    
    const draw = () => {
      frameCountRef.current = (frameCountRef.current + 1) % drawSpeed;
      
      if (!isPlaying) {
        canvasCtx.fillStyle = 'rgb(240, 240, 240)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        canvasCtx.lineWidth = 3;
        canvasCtx.strokeStyle = 'rgb(200, 200, 200)';
        canvasCtx.beginPath();
        canvasCtx.moveTo(0, canvas.height / 2);
        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      
      if (frameCountRef.current === 0) {
        analyser.getByteTimeDomainData(dataArray);
        
        for (let i = 0; i < bufferLength; i++) {
          lastDataRef.current[i] = dataArray[i] * 0.8 + lastDataRef.current[i] * 0.2;
        }
      }
      
      canvasCtx.fillStyle = 'rgb(245, 245, 245)';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 绘制网格线
      canvasCtx.lineWidth = 1;
      canvasCtx.strokeStyle = 'rgb(220, 220, 220)';
      
      // 水平网格线
      for (let i = 0; i <= 4; i++) {
        canvasCtx.beginPath();
        const y = (canvas.height / 4) * i;
        canvasCtx.moveTo(0, y);
        canvasCtx.lineTo(canvas.width, y);
        canvasCtx.stroke();
      }
      
      // 垂直网格线
      for (let i = 0; i <= 8; i++) {
        canvasCtx.beginPath();
        const x = (canvas.width / 8) * i;
        canvasCtx.moveTo(x, 0);
        canvasCtx.lineTo(x, canvas.height);
        canvasCtx.stroke();
      }
      
      // 绘制波形
      canvasCtx.lineWidth = 3;
      
      const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0, 90, 255, 0.8)');
      gradient.addColorStop(0.5, 'rgba(0, 60, 210, 0.9)');
      gradient.addColorStop(1, 'rgba(0, 90, 255, 0.8)');
      canvasCtx.strokeStyle = gradient;
      
      canvasCtx.beginPath();
      
      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = lastDataRef.current[i] / 128.0;
        const y = v * canvas.height / 2;
        
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      canvasCtx.stroke();
      
      // 添加中心线
      canvasCtx.lineWidth = 1;
      canvasCtx.strokeStyle = 'rgba(180, 180, 180, 0.5)';
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, canvas.height / 2);
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
      
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [isPlaying, height, isMinimized, analyserRef.current, canvasRef.current]);

  // 拖动处理
  const handleMouseDown = (e) => {
    if (e.target.classList.contains('drag-handle')) {
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      className="fixed shadow-lg rounded-lg overflow-hidden"
      style={{ 
        width: isMinimized ? '150px' : '300px',
        height: isMinimized ? '40px' : `${height + 40}px`,
        top: `${position.y}px`, 
        left: `${position.x}px`,
        zIndex: 1000,
        backgroundColor: 'white',
        transition: 'width 0.3s, height 0.3s'
      }}
      onMouseDown={handleMouseDown}
    >
      <div 
        className="drag-handle flex justify-between items-center px-2 py-1 bg-blue-500 text-white cursor-move"
        style={{ height: '40px' }}
      >
        <h3 className="text-sm font-medium drag-handle">Waveform</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="px-2 rounded hover:bg-blue-600"
          >
            {isMinimized ? '□' : '_'}
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <div className="p-2 bg-gray-50">
          <canvas 
            ref={canvasRef}
            className="w-full"
            style={{ height: `${height}px` }}
          />
        </div>
      )}
    </div>
  );
};