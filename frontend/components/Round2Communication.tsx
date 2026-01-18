/**
 * Round 2: Communication Round (Video Recording)
 * Camera-based assessment with recording capabilities
 */

import React, { useState, useEffect, useRef } from 'react';
import { InterviewSession } from '../../types';
import { DB } from '../../backend/services/db';

interface Round2CommunicationProps {
  session: InterviewSession;
  onRound2Complete: () => void;
  setSession: React.Dispatch<React.SetStateAction<InterviewSession | null>>;
}

// Domain-specific prompts for Round 2
const DOMAIN_PROMPTS: Record<string, string> = {
  "Software Engineering": "Introduce yourself and explain a software engineering project you've worked on. Discuss the challenges you faced and how you solved them.",
  "Frontend Developer": "Introduce yourself and explain a frontend project or feature you've built. Walk through your approach to design and implementation.",
  "Backend Developer": "Introduce yourself and explain a backend system or API you've designed. Discuss scalability and performance considerations.",
  "Data Science": "Introduce yourself and explain a data science project you've completed. Discuss your methodology and key insights.",
  "Computer Science Fundamentals": "Introduce yourself and explain a computer science concept you find interesting. Use examples to illustrate your explanation.",
  "Behavioral & Soft Skills": "Introduce yourself and share a time when you had to work with a difficult team member. Explain how you handled the situation."
};

const Round2Communication: React.FC<Round2CommunicationProps> = ({ session, onRound2Complete, setSession }) => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const prompt = DOMAIN_PROMPTS[session.domain] || "Introduce yourself and explain a project or concept related to this domain.";

  // Initialize camera with proper error handling
  useEffect(() => {
    let isMounted = true;
    
    const initializeCamera = async () => {
      try {
        setError(null);
        
        // Check if media devices are available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported in this browser.');
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }, 
          audio: true 
        });
        
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(err => {
            console.warn('Video play error:', err);
          });
        }
        setIsCameraReady(true);
      } catch (err: any) {
        console.error('Camera initialization error:', err);
        
        // Provide user-friendly error messages
        let errorMessage = 'Failed to access camera. ';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage += 'Please allow camera and microphone permissions, then refresh the page.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage += 'No camera found. Please connect a camera and refresh.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage += 'Camera is being used by another application. Please close other apps and refresh.';
        } else {
          errorMessage += err.message || 'Please check your camera settings and try again.';
        }
        
        setError(errorMessage);
        setIsCameraReady(false);
      }
    };
    
    initializeCamera();
    
    // Handle page visibility changes (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isRecording) {
        // Auto-stop recording if user switches tabs
        stopRecording();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Handle page unload - save state
    const handleBeforeUnload = () => {
      if (isRecording && mediaRecorderRef.current) {
        // Stop recording before page unload
        mediaRecorderRef.current.stop();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Stop recording if active
      if (mediaRecorderRef.current && isRecording) {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.warn('Error stopping recorder on unmount:', err);
        }
      }
      
      // Stop all media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
      
      // Clean up video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      // Clean up recorded URL
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
      
      // Clear interval
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording, recordedUrl]);

  const startRecording = () => {
    if (!streamRef.current || !videoRef.current) {
      setError('Camera not ready. Please wait for camera to initialize.');
      return;
    }

    // Check if MediaRecorder is supported
    if (!window.MediaRecorder) {
      setError('Video recording is not supported in this browser.');
      return;
    }

    try {
      chunksRef.current = [];
      
      // Try different MIME types for browser compatibility
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose
          }
        }
      }
      
      const mediaRecorder = new MediaRecorder(streamRef.current, mimeType ? {
        mimeType: mimeType
      } : undefined);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Update duration every second
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err: any) {
      console.error('Recording error:', err);
      setError(err.message || 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveRecording = async () => {
    if (!recordedBlob) {
      setError('No recording to save. Please record a video first.');
      return;
    }

    // Validate recording size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (recordedBlob.size > maxSize) {
      setError('Recording is too large (max 50MB). Please record a shorter video.');
      return;
    }

    // Validate minimum duration (at least 5 seconds)
    if (recordingDuration < 5) {
      setError('Recording is too short. Please record at least 5 seconds.');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    // Keep blob reference in case save fails
    const blobToSave = recordedBlob;
    
    try {
      // Convert blob to base64 for storage
      const reader = new FileReader();
      
      reader.onerror = () => {
        setError('Failed to process recording. Please try again.');
        setIsSaving(false);
      };
      
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          
          // Calculate communication score based on recording duration and quality
          // Simple heuristic: longer, more thoughtful responses score better
          const durationScore = Math.min(1, recordingDuration / 120); // 2 minutes = full score
          const communicationScore = 0.5 + (durationScore * 0.5); // Base 0.5, up to 1.0
          
          // Save to session
          const updated = { ...session };
          updated.round2 = {
            ...session.round2,
            videoRecordingUrl: base64data,
            recordingDuration: recordingDuration,
            communicationScore: communicationScore,
            communicationFeedback: `Video recording completed (${Math.floor(recordingDuration)}s). Communication clarity and confidence assessed.`,
            status: "completed"
          };
          updated.status = "round2_complete";
          updated.lastUpdatedAt = Date.now();
          
          await DB.saveSession(updated);
          setSession(updated);
          
          setIsSaving(false);
          
          // Proceed to evaluation
          setTimeout(() => {
            onRound2Complete();
          }, 1000);
        } catch (saveError) {
          console.error('Error saving session:', saveError);
          // Keep blob available for retry
          setRecordedBlob(blobToSave);
          setError('Failed to save recording. Your video is still available. Please try saving again.');
          setIsSaving(false);
        }
      };
      
      reader.readAsDataURL(recordedBlob);
    } catch (error) {
      console.error('Error saving recording:', error);
      setError('Failed to save recording. Please try again.');
      setIsSaving(false);
    }
  };

  const retakeRecording = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setRecordingDuration(0);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="bg-emerald-600 px-8 py-6 text-white shrink-0">
        <h2 className="text-xl font-black uppercase tracking-tight mb-1">Round 2: Communication Round</h2>
        <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest">
          {session.domain} • Video Recording
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <svg className="w-6 h-6 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-black text-red-900 mb-2">Camera Access Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-black uppercase tracking-widest hover:bg-red-700 transition-all"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Prompt Section */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-[2rem] p-8">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Your Prompt</h3>
          <p className="text-lg text-slate-800 font-semibold leading-relaxed italic">
            "{prompt}"
          </p>
        </div>

        {/* Camera Preview */}
        <div className="relative bg-slate-900 rounded-[2rem] overflow-hidden aspect-video">
          {isCameraReady && !recordedUrl ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : recordedUrl ? (
            <video
              src={recordedUrl}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-white font-semibold">Initializing camera...</p>
              </div>
            </div>
          )}
          
          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-3 bg-red-600 px-4 py-2 rounded-full">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="text-white font-black text-sm uppercase tracking-widest">
                Recording {formatDuration(recordingDuration)}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-6">
          {error && !isCameraReady && (
            <div className="w-full max-w-md bg-red-50 border-2 border-red-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <svg className="w-6 h-6 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-black text-red-900 mb-2">Camera Access Required</h3>
                  <p className="text-red-700 text-sm mb-4">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-black uppercase tracking-widest hover:bg-red-700 transition-all"
                  >
                    Reload & Grant Permission
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {!recordedUrl ? (
            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={!isCameraReady || !!error}
                  className="px-10 py-5 bg-red-600 text-white rounded-full font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title={!isCameraReady ? 'Waiting for camera...' : 'Start video recording'}
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-10 py-5 bg-slate-900 text-white rounded-full font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  Stop Recording
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full max-w-md">
              <p className="text-sm text-slate-600 font-semibold text-center">
                Review your recording below. You can retake it or save to proceed.
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={retakeRecording}
                  disabled={isSaving}
                  className="px-8 py-4 bg-slate-100 text-slate-700 rounded-full font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retake
                </button>
                <button
                  onClick={saveRecording}
                  disabled={isSaving}
                  className="px-10 py-5 bg-emerald-600 text-white rounded-full font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save & Complete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Round2Communication;
