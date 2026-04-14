'use client';

import { useState, useEffect, useRef } from 'react';
import { AudioEngine } from '@/lib/audio/engine';
import { AudioVisualizer } from '@/components/audio/AudioVisualizer';

export function AudioRecorder({ onRecordingComplete }: { onRecordingComplete: (file: File) => void }) {
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  const initEngine = async () => {
    const freshEngine = new AudioEngine();
    try {
      await freshEngine.initialize();
      setEngine(freshEngine);
      setHasPermission(true);
      setRecordedBlob(null);
    } catch (err) {
      console.error('Failed to init mic', err);
      alert('Could not access microphone');
    }
  };

  const startRecording = () => {
    if (!engine) return;
    setRecordedBlob(null);
    engine.startRecording();
    setIsRecording(true);
  };

  const stopRecording = async () => {
    if (!engine) return;
    const blob = await engine.stopRecording();
    setIsRecording(false);
    setRecordedBlob(blob);
    
    // Convert blob to file and pass it up
    const file = new File([blob], 'recording.webm', { type: blob.type });
    onRecordingComplete(file);
  };

  useEffect(() => {
    return () => {
      if (engine) engine.stop();
    };
  }, [engine]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {!hasPermission ? (
        <div className="glass-panel flex-center" style={{ padding: '40px', flexDirection: 'column', gap: '16px' }}>
          <p>We need microphone access to record your voice samples.</p>
          <button className="btn btn-primary" onClick={initEngine}>
            Enable Microphone
          </button>
        </div>
      ) : (
        <>
          <AudioVisualizer engine={engine} isActive={true} />
          
          <div className="flex-center" style={{ gap: '16px' }}>
            {!isRecording ? (
              <button 
                className="btn btn-primary" 
                onClick={startRecording}
                style={{ borderRadius: '50px', padding: '16px 32px' }}
              >
                🔴 Start Recording
              </button>
            ) : (
              <button 
                className="btn" 
                onClick={stopRecording}
                style={{ borderRadius: '50px', padding: '16px 32px', background: 'var(--color-error)', color: 'white', border: 'none' }}
              >
                ⬜ Stop Recording
              </button>
            )}
            
            {recordedBlob && !isRecording && (
              <audio 
                ref={audioPlayerRef} 
                src={URL.createObjectURL(recordedBlob)} 
                controls 
                style={{ height: '50px' }}
              />
            )}
          </div>
          
          <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <h4 style={{ marginBottom: '12px', color: 'var(--color-primary-light)' }}>Read this script:</h4>
            <div style={{ fontSize: '1.1rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              "The quick brown fox jumps over the lazy dog. Recording my voice helps the AI understand my unique pitch, tone, and pacing. I consent to my voice being used for training an AI model on the Voice Marketplace platform."
            </div>
          </div>
        </>
      )}
    </div>
  );
}
