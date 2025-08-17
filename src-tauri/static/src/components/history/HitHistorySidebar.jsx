import React, { useEffect, useState } from 'react';
import useWebSocketStore from '../../stores/useWebSocketStore';

const HitHistorySidebar = ({ playerId, side = 'left' }) => {
  const getPlayerHitHistory = useWebSocketStore(state => state.getPlayerHitHistory);
  const cleanExpiredHits = useWebSocketStore(state => state.cleanExpiredHits);
  const [hitHistory, setHitHistory] = useState([]);

  // Colores por peleador
  const colors = {
    1: { bg: 'bg-red-500/20', border: 'border-red-400/40', text: 'text-blue-100' },
    2: { bg: 'bg-blue-500/20', border: 'border-blue-400/40', text: 'text-red-100' }
  };

  const playerColors = colors[playerId] || colors[1];

  useEffect(() => {
    // Actualizar historial cada 100ms para animaciones suaves
    const interval = setInterval(() => {
      const currentHistory = getPlayerHitHistory(playerId);
      setHitHistory(currentHistory);
      cleanExpiredHits(); // Limpiar golpes expirados
    }, 100);

    return () => clearInterval(interval);
  }, [playerId, getPlayerHitHistory, cleanExpiredHits]);

  // Calcular tiempo restante para cada golpe
  const getTimeRemaining = (hit) => {
    const remaining = hit.expiresAt - Date.now();
    return Math.max(0, remaining / 1000); // Segundos restantes
  };

  // Calcular opacidad basada en tiempo restante
  const getOpacity = (hit) => {
    const timeRemaining = getTimeRemaining(hit);
    if (timeRemaining > 7) return 1; // Completamente visible primeros 3 segundos
    if (timeRemaining > 3) return 0.8; // Ligero fade
    return Math.max(0.3, timeRemaining / 3); // Fade out gradual
  };

  if (hitHistory.length === 0) return null;

  return (
    <div 
      className={`fixed top-1/2 transform -translate-y-1/2 z-40 ${
        side === 'left' ? 'left-4' : 'right-4'
      }`}
    >
      <div className="space-y-2">
        {hitHistory.map((hit, index) => (
          <div
            key={hit.id}
            className={`
              ${playerColors.bg} ${playerColors.border} ${playerColors.text}
              backdrop-blur-sm border rounded-lg p-3 min-w-[200px]
              transform transition-all duration-300 ease-out
              ${index === 0 ? 'scale-105 shadow-lg' : 'scale-100'}
            `}
            style={{ 
              opacity: getOpacity(hit),
              animationDelay: `${index * 100}ms`
            }}
          >
            {/* Header del golpe */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  index === 0 ? 'bg-yellow-400 animate-pulse' : 'bg-white/60'
                }`} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Golpe {index + 1}
                </span>
              </div>
              <div className="text-xs opacity-70">
                {getTimeRemaining(hit).toFixed(1)}s
              </div>
            </div>

            {/* Estadísticas del golpe */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Fuerza:</span>
                <span className="font-bold">
                  {hit.force?.toFixed(1) || '0.0'} N
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Velocidad:</span>
                <span className="font-bold">
                  {hit.velocity?.toFixed(1) || '0.0'} m/s
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-80">Aceleración:</span>
                <span className="font-bold">
                  {hit.acceleration?.toFixed(1) || '0.0'} m/s²
                </span>
              </div>
            </div>

            {/* Barra de progreso de tiempo restante */}
            <div className="mt-2 h-1 bg-black/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white/60 transition-all duration-100 ease-linear"
                style={{ 
                  width: `${(getTimeRemaining(hit) / 10) * 100}%` 
                }}
              />
            </div>

            {/* Efecto de "NUEVO" para el golpe más reciente */}
            {index === 0 && getTimeRemaining(hit) > 9.5 && (
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                NUEVO
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Indicador de combo si hay múltiples golpes recientes */}
      {hitHistory.length > 1 && (
        <div className={`
          mt-3 text-center ${playerColors.text}
          text-sm font-bold uppercase tracking-wider
          animate-pulse
        `}>
          {hitHistory.length}x COMBO!
        </div>
      )}
    </div>
  );
};

export default HitHistorySidebar;
