'use client';

export class AudioEngine {
  audioContext: AudioContext | null = null;
  sourceNode: MediaStreamAudioSourceNode | null = null;
  gainNode: GainNode | null = null;
  analyserNode: AnalyserNode | null = null;
  mediaRecorder: MediaRecorder | null = null;
  stream: MediaStream | null = null;
  chunks: Blob[] = [];
  
  isRunning = false;
  isRecording = false;

  async initialize() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 44100,
      });

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);

      this.isRunning = true;
      return true;
    } catch (err) {
      console.error('Audio Engine init error:', err);
      throw err;
    }
  }

  getFrequencyData() {
    if (!this.analyserNode) return new Uint8Array(0);
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  getTimeDomainData() {
    if (!this.analyserNode) return new Uint8Array(0);
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(data);
    return data;
  }

  startRecording() {
    if (!this.stream || this.isRecording || !this.audioContext) return;
    
    // We create a media stream destination from the analyser
    const dest = this.audioContext.createMediaStreamDestination();
    this.analyserNode?.connect(dest);

    this.chunks = [];
    
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4'
    ];

    let mimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }

    this.mediaRecorder = new MediaRecorder(dest.stream, {
      mimeType: mimeType || undefined,
      audioBitsPerSecond: 128000
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.start(100);
    this.isRecording = true;
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(new Blob());
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        this.isRecording = false;
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isRunning = false;
  }
}
