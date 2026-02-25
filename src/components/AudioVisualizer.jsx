import React, { useRef, useEffect } from 'react';

export default function AudioVisualizer({ analyzer, analyzerData, isActive }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (!analyzer?.current || !analyzerData?.current) {
        // Draw idle bars when no analyzer
        const barCount = 40;
        const barWidth = 2;
        const gap = (width - barCount * barWidth) / (barCount + 1);

        for (let i = 0; i < barCount; i++) {
          const x = gap + i * (barWidth + gap);
          const idleHeight = 2 + Math.sin(Date.now() * 0.002 + i * 0.3) * 2;
          ctx.fillStyle = 'rgba(232, 226, 217, 0.2)';
          ctx.fillRect(x, height / 2 - idleHeight / 2, barWidth, idleHeight);
        }
        return;
      }

      analyzer.current.getByteFrequencyData(analyzerData.current);
      const data = analyzerData.current;
      const barCount = 40;
      const barWidth = 2;
      const gap = (width - barCount * barWidth) / (barCount + 1);
      const step = Math.floor(data.length / barCount);

      for (let i = 0; i < barCount; i++) {
        const x = gap + i * (barWidth + gap);
        const value = data[i * step] / 255;
        const barHeight = Math.max(2, value * height * 0.85);

        // Gradient from dim to bright based on intensity
        const alpha = 0.15 + value * 0.6;
        ctx.fillStyle = `rgba(232, 226, 217, ${alpha})`;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      }
    };

    draw();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isActive, analyzer, analyzerData]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="audio-visualizer"
      width={320}
      height={60}
      aria-hidden="true"
    />
  );
}
