import React, { useEffect, useState } from 'react';
import useWebSocketStore from '../../stores/useWebSocketStore';

const HitHistoryFloating = ({ playerId, side = 'left' }) => {
  const getPlayerHitHistory = useWebSocketStore(state => state.getPlayerHitHistory);
  const cleanExpiredHits = useWebSocketStore(state => state.cleanExpiredHits);
  const [hitHistory, setHitHistory] = useState([]);

  // Colores y efectos por peleador
  const colors = {
    1: { 
      primary: 'from-red-600 to-red-400', 
      glow: 'shadow-red-500/50',
      accent: 'text-orange-300',
      border: 'border-red-400'
    },
    2: { 
      primary: 'from-blue-600 to-blue-400', 
      glow: 'shadow-blue-500/50',
      accent: 'text-cyan-300',
      border: 'border-blue-400'
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
    if (timeRemaining > 7) return 1;
    return Math.max(0.2, timeRemaining / 7);
  };

  // Calcular posición vertical flotante
  const getFloatingPosition = (index) => {
    const baseOffset = index * 120;
    const floatOffset = Math.sin(Date.now() / 1000 + index) * 5;
    return baseOffset + floatOffset;
  };

  if (hitHistory.length === 0) return null;

  return (
    <div 
      className={`fixed top-1/4 z-50 ${
        side === 'left' ? 'left-4' : 'right-4'
      }`}
      style={{
        width: '180px',
        [side === 'left' ? 'left' : 'right']: '16px'
      }}
    >
      {hitHistory.map((hit, index) => (
        <div
          key={hit.id}
          className={`
            relative bg-gradient-to-br ${playerColors.primary}
            backdrop-blur-md border-2 ${playerColors.border}
            rounded-xl p-2 w-full shadow-2xl ${playerColors.glow}
            transform transition-all duration-500 ease-out mb-3
            ${index === 0 ? 'scale-105 z-10' : 'scale-95'}
          `}
          style={{ 
            opacity: getOpacity(hit),
            filter: `brightness(${index === 0 ? 1.2 : 0.8})`
          }}
        >
          {/* Efecto de brillo superior */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/30 rounded-t-xl" />
          
          {/* Header con icono de impacto - más compacto */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-1">
              <div className={`
                w-6 h-6 rounded-full bg-white/20 flex items-center justify-center
                ${index === 0 ? 'animate-pulse' : ''}
              `}>
                <span className="text-white font-bold text-xs">💥</span>
              </div>
              <div>
                <div className="text-white font-bold text-xs uppercase tracking-wider">
                  HIT #{index + 1}
                </div>
                <div className={`text-xs ${playerColors.accent}`}>
                  {getTimeRemaining(hit).toFixed(1)}s
                </div>
              </div>
            </div>
            
            {/* Medidor de potencia */}
            <div className="text-right">
              <div className="text-white text-xs opacity-70">POT</div>
              <div className="text-yellow-300 font-bold text-sm">
                {Math.round((hit.force || 0) / 10)}%
              </div>
            </div>
          </div>

          {/* Stats principales con iconos - más compacto */}
          <div className="grid grid-cols-3 gap-1 mb-2">
            <div className="text-center">
              <div className="text-white/70 text-xs">⚡ FUERZA</div>
              <div className="text-white font-bold text-xs">
                {hit.force?.toFixed(0) || '0'} N
              </div>
            </div>
            <div className="text-center">
              <div className="text-white/70 text-xs">🚀 VEL</div>
              <div className="text-white font-bold text-xs">
                {hit.velocity?.toFixed(1) || '0.0'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-white/70 text-xs">⚡ ACC</div>
              <div className="text-white font-bold text-xs">
                {hit.acceleration?.toFixed(1) || '0.0'}
              </div>
            </div>
          </div>

          {/* Barra de tiempo con efecto neón */}
          <div className="relative h-2 bg-black/30 rounded-full overflow-hidden mb-2">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-100 ease-linear"
              style={{ 
                width: `${(getTimeRemaining(hit) / 10) * 100}%`,
                boxShadow: '0 0 10px rgba(255, 193, 7, 0.5)'
              }}
            />
          </div>

          {/* Efecto de partículas para golpe nuevo */}
          {index === 0 && getTimeRemaining(hit) > 9.5 && (
            <>
              <div className="absolute -top-3 -left-3 w-6 h-6 bg-yellow-400 rounded-full animate-ping opacity-75" />
              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-2 py-1 rounded-full animate-bounce shadow-lg">
                ¡NUEVO!
              </div>
            </>
          )}

          {/* Efecto de daño crítico */}
          {(hit.force || 0) > 300 && (
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
              CRÍTICO
            </div>
          )}
        </div>
      ))}

      {/* Medidor de combo - posicionado después de las tarjetas */}
      {hitHistory.length > 1 && (
        <div 
          className={`
            relative mt-4 mx-auto
            bg-gradient-to-r ${playerColors.primary} backdrop-blur-md
            border-2 ${playerColors.border} rounded-full px-3 py-2
            shadow-2xl ${playerColors.glow} animate-pulse w-14 h-14
            flex items-center justify-center
          `}
        >
          <div className="text-center">
            <div className="text-yellow-300 font-bold text-sm">
              {hitHistory.length}x
            </div>
            <div className="text-white text-xs font-bold uppercase">
              COMBO
            </div>
          </div>
          
          {/* Efecto de rayos para combo alto */}
          {hitHistory.length >= 3 && (
            <div className="absolute inset-0 rounded-full animate-ping bg-yellow-400/20" />
          )}
        </div>
      )}
    </div>
  );
};

export default HitHistoryFloating;
