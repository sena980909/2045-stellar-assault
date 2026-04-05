'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Game } from '@/game/engine/GameLoop';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 700;

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    const scale = Math.min(windowW / GAME_WIDTH, windowH / GAME_HEIGHT);

    canvas.style.width = `${GAME_WIDTH * scale}px`;
    canvas.style.height = `${GAME_HEIGHT * scale}px`;
    container.style.width = `${GAME_WIDTH * scale}px`;
    container.style.height = `${GAME_HEIGHT * scale}px`;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Guard against StrictMode double-mount
    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }

    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;

    const game = new Game(canvas);
    gameRef.current = game;
    game.init();

    resize();
    window.addEventListener('resize', resize);

    return () => {
      game.destroy();
      gameRef.current = null;
      window.removeEventListener('resize', resize);
    };
  }, [resize]);

  return (
    <div className="flex items-center justify-center w-full h-screen bg-black">
      <div ref={containerRef} className="relative">
        <canvas
          ref={canvasRef}
          className="block"
          style={{ background: '#000' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
            mixBlendMode: 'multiply',
          }}
        />
      </div>
    </div>
  );
}
