// src/components/VoiceChatModule.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Square, CheckCircle2, XCircle, AlertCircle, Activity } from 'lucide-react';
import { Base64 } from 'js-base64';
import { convertBase64ToFloat32 } from '../lib/utils'; // Ensure this utility is correct and available
import { VOICE_OPTIONS } from '../lib/constant'; // Adjust path if necessary

// Removed: `declare type PermissionName` to avoid conflict warnings.
// Relying on global types or explicit casts like `as PermissionDescriptor`.

const orbitron = { className: "font-orbitron" };

interface VoiceChatModuleProps {
  theme: "light" | "dark";
  onRecordingChange: (isRecording: boolean) => void;
  onStatusChange: (status: string) => void;
  onAudioLevelChange?: (level: number) => void;
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

type Part = {
  inlineData?: {
    mimeType: string;
    data: string;
  };
  text?: string;
};

type WebSocketServerMessage = {
  serverContent?: {
    setupComplete?: boolean;
    inputTranscription?: { text?: string };
    modelTurn?: {
      parts: Part[];
    };
    turnComplete?: boolean;
    interrupted?: boolean;
    toolCall?: unknown;
  };
  setupComplete?: boolean;
  toolCall?: unknown;
  goAway?: { time_left?: string; };
  sessionResumptionUpdate?: { resumable?: boolean; newHandle?: string; };
};


export default function VoiceChatModule({ theme, onRecordingChange, onStatusChange, onAudioLevelChange }: VoiceChatModuleProps) {
  // --- State Management ---
  const [status, setStatusState] = useState('Idle');
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiSubtitle, setAiSubtitle] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<string>("Zephyr");

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isPlayingAI, setIsPlayingAI] = useState<boolean>(false); // AI speaking status (for visualizer & UI)
  const [queueLength, setQueueLength] = useState<number>(0);

  // Permission states
  const [micPermissionState, setMicPermissionState] = useState<
    "granted" | "denied" | "prompt" | "unknown"
  >("unknown");
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Overall conversation active state
  const [isConversationActive, setIsConversationActive] = useState<boolean>(false);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);


  // --- Refs (using a SINGLE AudioContextRef) ---
  const audioContextRef = useRef<AudioContext | null>(null); // SINGLE AudioContext for both input/output
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);

  const audioBufferRef = useRef<Float32Array[]>([]);
  const isPlayingAIRef = useRef<boolean>(false);
  const scheduledEndTimeRef = useRef<number>(0);
  const needsSchedulingAIRef = useRef<boolean>(false);
  const currentAISourceRef = useRef<AudioBufferSourceNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);


  // --- Helper Callbacks ---
  const updateStatus = useCallback((msg: string) => {
    setStatusState(msg);
    onStatusChange(msg);
  }, [onStatusChange]);

  const updateError = useCallback((msg: string) => {
    setCurrentError(msg);
    setStatusState(`Error: ${msg}`);
    onStatusChange(`Error: ${msg}`);
    console.error(`ERROR: ${msg}`);
  }, [onStatusChange]);


  // Check microphone permissions
  const checkMicrophonePermission = useCallback(async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permissionStatus = await navigator.permissions.query({
            name: "microphone"
          } as PermissionDescriptor);

          setMicPermissionState(
            permissionStatus.state as "granted" | "denied" | "prompt"
          );
          permissionStatus.onchange = () => {
            setMicPermissionState(
              permissionStatus.state as "granted" | "denied" | "prompt"
            );
            if (permissionStatus.state === "denied") {
              setPermissionError(
                "Microphone access denied. Please enable microphone access in your browser settings."
              );
            } else if (permissionStatus.state === "granted") {
              setPermissionError(null);
            }
          };
          return;
        } catch (err) {
          console.log("Permissions API available but failed:", err);
        }
      }
      try {
        const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermissionState("granted");
        setPermissionError(null);
        localStream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        if (err instanceof DOMException) {
          if (
            err.name === "NotAllowedError" ||
            err.name === "PermissionDeniedError"
          ) {
            setMicPermissionState("denied");
            setPermissionError(
              "Microphone access denied. Please enable microphone access in your browser settings."
            );
          } else if (err.name === "NotFoundError") {
            setMicPermissionState("denied");
            setPermissionError(
              "No microphone found. Please check your device and try again."
            );
          } else {
            setMicPermissionState("unknown");
          }
        } else {
          setMicPermissionState("unknown");
        }
      }
    } catch (error) {
      console.error("Error checking microphone permission:", error);
      setMicPermissionState("unknown");
    }
  }, []);

  // Request microphone permission directly
  const requestMicrophonePermission = useCallback(async () => {
    setPermissionError(null);
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermissionState("granted");
      localStream.getTracks().forEach((track) => track.stop());
      checkMicrophonePermission(); // Re-check to update UI
    } catch (error) {
      console.error("Failed to get microphone permission:", error);
      setMicPermissionState("denied");
      setPermissionError(
        "Microphone access is required. Please allow microphone access and try again."
      );
    }
  }, [checkMicrophonePermission]);

  // Main scheduling function for continuous playback (AI audio)
  const scheduleAudioPlayback = useCallback(async () => {
    // Using the single audioContextRef for AI output
    if (!audioContextRef.current || audioBufferRef.current.length === 0) {
      console.log("No audio context or empty buffer - skipping scheduling");
      isPlayingAIRef.current = false;
      setIsPlayingAI(false);
      return;
    }

    // Proactive resume check for the single AudioContext
    if (audioContextRef.current.state === 'suspended') {
      console.log("Resuming AudioContext for AI playback...");
      try {
        await audioContextRef.current.resume();
        console.log("AudioContext resumed successfully for AI playback.");
      } catch (error) {
        console.error("Failed to resume AudioContext for AI playback:", error);
        updateError("Failed to resume AI audio playback. Please interact with the page.");
        audioBufferRef.current = []; // Clear queue on critical failure
        isPlayingAIRef.current = false;
        setIsPlayingAI(false);
        scheduledEndTimeRef.current = 0;
        setQueueLength(0);
        return;
      }
    }

    try {
      isPlayingAIRef.current = true;
      setIsPlayingAI(true);
      needsSchedulingAIRef.current = false;

      const currentTime = audioContextRef.current.currentTime;
      const startTime = Math.max(currentTime, scheduledEndTimeRef.current);
      let currentScheduleTime = startTime;

      const maxChunksToSchedule = Math.min(audioBufferRef.current.length, 3);
      console.log(
        `Scheduling ${maxChunksToSchedule} audio chunks starting at time ${currentScheduleTime}`
      );

      for (let i = 0; i < maxChunksToSchedule; i++) {
        const float32Data = audioBufferRef.current[i];

        const audioBuffer = audioContextRef.current.createBuffer(
          1,
          float32Data.length,
          24000 // Sample rate AI output
        );
        audioBuffer.getChannelData(0).set(float32Data);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        if (i === 0) {
          currentAISourceRef.current = source;
        }

        const duration = audioBuffer.duration;
        source.start(currentScheduleTime);
        console.log(
          `Scheduled chunk ${i} to play at ${currentScheduleTime.toFixed(
            3
          )}s for ${duration.toFixed(3)}s`
        );
        currentScheduleTime += duration;

        if (i === maxChunksToSchedule - 1) {
          source.onended = () => {
            audioBufferRef.current.splice(0, maxChunksToSchedule);
            setQueueLength(audioBufferRef.current.length);

            if (audioBufferRef.current.length > 0) {
              needsSchedulingAIRef.current = true;
              scheduleAudioPlayback();
            } else {
              console.log("No more audio in queue, playback complete");
              isPlayingAIRef.current = false;
              setIsPlayingAI(false);
              scheduledEndTimeRef.current = 0;
            }
          };
        }
      }
      scheduledEndTimeRef.current = currentScheduleTime;
    } catch (error) {
      console.error("Error in AI audio scheduling:", error);
      isPlayingAIRef.current = false;
      setIsPlayingAI(false);
      if (audioBufferRef.current.length > 0) {
        audioBufferRef.current.splice(0, 1);
        setQueueLength(audioBufferRef.current.length);
      }
      if (audioBufferRef.current.length > 0) {
        setTimeout(scheduleAudioPlayback, 100);
      }
      updateError("An error occurred during AI audio playback.");
    }
  }, [setIsPlayingAI, setQueueLength, updateError]);


  // Process incoming audio chunks (from AI)
  const processAudioChunk = useCallback((base64Data: string) => {
    // Now using the single audioContextRef
    if (!audioContextRef.current) {
        console.warn("AudioContext not ready for processing incoming AI audio chunk.");
        return;
    }

    try {
      const float32Data = convertBase64ToFloat32(base64Data);
      audioBufferRef.current.push(float32Data);
      const newLength = audioBufferRef.current.length;
      setQueueLength(newLength);
      console.log(`Added AI audio chunk. Queue length: ${newLength}`);

      if (!isPlayingAIRef.current) {
        scheduleAudioPlayback();
      } else if (needsSchedulingAIRef.current) {
        scheduleAudioPlayback();
      }
    } catch (error) {
      console.error("Error processing AI audio chunk:", error);
      updateError("Failed to process incoming AI audio data.");
    }
  }, [scheduleAudioPlayback, setQueueLength, updateError]);


  // Function to send audio chunks to the API (from mic)
  const sendMediaChunks = useCallback(
    (base64Data: string, mimeType: string) => {
      // STOP SENDING MIC AUDIO IF AI IS SPEAKING OR MIC IS MUTED/CONVERSATION INACTIVE
      if (isMicMuted || !isConversationActive || isPlayingAI) { // ADDED isPlayingAI check here
        return;
      }

      const message = {
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: mimeType || "audio/pcm",
              data: base64Data,
            },
          ],
        },
      };

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(message));
      } else {
        console.warn("WebSocket not connected, cannot send audio data");
      }
    },
    [isMicMuted, isConversationActive, isPlayingAI] // ADDED isPlayingAI to dependencies
  );


  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback(async (event: MessageEvent) => {
    if (event.data instanceof Blob) {
      const arrayBuffer = await event.data.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const messageText = new TextDecoder("utf-8").decode(bytes);

      let messageData: WebSocketServerMessage;
      try {
        messageData = JSON.parse(messageText);
        console.log('Received message from Gemini Live (Parsed):', messageData);
      } catch (e) {
        console.error("Error parsing WebSocket message as JSON:", e);
        return;
      }

      if (messageData.toolCall) {
          console.log('Tool call request:', messageData.toolCall);
          updateStatus('AI requesting tool...');
      } else if (messageData.goAway) {
          console.log(`Connection will terminate in: ${messageData.goAway.time_left || 'Unknown'}`);
          updateStatus('Connection ending soon...');
      } else if (messageData.sessionResumptionUpdate) {
          console.log(`New session handle: ${messageData.sessionResumptionUpdate.newHandle}`);
      }

      // Process serverContent if available
      if (messageData.serverContent) {
        if (messageData.serverContent.setupComplete) {
          console.log('Gemini Live Setup Complete (within serverContent).');
          updateStatus('Setup Complete. Listening...');
        }
        if (messageData.serverContent.inputTranscription?.text) {
          setUserTranscript(messageData.serverContent.inputTranscription.text);
          if (!isPlayingAI) { // isPlayingAI is now a dependency
              updateStatus('Processing...');
          }
        }

        if (messageData.serverContent.modelTurn?.parts) {
          const parts = messageData.serverContent.modelTurn.parts;
          parts.forEach((part) => {
            if (part.inlineData?.mimeType === "audio/pcm;rate=24000") {
              processAudioChunk(part.inlineData.data);
            } else if (part.text) {
              setAiSubtitle(part.text);
            }
          });
          updateStatus('AI Speaking...');
        }

        if (messageData.serverContent.turnComplete) {
          console.log('AI Turn Complete.');
          if (!isMicMuted) {
              updateStatus('Listening...');
          } else {
              updateStatus('Idle (Mic Muted)');
          }
        }
        if (messageData.serverContent.interrupted) {
          console.log('AI Response Interrupted by user activity.');
          if (currentAISourceRef.current) {
            currentAISourceRef.current.stop();
            currentAISourceRef.current.disconnect();
            currentAISourceRef.current = null;
          }
          audioBufferRef.current = [];
          isPlayingAIRef.current = false;
          setIsPlayingAI(false);
          onAudioLevelChange?.(0); // Safely call if exists
          setAiSubtitle('');
          updateStatus('AI Interrupted. Listening again...');
        }
      }
    }
  }, [processAudioChunk, updateStatus, setAiSubtitle, setIsPlayingAI, isMicMuted, isPlayingAI, onAudioLevelChange]);


  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    if (!GEMINI_API_KEY) {
      updateError("GEMINI_API_KEY is not set. Cannot connect to Gemini Live.");
      return () => {};
    }
    if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
    }

    const ws = new WebSocket(URL);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      const payload = {
        model: "models/gemini-2.0-flash-live-001",
        generationConfig: {
          candidateCount: 1,
          temperature: 0.2,
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: selectedVoice,
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: "You are a helpful AI assistant." }],
        },
      };
      ws.send(JSON.stringify({ setup: payload }));
      console.log(`WebSocket initialized with voice: ${selectedVoice}`);
      updateStatus("WebSocket connected. Sending setup.");
    };

    ws.onmessage = handleWebSocketMessage;

    ws.onclose = (event) => {
      setIsConnected(false);
      console.log("SOCKET CLOSED: ", event.code, event.reason);
      if (event.code !== 1000) {
        updateError(`WebSocket Disconnected: ${event.reason || 'Unknown error'}. Code: ${event.code}`);
      } else {
        updateStatus('Disconnected (Normal Closure).');
      }
    };

    ws.onerror = (event) => {
      setIsConnected(false);
      console.error("SOCKET ERROR: ", event);
      updateError("WebSocket connection error. Check console for details.");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [selectedVoice, handleWebSocketMessage, updateError, updateStatus]);


  // Stop conversation - comprehensive cleanup
  const stopConversation = useCallback(() => {
    console.log("Stopping conversation and cleaning up resources");

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => {
        track.stop();
      });
      setMediaStream(null);
    }

    if (audioWorkletNodeRef.current) {
      try {
        audioWorkletNodeRef.current.disconnect();
        audioWorkletNodeRef.current.port.onmessage = null;
        audioWorkletNodeRef.current = null;
      } catch (error) {
        console.error("Error cleaning up audio worklet:", error);
      }
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }

    // Close the SINGLE audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try {
        audioContextRef.current.close().catch((e) => console.error("Error closing AudioContext:", e));
        audioContextRef.current = null; // Set to null after closing
      } catch (error) {
        console.error("Error closing AudioContext:", error);
      }
    }

    if (currentAISourceRef.current) {
      try {
        currentAISourceRef.current.stop();
        currentAISourceRef.current.disconnect();
        currentAISourceRef.current = null;
      } catch (error) {
        console.error("Error stopping AI audio source:", error);
      }
    }

    if (socketRef.current) {
      if (
        socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING
      ) {
        try {
          socketRef.current.close(1000, "User initiated stop");
        } catch (error) {
          console.error("Error closing WebSocket:", error);
        }
      }
      socketRef.current = null;
    }

    audioBufferRef.current = [];
    isPlayingAIRef.current = false;
    scheduledEndTimeRef.current = 0;
    needsSchedulingAIRef.current = false;
    setQueueLength(0);
    setIsPlayingAI(false);
    setAudioLevel(0);
    setUserTranscript('');
    setAiSubtitle('');
    setIsConversationActive(false);
    setIsRecording(false);
    onRecordingChange(false);
    setIsMicMuted(false);
    updateStatus('Idle');
    setCurrentError(null);
    setPermissionError(null);
    setIsConnected(false);

    console.log("Conversation stopped and resources cleaned up");
  }, [mediaStream, onRecordingChange, onAudioLevelChange, updateStatus]);


  // Start conversation
  const startConversation = useCallback(async () => {
    updateStatus("Starting conversation...");
    setPermissionError(null);
    setCurrentError(null);

    try {
      // 1. Periksa dan minta izin mikrofon
      if (micPermissionState !== "granted") {
        console.log("Requesting microphone permission...");
        try {
          const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicPermissionState("granted");
          localStream.getTracks().forEach(track => track.stop());
        } catch (error) {
          console.error("Microphone permission denied:", error);
          setMicPermissionState("denied");
          setPermissionError(
            "Microphone access is required. Please allow microphone access and try again."
          );
          return;
        }
      }

      // 2. Inisialisasi WebSocket ke Gemini Live API
      initializeWebSocket();

      // 3. Request audio stream dari mikrofon dengan constraints spesifik (16kHz)
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true, // Set to true like successful Vite example
          autoGainControl: true,  // Set to true like successful Vite example
          noiseSuppression: true, // Set to true like successful Vite example
        },
      });
      setMediaStream(audioStream);

      // 4. Reset and create the SINGLE AudioContext for both input and output
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        await audioContextRef.current.close().catch((e) => console.error("Error closing old AudioContext:", e));
      }
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ // eslint-disable-line @typescript-eslint/no-explicit-any
        sampleRate: 24000, // Context sample rate for AI output. Mic input will be resampled by AudioWorklet.
      });
      console.log("AudioContext actual Sample Rate (for input/output):", audioContextRef.current.sampleRate);

      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (e) {
          console.error("Failed to resume AudioContext immediately after creation:", e);
          updateError("Failed to resume audio. Please ensure browser allows audio playback.");
          stopConversation();
          return;
        }
      }

      audioBufferRef.current = [];
      isPlayingAIRef.current = false;
      scheduledEndTimeRef.current = 0;
      needsSchedulingAIRef.current = false;
      setQueueLength(0);
      setIsPlayingAI(false);

      setIsConversationActive(true);
      setIsRecording(true);
      onRecordingChange(true);
      setIsMicMuted(false);
      updateStatus("Listening...");

    } catch (error: unknown) {
      const errorMessageText = error instanceof Error ? error.message : String(error);
      console.error('Error starting conversation:', errorMessageText);
      updateError(`Failed to start conversation: ${errorMessageText}. Please check microphone & try again.`);
      stopConversation();
    }
  }, [micPermissionState, initializeWebSocket, updateStatus, updateError, onRecordingChange, stopConversation]);


  // Re-check permissions before starting conversation
  const ensurePermissionsAndStart = useCallback(async () => {
    await checkMicrophonePermission();
    if (micPermissionState === "granted") {
      startConversation();
    } else {
      requestMicrophonePermission();
    }
  }, [checkMicrophonePermission, micPermissionState, requestMicrophonePermission, startConversation]);


  // Toggle microphone mute/unmute
  const toggleMicMute = useCallback(() => {
    if (!isConversationActive || !mediaStream) return;

    const newMuteState = !isMicMuted;
    setIsMicMuted(newMuteState);
    console.log(`Microphone ${newMuteState ? "muted" : "unmuted"}`);

    mediaStream.getTracks().forEach((track) => { // Iterate over all tracks in mediaStream
      if (track.kind === 'audio') { // Ensure it's an audio track
        track.enabled = !newMuteState;
      }
    });

    if (newMuteState) {
        setAudioLevel(0);
        updateStatus('Mic Muted. Click Unmute to speak.');
    } else {
        updateStatus('Listening...');
    }
  }, [isConversationActive, isMicMuted, mediaStream, setAudioLevel, updateStatus]);


  // Initial setup for the SINGLE AudioContext (runs once on mount)
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ // eslint-disable-line @typescript-eslint/no-explicit-any
        sampleRate: 24000,
      });
      console.log("Initial AudioContext (for output) initialized with sample rate:", audioContextRef.current.sampleRate);
    }

    const ensureAudioContextRunning = async () => {
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        try {
          await audioContextRef.current.resume();
          console.log("AudioContext resumed successfully by user interaction.");
        } catch (error) {
          console.error("Failed to resume AudioContext:", error);
        }
      }
    };
    document.addEventListener('click', ensureAudioContextRunning, { once: true, capture: true });
    document.addEventListener('keydown', ensureAudioContextRunning, { once: true, capture: true });


    return () => {
      document.removeEventListener('click', ensureAudioContextRunning, { capture: true });
      document.removeEventListener('keydown', ensureAudioContextRunning, { capture: true });
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch((error) => {
          console.error("Error closing AudioContext:", error);
        });
      }
    };
  }, []);


  // Effect for setting up audio processing when stream is available and conversation is active
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    const currentIsConversationActive = isConversationActive;

    const setupAudioProcessing = async () => {
      if (!mediaStream || !currentIsConversationActive || !audioContextRef.current) {
        return;
      }

      try {
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        if (!analyserNodeRef.current || analyserNodeRef.current.context !== ctx) {
            analyserNodeRef.current = ctx.createAnalyser();
            analyserNodeRef.current.fftSize = 256;
            analyserNodeRef.current.smoothingTimeConstant = 0.7;
        }

        await ctx.audioWorklet.addModule('/audio-processor.js')
          .catch(e => {
            console.error("Error loading AudioWorklet module:", e);
            throw new Error("Failed to load audio-processor.js module.");
          });

        audioWorkletNodeRef.current = new AudioWorkletNode(
          ctx,
          'audio-processor',
          {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            processorOptions: {
              inputSampleRate: 16000, // Explicitly tell worklet input is 16k
              outputSampleRate: ctx.sampleRate, // Worklet outputs at context's sample rate (24k)
              bufferSize: 2048 // MATCH THIS TO audio-processor.js bufferSize
            },
            channelCount: 1,
            channelCountMode: "explicit",
            channelInterpretation: "speakers",
          }
        );

        mediaStreamSourceRef.current = ctx.createMediaStreamSource(mediaStream);
        mediaStreamSourceRef.current.connect(audioWorkletNodeRef.current);

        audioWorkletNodeRef.current.connect(analyserNodeRef.current);
        // REMOVED: audioWorkletNodeRef.current.connect(ctx.destination); // Disconnect local mic monitoring to prevent loopback

        audioWorkletNodeRef.current.port.onmessage = (event) => {
          if (!isConversationActive) return;

          if (event.data.pcmData) {
            const pcmBuffer = event.data.pcmData as ArrayBuffer;
            const level = event.data.level as number;

            setAudioLevel(level);

            const pcmUint8 = new Uint8Array(pcmBuffer);
            const base64Data = Base64.fromUint8Array(pcmUint8);

            sendMediaChunks(base64Data, "audio/pcm;rate=16000");
          }
        };
        console.log("Audio Processing Setup complete for input stream.");

        cleanup = () => {
          try {
            if (mediaStreamSourceRef.current) {
                mediaStreamSourceRef.current.disconnect();
                mediaStreamSourceRef.current = null;
            }
            if (audioWorkletNodeRef.current) {
              audioWorkletNodeRef.current.disconnect();
              audioWorkletNodeRef.current.port.onmessage = null;
              audioWorkletNodeRef.current = null;
            }
            if (analyserNodeRef.current) {
                analyserNodeRef.current.disconnect();
            }
          } catch (error) {
            console.error("Error during audio processing cleanup:", error);
          }
        };

      } catch (error) {
        console.error("Error setting up audio processing:", error);
        updateError(`Failed to set up audio processing: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    if (mediaStream && isConversationActive) {
      setupAudioProcessing();
    } else {
      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }
    }

    return () => {
        if (cleanup) {
            cleanup();
        }
    };
  }, [mediaStream, isConversationActive, sendMediaChunks, updateError, setAudioLevel]);


  // Effect for AI speaking animation (simplified: just sets level when AI is playing)
  useEffect(() => {
    if (isPlayingAI) {
      onAudioLevelChange?.(0.5);
    } else {
      onAudioLevelChange?.(0);
    }
  }, [isPlayingAI, onAudioLevelChange]);


  // Effect for periodically checking microphone permissions when not active
  useEffect(() => {
    let permissionCheckInterval: number | null = null;

    if (!isConversationActive && micPermissionState !== "granted") {
      permissionCheckInterval = window.setInterval(() => {
        checkMicrophonePermission();
      }, 5000);
    }

    return () => {
      if (permissionCheckInterval !== null) {
        window.clearInterval(permissionCheckInterval);
      }
    };
  }, [isConversationActive, micPermissionState, checkMicrophonePermission]);


  return (
    <div className="flex flex-col items-center justify-center h-screen w-full relative p-4">
      {/* Header */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden my-4">
        <div className="bg-blue-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">FPCODE Voice Assistant</h1>
            {isConnected && (
              <div className="flex items-center">
                <Activity className="w-3 h-3 text-green-400 mr-2 animate-pulse" />
                <span className="text-sm">Connected</span>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="p-6 space-y-6">
          {currentError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-red-500" />
                <div className="flex-1">{currentError}</div>
              </div>
            </div>
          )}
          {permissionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 text-red-500" />
                <div className="flex-1">{permissionError}</div>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 flex items-center">
            <span className="mr-2">Microphone:</span>
            {micPermissionState === "granted" && (
              <span className="text-green-600 flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Access granted
              </span>
            )}
            {micPermissionState === "denied" && (
              <span className="text-red-600 flex items-center">
                <XCircle className="h-4 w-4 mr-1" />
                Access denied
              </span>
            )}
            {(micPermissionState === "prompt" || micPermissionState === "unknown") && (
              <span className="text-yellow-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {micPermissionState === "prompt" ? "Permission needed" : "Status unknown"}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="voice"
              className="block text-sm font-medium text-gray-700"
            >
              Assistant Voice
            </label>
            <select
              id="voice"
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={isConversationActive}
              className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                isConversationActive ? "bg-gray-100" : ""
              }`}
            >
              {VOICE_OPTIONS.map((voice) => (
                <option key={voice.value} value={voice.value}>
                  {voice.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Audio Level</span>
              <span>{isPlayingAI ? "AI Speaking" : (isRecording ? "Listening" : "Idle")}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isPlayingAI
                    ? "bg-blue-500"
                    : isMicMuted
                    ? "bg-gray-400"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="flex justify-between text-sm text-gray-600">
            <div>Status: {status}</div>
            <div>Queue: {queueLength} items</div>
          </div>

          <div className="flex gap-3 pt-4">
            {!isConversationActive ? (
              <button
                onClick={ensurePermissionsAndStart}
                className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                disabled={micPermissionState === "denied"}
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Conversation
              </button>
            ) : (
              <>
                <button
                  onClick={toggleMicMute}
                  className={`flex-1 ${
                    isMicMuted
                      ? "bg-yellow-500 hover:bg-yellow-600"
                      : "bg-gray-600 hover:bg-gray-700"
                  } text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center`}
                >
                  {isMicMuted ? (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Mute
                    </>
                  )}
                </button>

                <button
                  onClick={stopConversation}
                  className="flex-1 bg-red-600 text-white rounded-lg py-3 font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop
                </button>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500 text-center">
          Using voice: {selectedVoice} • Powered by fpcode.ai
        </div>
      </div>
       {/* Subtitle Pengguna */}
       {userTranscript && (
        <div className={`fixed bottom-20 md:bottom-24 max-w-full px-4 py-2 rounded-lg text-center ${theme === 'dark' ? 'bg-gray-800/70 text-white' : 'bg-white/70 text-gray-900'} ${orbitron.className} text-lg md:text-xl z-20 shadow-lg`}>
          {userTranscript}
        </div>
      )}

      {/* Subtitle AI */}
      {aiSubtitle && !isRecording && (
        <div className={`fixed bottom-10 md:bottom-12 max-w-full px-4 py-2 rounded-lg text-center ${theme === 'dark' ? 'bg-blue-800/70 text-white' : 'bg-blue-200/70 text-blue-900'} ${orbitron.className} text-lg md:text-xl z-20 shadow-lg`}>
          {aiSubtitle}
        </div>
      )}
    </div>
  );
}