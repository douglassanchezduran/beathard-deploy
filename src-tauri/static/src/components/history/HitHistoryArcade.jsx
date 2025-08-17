import React, { useEffect, useState } from 'react';
import useWebSocketStore from '../../stores/useWebSocketStore';

const HitHistoryArcade = ({ playerId, side = 'left' }) => {
  const getPlayerHitHistory = useWebSocketStore(state => state.getPlayerHitHistory);
  const cleanExpiredHits = useWebSocketStore(state => state.cleanExpiredHits);
  const [hitHistory, setHitHistory] = useState([]);

  // Paleta de colores estilo arcade
  const colors = {
    1: { 
      bg: 'bg-gradient-to-br from-red-500 via-pink-600 to-orange-700',
      glow: 'shadow-red-500/50',
      text: 'text-red-100',
      accent: 'text-yellow-300',
      border: 'border-red-400'
    },
    2: { 
      bg: 'bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-700',
      glow: 'shadow-cyan-500/50',
      text: 'text-cyan-100',
      accent: 'text-yellow-300',
      border: 'border-cyan-400'
    }
  };

  const playerColors = colors[playerId] || colors[1];

  useEffect(() => {
    const interval = setInterval(() => {
      const currentHistory = getPlayerHitHistory(playerId);
      setHitHistory(currentHistory);
      cleanExpiredHits();
    }, 100);

    return () => clearInterval(interval);
  }, [playerId, getPlayerHitHistory, cleanExpiredHits]);

  const getTimeRemaining = (hit) => {
    const remaining = hit.expiresAt - Date.now();
    return Math.max(0, remaining / 1000);
  };

  const getOpacity = (hit) => {
    const timeRemaining = getTimeRemaining(hit);
    if (timeRemaining > 8) return 1;
    return Math.max(0.3, timeRemaining / 8);
  };

  // Clasificar golpe por potencia
  const getHitRank = (force) => {
    if (force > 400) return { rank: 'S', color: 'text-yellow-300', bg: 'bg-yellow-500/20' };
    if (force > 300) return { rank: 'A', color: 'text-orange-300', bg: 'bg-orange-500/20' };
    if (force > 200) return { rank: 'B', color: 'text-blue-300', bg: 'bg-blue-500/20' };
    return { rank: 'C', color: 'text-gray-300', bg: 'bg-gray-500/20' };
  };

  if (hitHistory.length === 0) return null;

  return (
    <div 
      className={`fixed top-1/4 z-50 ${
        side === 'left' ? 'left-8' : 'right-8'
      }`}
    >
      {/* Header del panel */}
      <div className={`
        ${playerColors.bg} ${playerColors.border} border-2 rounded-t-xl p-3 mb-2
        shadow-2xl ${playerColors.glow} backdrop-blur-sm
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <span className={`${playerColors.text} font-bold text-sm uppercase tracking-wider`}>
              FIGHTER {playerId} - HIT LOG
            </span>
          </div>
          <div className={`${playerColors.accent} text-xs font-mono`}>
            [{hitHistory.length}/3]
          </div>
        </div>
      </div>

      {/* Lista de golpes estilo terminal */}
      <div className="space-y-1">
        {hitHistory.map((hit, index) => {
          const hitRank = getHitRank(hit.force || 0);
          const timeRemaining = getTimeRemaining(hit);
          
          return (
            <div
              key={hit.id}
              className={`
                ${playerColors.bg} ${playerColors.border} border rounded-lg p-3
                backdrop-blur-sm shadow-xl ${playerColors.glow}
                transform transition-all duration-300 ease-out
                ${index === 0 ? 'scale-105 border-yellow-400' : 'scale-100'}
                font-mono text-sm
              `}
              style={{ 
                opacity: getOpacity(hit),
                filter: `brightness(${index === 0 ? 1.3 : 0.9})`
              }}
            >
              {/* Header con timestamp y rank */}
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`
                    w-6 h-6 rounded ${hitRank.bg} ${hitRank.color} 
                    flex items-center justify-center font-bold text-xs
                    ${index === 0 ? 'animate-pulse' : ''}
                  `}>
                    {hitRank.rank}
                  </div>
                  <span className={`${playerColors.text} text-xs`}>
                    HIT_{String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className={`${playerColors.accent} text-xs`}>
                  T-{timeRemaining.toFixed(1)}s
                </div>
              </div>

              {/* Datos del golpe en formato terminal */}
              <div className={`${playerColors.text} space-y-1 text-xs`}>
                <div className="flex justify-between">
                  <span className="opacity-70">PWR:</span>
                  <span className="font-bold">{(hit.force || 0).toFixed(0)}N</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">VEL:</span>
                  <span className="font-bold">{(hit.velocity || 0).toFixed(1)}m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">ACC:</span>
                  <span className="font-bold">{(hit.acceleration || 0).toFixed(1)}m/s²</span>
                </div>
              </div>

              {/* Barra de progreso pixelada */}
              <div className="mt-2 h-1 bg-black/40 rounded overflow-hidden">
                <div 
                  className={`h-full transition-all duration-100 ease-linear ${
                    timeRemaining > 5 ? 'bg-green-400' : 
                    timeRemaining > 2 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                  style={{ 
                    width: `${(timeRemaining / 10) * 100}%`,
                    boxShadow: `0 0 5px ${
                      timeRemaining > 5 ? 'rgba(34, 197, 94, 0.5)' : 
                      timeRemaining > 2 ? 'rgba(234, 179, 8, 0.5)' : 'rgba(239, 68, 68, 0.5)'
                    }`
                  }}
                />
              </div>

              {/* Efectos especiales */}
              {index === 0 && timeRemaining > 9.5 && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs font-bold px-1 py-0.5 rounded animate-bounce">
                  NEW
                </div>
              )}

              {hitRank.rank === 'S' && (
                <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75" />
              )}
            </div>
          );
        })}
      </div>

      {/* Panel de combo estilo arcade */}
      {hitHistory.length > 1 && (
        <div className={`
          mt-3 ${playerColors.bg} ${playerColors.border} border-2 rounded-xl p-4
          shadow-2xl ${playerColors.glow} backdrop-blur-sm text-center
        `}>
          <div className={`${playerColors.accent} text-xs font-bold uppercase tracking-wider mb-1`}>
            COMBO MULTIPLIER
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className={`${playerColors.text} text-3xl font-bold font-mono`}>
              {hitHistory.length}
            </div>
            <div className={`${playerColors.accent} text-lg font-bold`}>
              ×
            </div>
          </div>
          
          {/* Efectos de combo */}
          {hitHistory.length >= 3 && (
            <>
              <div className="absolute inset-0 rounded-xl animate-pulse bg-yellow-400/10" />
              <div className={`${playerColors.accent} text-xs font-bold mt-1 animate-pulse`}>
                PERFECT!
              </div>
            </>
          )}
        </div>
      )}

      {/* Indicador de conexión estilo retro */}
      <div className="mt-2 flex justify-center">
        <div className="flex space-x-1">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i}
              className={`w-1 h-1 rounded-full ${
                i < hitHistory.length ? 'bg-green-400' : 'bg-gray-600'
              } animate-pulse`}
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HitHistoryArcade;
