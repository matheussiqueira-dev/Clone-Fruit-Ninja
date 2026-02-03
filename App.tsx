import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, VisionResult } from './types';
import { initializeVision, detectHands } from './services/visionService';
import { getSenseiWisdom } from './services/senseiService';
import GameLayer from './components/GameLayer';
import UIOverlay from './components/UIOverlay';

// Define constraints for webcam
const VIDEO_CONSTRAINTS = {
  audio: false,
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: "user"
  }
};

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const gameStateRef = useRef(gameState);
  
  // Use Ref for hand position to avoid re-rendering React components 60 times a second
  const handPositionRef = useRef<VisionResult | null>(null);
  
  const [score, setScore] = useState(0);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [senseiWisdom, setSenseiWisdom] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Camera and Vision
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let mounted = true;

    const handleLoadedData = () => {
      if (mounted) {
        setGameState(GameState.MENU);
      }
    };

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera not supported.");
        }

        await initializeVision();
        activeStream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          videoRef.current.addEventListener('loadeddata', handleLoadedData, { once: true });
        }

        setCameraError(null);
      } catch (err) {
        console.error("Camera error:", err);
        if (mounted) {
          setCameraError("Permita o acesso à câmera para jogar.");
          setGameState(GameState.MENU);
        }
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadeddata', handleLoadedData);
      }
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Tracking Loop
  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      if (gameStateRef.current === GameState.PLAYING && videoRef.current) {
        const result = detectHands(videoRef.current);
        if (result !== undefined) {
          handPositionRef.current = result;
        }
      } else if (handPositionRef.current !== null) {
        handPositionRef.current = null;
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleStartGame = () => {
    if (cameraError) return;
    setScore(0);
    setGameState(GameState.PLAYING);
    setSenseiWisdom("");
  };

  // Memoize callback to prevent downstream effect re-runs
  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    setGameState(GameState.GAME_OVER);
    setSenseiWisdom(getSenseiWisdom(finalScore));
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      
      {/* 1. Background Video Layer */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute top-0 left-0 w-full h-full object-cover transform scale-x-[-1] opacity-50 filter grayscale contrast-125"
      />
      
      {/* 2. Gradient Overlay for readability */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none" />

      {/* 3. Game Layer (Canvas) */}
      <GameLayer 
        handPositionRef={handPositionRef}
        gameState={gameState}
        onScoreUpdate={setScore}
        onGameOver={handleGameOver}
        width={windowSize.width}
        height={windowSize.height}
      />

      {/* 4. UI Overlay */}
      <UIOverlay 
        gameState={gameState}
        score={score}
        senseiWisdom={senseiWisdom}
        cameraError={cameraError}
        onStart={handleStartGame}
        onRestart={handleStartGame}
      />
      
    </div>
  );
};

export default App;
