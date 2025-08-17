import React, { useEffect, useState } from 'react';
import useWebSocketStore from '../../stores/useWebSocketStore';

const HitHistoryNeon = ({ playerId, side = 'left' }) => {
  const getPlayerHitHistory = useWebSocketStore(state => state.getPlayerHitHistory);
  const cleanExpiredHits = useWebSocketStore(state => state.cleanExpiredHits);
  const [hitHistory, setHitHistory] = useState([]);

  // Colores neón cyberpunk
  const colors = {
    1: { 
      primary: 'from-pink-400 via-red-500 to-orange-600', 
      glow: 'shadow-pink-400/50',
      border: 'border-pink-400',
      text: 'text-pink-100',
      neon: 'shadow-[0_0_20px_#ff1493]'
    },
    2: { 
      primary: 'from-cyan-400 via-blue-500 to-purple-600', 
      glow: 'shadow-cyan-400/50',
      border: 'border-cyan-400',
      text: 'text-cyan-100',
      neon: 'shadow-[0_0_20px_#00ffff]'
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
    return Math.max(0.4, timeRemaining / 10);
  };

  const getHitIntensity = (force) => {
    if (force >= 80) return { level: 'CRITICAL', glow: 'shadow-[0_0_30px_#ffff00]', color: 'text-yellow-300' };
    if (force >= 60) return { level: 'HEAVY', glow: 'shadow-[0_0_25px_#ff6600]', color: 'text-orange-300' };
    if (force >= 40) return { level: 'MEDIUM', glow: 'shadow-[0_0_20px_#00ff00]', color: 'text-green-300' };
    return { level: 'LIGHT', glow: 'shadow-[0_0_15px_#ffffff]', color: 'text-white' };
  };

  if (hitHistory.length === 0) return null;

  return (
    <div 
      className={`fixed top-1/3 z-50 ${
        side === 'left' ? 'left-6' : 'right-6'
      }`}
    >
      {/* Panel principal con efecto neón */}
      <div className={`
        relative bg-black/80 backdrop-blur-xl
        border-2 ${playerColors.border} rounded-xl
        ${playerColors.neon} p-4 min-w-[220px]
        before:absolute before:inset-0 before:bg-gradient-to-br before:${playerColors.primary} 
        before:opacity-10 before:rounded-xl before:blur-sm
      `}>
        {/* Líneas de escaneo animadas */}
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <div className={`
            absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${playerColors.primary}
            animate-pulse opacity-60
          `} />
          <div className={`
            absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r ${playerColors.primary}
            animate-pulse opacity-60
          `} style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Header holográfico */}
        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className={`${playerColors.text} font-mono text-sm uppercase tracking-widest`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${playerColors.primary} animate-pulse`} />
              FIGHTER_{playerId.toString().padStart(2, '0')}
            </div>
          </div>
          
          {hitHistory.length > 1 && (
            <div className={`
              relative bg-gradient-to-r ${playerColors.primary} 
              px-3 py-1 rounded-full text-xs font-mono font-bold text-black
              ${playerColors.neon} animate-pulse
              before:absolute before:inset-0 before:bg-white/20 before:rounded-full before:animate-ping
            `}>
              COMBO_x{hitHistory.length}
            </div>
          )}
        </div>

        {/* Grid de golpes con efecto holográfico */}
        <div className="relative z-10 space-y-3">
          {hitHistory.map((hit, index) => {
            const timeRemaining = getTimeRemaining(hit);
            const hitIntensity = getHitIntensity(hit.force || 0);
            const isLatest = index === 0;
            
            return (
              <div
                key={hit.id}
                className={`
                  relative bg-black/60 backdrop-blur-sm rounded-lg
                  border ${playerColors.border} p-3
                  transform transition-all duration-500
                  ${isLatest ? 'scale-105' : ''}
                  ${hitIntensity.glow}
                `}
                style={{ opacity: getOpacity(hit) }}
              >
                {/* Barra de energía temporal */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-black/50 rounded-t-lg overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${playerColors.primary} transition-all duration-100`}
                    style={{ width: `${(timeRemaining / 10) * 100}%` }}
                  />
                  <div className={`absolute inset-0 bg-gradient-to-r ${playerColors.primary} opacity-30 animate-pulse`} />
                </div>

                <div className="flex items-center justify-between">
                  {/* Datos del impacto */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`font-mono text-xl font-bold ${playerColors.text}`}>
                        {Math.round(hit.force || 0).toString().padStart(3, '0')}
                      </span>
                      <span className={`text-xs font-mono font-bold ${hitIntensity.color} tracking-wider`}>
                        {hitIntensity.level}
                      </span>
                    </div>
                    
                    <div className={`text-xs font-mono ${playerColors.text} opacity-70 mt-1 grid grid-cols-2 gap-2`}>
                      <span>VEL: {Math.round(hit.velocity || 0).toString().padStart(3, '0')}</span>
                      <span>ACC: {Math.round(hit.acceleration || 0).toString().padStart(3, '0')}</span>
                    </div>
                  </div>

                  {/* Indicador de secuencia */}
                  <div className={`
                    relative w-8 h-8 rounded-full border-2 ${playerColors.border}
                    flex items-center justify-center
                    ${isLatest ? `bg-gradient-to-br ${playerColors.primary} ${playerColors.neon}` : 'bg-black/70'}
                  `}>
                    <span className={`text-xs font-mono font-bold ${isLatest ? 'text-black' : playerColors.text}`}>
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    
                    {isLatest && (
                      <div className={`absolute inset-0 rounded-full border-2 ${playerColors.border} animate-ping`} />
                    )}
                  </div>
                </div>

                {/* Efecto de impacto reciente */}
                {isLatest && timeRemaining > 9.5 && (
                  <div className="absolute inset-0 rounded-lg overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-r ${playerColors.primary} opacity-20 animate-pulse`} />
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white animate-ping" />
                  </div>
                )}

                {/* Líneas de datos holográficas */}
                <div className="absolute right-2 top-2 bottom-2 w-0.5 bg-gradient-to-b from-transparent via-white/30 to-transparent" />
              </div>
            );
          })}
        </div>

        {/* Medidor de potencia total */}
        {hitHistory.length > 1 && (
          <div className="relative z-10 mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className={`${playerColors.text} opacity-70 tracking-wider`}>TOTAL_POWER</span>
              <span className={`font-bold ${playerColors.text}`}>
                {Math.round(hitHistory.reduce((sum, hit) => sum + (hit.force || 0), 0)).toString().padStart(4, '0')}N
              </span>
            </div>
            
            <div className="relative h-3 bg-black/70 rounded-full overflow-hidden border border-white/30">
              <div 
                className={`h-full bg-gradient-to-r ${playerColors.primary} transition-all duration-500 ${playerColors.glow}`}
                style={{ width: `${Math.min(100, (hitHistory.length / 3) * 100)}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
          </div>
        )}

        {/* Efectos de partículas para golpes críticos */}
        {hitHistory[0] && getHitIntensity(hitHistory[0].force || 0).level === 'CRITICAL' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-1 h-1 rounded-full bg-gradient-to-r ${playerColors.primary} animate-ping`}
                style={{
                  top: `${15 + (i * 10)}%`,
                  left: `${10 + (i % 3) * 40}%`,
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '1.5s'
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HitHistoryNeon;
