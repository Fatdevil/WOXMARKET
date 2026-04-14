'use client';

import { useEffect, useRef } from 'react';
import { AudioEngine } from '@/lib/audio/engine';

interface Props {
  engine: AudioEngine | null;
  isActive: boolean;
}

export function AudioVisualizer({ engine, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        width = rect.width;
        height = rect.height;
      }
    };

    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      if (!engine || !engine.isRunning) {
        drawIdle(ctx, width, height);
      } else {
        const timeData = engine.getTimeDomainData();
        const freqData = engine.getFrequencyData();
        
        if (timeData.length) {
          drawFrequencyBars(ctx, freqData, width, height);
          drawWaveform(ctx, timeData, width, height);
        } else {
          drawIdle(ctx, width, height);
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    if (isActive) {
      draw();
    } else {
      drawIdle(ctx, width, height);
    }

    return () => {
      window.removeEventListener('resize', resize);
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [engine, isActive]);

  // Private drawing helpers inside 
  const drawFrequencyBars = (ctx: CanvasRenderingContext2D, data: Uint8Array, w: number, h: number) => {
    const barCount = 64;
    const barWidth = w / barCount;
    const step = Math.floor(data.length / barCount);
    
    // Primary: 124, 58, 237 | Secondary: 6, 182, 212
    for (let i = 0; i < barCount; i++) {
        const value = data[i * step] / 255.0;
        const barHeight = value * h * 0.7;

        const t = i / barCount;
        const r = Math.round(124 * (1 - t) + 6 * t);
        const g = Math.round(58 * (1 - t) + 182 * t);
        const b = Math.round(237 * (1 - t) + 212 * t);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.1 + value * 0.2})`;
        
        const x = i * barWidth;
        const y = (h - barHeight) / 2;
        ctx.beginPath();
        ctx.roundRect(x + 1, y, Math.max(1, barWidth - 2), barHeight, barWidth * 0.3);
        ctx.fill();
    }
  };

  const drawWaveform = (ctx: CanvasRenderingContext2D, data: Uint8Array, w: number, h: number) => {
    const sliceWidth = w / data.length;
    
    ctx.beginPath();
    ctx.lineWidth = 2;
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, 'rgba(124, 58, 237, 0.9)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.9)');
    ctx.strokeStyle = gradient;

    for (let i = 0; i < data.length; i++) {
        const v = data[i] / 128.0;
        const y = (v * h) / 2;
        const x = i * sliceWidth;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const drawIdle = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    const time = Date.now() / 2000;
    ctx.beginPath();
    ctx.lineWidth = 1.5;
    
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, 'rgba(124, 58, 237, 0.3)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.3)');
    ctx.strokeStyle = gradient;

    for (let x = 0; x < w; x++) {
        const y = h / 2 + Math.sin(x * 0.02 + time) * 3 + Math.sin(x * 0.01 + time * 0.7) * 2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  return (
    <div style={{ width: '100%', height: '150px', background: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
