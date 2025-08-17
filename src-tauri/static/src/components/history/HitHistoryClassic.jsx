import React, { useEffect, useState } from 'react';
import useWebSocketStore from '../../stores/useWebSocketStore';

const HitHistoryClassic = ({ playerId, side = 'left' }) => {
  const getPlayerHitHistory = useWebSocketStore(state => state.getPlayerHitHistory);
  const cleanExpiredHits = useWebSocketStore(state => state.cleanExpiredHits);
  const [hitHistory, setHitHistory] = useState([]);

  // Paleta de colores inspirada en Street Fighter
  const colors = {
    1: { 
      primary: 'from-red-600 to-red-800', 
      accent: 'from-orange-400 to-red-500',
      border: 'border-red-300',
      text: 'text-red-100',
      glow: 'shadow-red-500/50'
    },
    2: { 
      primary: 'from-blue-600 to-blue-800', 
      accent: 'from-cyan-400 to-blue-500',
      border: 'border-blue-300',
      text: 'text-blue-100',
      glow: 'shadow-blue-500/50'
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
    return Math.max(0.3, timeRemaining / 10);
  };

  const getHitRank = (force) => {
    if (force >= 80) return { rank: 'PERFECT', color: 'text-yellow-300' };
    if (force >= 60) return { rank: 'GREAT', color: 'text-green-300' };
    if (force >= 40) return { rank: 'GOOD', color: 'text-blue-300' };
    return { rank: 'HIT', color: 'text-gray-300' };
  };

  if (hitHistory.length === 0) return null;

  return (
    <div 
      className={`fixed top-1/4 z-40 ${
        side === 'left' ? 'left-4' : 'right-4'
      }`}
    >
      {/* Panel principal estilo Street Fighter */}
      <div className={`
        bg-gradient-to-br ${playerColors.primary} 
        border-2 ${playerColors.border} rounded-lg
        backdrop-blur-md shadow-2xl ${playerColors.glow}
        p-4 min-w-[200px]
        transform transition-all duration-300
      `}>
        {/* Header del panel */}
        <div className="flex items-center justify-between mb-3">
          <div className={`${playerColors.text} font-bold text-sm uppercase tracking-wider`}>
            Fighter {playerId}
          </div>
          {hitHistory.length > 1 && (
            <div className={`
              bg-gradient-to-r ${playerColors.accent} 
              px-2 py-1 rounded-full text-xs font-bold text-white
              animate-pulse
            `}>
              {hitHistory.length} COMBO
            </div>
          )}
        </div>

        {/* Lista de golpes */}
        <div className="space-y-2">
          {hitHistory.map((hit, index) => {
            const timeRemaining = getTimeRemaining(hit);
            const hitRank = getHitRank(hit.force || 0);
            const isLatest = index === 0;
            
            return (
              <div
                key={hit.id}
                className={`
                  relative bg-black/30 rounded border ${playerColors.border}
                  p-2 transform transition-all duration-500
                  ${isLatest ? 'scale-105 animate-pulse' : ''}
                `}
                style={{ opacity: getOpacity(hit) }}
              >
                {/* Barra de progreso de tiempo */}
                <div className="absolute top-0 left-0 h-1 bg-white/20 rounded-t w-full">
                  <div 
                    className={`h-full bg-gradient-to-r ${playerColors.accent} rounded-t transition-all duration-100`}
                    style={{ width: `${(timeRemaining / 10) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  {/* Datos del golpe */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-lg ${playerColors.text}`}>
                        {Math.round(hit.force || 0)}N
                      </span>
                      <span className={`text-xs font-bold ${hitRank.color}`}>
                        {hitRank.rank}
                      </span>
                    </div>
                    
                    <div className={`text-xs ${playerColors.text} opacity-70 flex gap-3`}>
                      <span>V: {Math.round(hit.velocity || 0)}</span>
                      <span>A: {Math.round(hit.acceleration || 0)}</span>
                    </div>
                  </div>

                  {/* Indicador de posición en combo */}
                  <div className={`
                    w-6 h-6 rounded-full border-2 ${playerColors.border}
                    flex items-center justify-center
                    ${isLatest ? `bg-gradient-to-br ${playerColors.accent}` : 'bg-black/50'}
                  `}>
                    <span className={`text-xs font-bold ${playerColors.text}`}>
                      {index + 1}
                    </span>
                  </div>
                </div>

                {/* Efecto de nuevo golpe */}
                {isLatest && timeRemaining > 9.5 && (
                  <>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
                    <div className="absolute inset-0 border-2 border-yellow-400/50 rounded animate-pulse" />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Medidor de combo power */}
        {hitHistory.length > 1 && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between text-xs">
              <span className={`${playerColors.text} opacity-70`}>COMBO POWER</span>
              <span className={`font-bold ${playerColors.text}`}>
                {Math.round(hitHistory.reduce((sum, hit) => sum + (hit.force || 0), 0))}N
              </span>
            </div>
            <div className="mt-1 h-2 bg-black/50 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${playerColors.accent} transition-all duration-500`}
                style={{ 
                  width: `${Math.min(100, (hitHistory.length / 3) * 100)}%` 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Efectos de partículas para golpes perfectos */}
      {hitHistory[0] && getHitRank(hitHistory[0].force || 0).rank === 'PERFECT' && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
              style={{
                top: `${20 + i * 10}%`,
                left: `${10 + (i % 2) * 80}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HitHistoryClassic;
