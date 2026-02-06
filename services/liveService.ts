
import { GoogleGenAI, Modality } from "@google/genai";
import { arrayBufferToBase64, base64ToUint8Array, decodeAudioData, float32ToInt16 } from "./audioUtils";

const API_KEY = process.env.API_KEY?.trim() ?? '';
// Use the recommended model for real-time conversation tasks
const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';

export class LiveService {
  private client: GoogleGenAI;
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isConnected = false;
  private nextStartTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  constructor(apiKey: string = API_KEY) {
    this.client = new GoogleGenAI({ apiKey: apiKey || API_KEY });
  }

  async connect(systemInstructionText: string, onAudioData: (visData: Uint8Array) => void, onClose: () => void) {
    if (this.isConnected) return;
    if (!API_KEY) {
      console.warn('[LiveService] GEMINI_API_KEY が未設定のため接続をスキップします');
      onClose();
      return;
    }

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Setup Microphone Input
    const stream = await navigator.mediaDevices.getUserMedia({ audio: {
      channelCount: 1,
      sampleRate: 16000,
    }});
    
    // Create Input Context (16kHz for Gemini input)
    const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.inputSource = inputCtx.createMediaStreamSource(stream);
    this.processor = inputCtx.createScriptProcessor(4096, 1, 1);

    const config = {
      // Modality MUST be an array with exactly one Modality.AUDIO element
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } 
      },
      systemInstruction: systemInstructionText
    };

    const sessionPromise = this.client.live.connect({
      model: MODEL_NAME,
      config: config as any,
      callbacks: {
        onopen: () => {
          console.log("Live Session Connected");
          this.isConnected = true;
        },
        onmessage: async (msg: any) => {
          // Handle Audio Response
          const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioData) {
            const bytes = base64ToUint8Array(audioData);
            if (this.audioContext) {
               const buffer = await decodeAudioData(bytes, this.audioContext);
               this.playAudio(buffer);
               
               // For visualization (audio amplitude)
               const visData = new Uint8Array(10); 
               onAudioData(visData); 
            }
          }
          
          // Handle interruptions to stop current playback
          if (msg.serverContent?.interrupted) {
            this.stopAllAudio();
          }

          if (msg.serverContent?.turnComplete) {
             // Turn complete
          }
        },
        onclose: () => {
          console.log("Live Session Closed");
          this.disconnect();
          onClose();
        },
        onerror: (err: any) => {
          console.error("Live Session Error", err);
          this.disconnect();
          onClose();
        }
      }
    });

    this.session = sessionPromise;

    // Start Audio Streaming
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmInt16 = float32ToInt16(inputData);
      const base64Audio = arrayBufferToBase64(pcmInt16.buffer);
      
      // Ensure data is sent only after the session promise resolves to avoid race conditions
      sessionPromise.then(session => {
        session.sendRealtimeInput({
          media: {
            mimeType: "audio/pcm;rate=16000",
            data: base64Audio
          }
        });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(inputCtx.destination);
  }

  private playAudio(buffer: AudioBuffer) {
    if (!this.audioContext) return;
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    
    const currentTime = this.audioContext.currentTime;
    // Schedule next chunk at the end of the current queue for gapless playback
    const startTime = Math.max(currentTime, this.nextStartTime);
    
    source.addEventListener('ended', () => {
      this.activeSources.delete(source);
    });

    source.start(startTime);
    this.activeSources.add(source);
    this.nextStartTime = startTime + buffer.duration;
  }

  private stopAllAudio() {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch (e) {}
    }
    this.activeSources.clear();
    this.nextStartTime = 0;
  }

  disconnect() {
    this.isConnected = false;
    this.stopAllAudio();
    if (this.inputSource) {
      this.inputSource.mediaStream.getTracks().forEach(track => track.stop());
      this.inputSource.disconnect();
    }
    if (this.processor) {
      this.processor.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
