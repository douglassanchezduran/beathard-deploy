import React, { useMemo, useState, useEffect } from 'react';

import useWebSocketStore from '../stores/useWebSocketStore';
import HitHistorySidebar from './history/HitHistorySidebar';

const StatsScreen = ({ data }) => {
  const getPlayerCombatData = useWebSocketStore(state => state.getPlayerCombatData);
  const getPlayerMaxStats = useWebSocketStore(state => state.getPlayerMaxStats);
  const getPlayerTotalHits = useWebSocketStore(state => state.getPlayerTotalHits);
  const currentRound = useWebSocketStore(state => state.currentRound);
  const getAllRounds = useWebSocketStore(state => state.getAllRounds);
  const getCompetitorData = useWebSocketStore(state => state.getCompetitorData);
  
  // Obtener datos de competidores del store persistente con fallback a los datos del evento
  const competitor1 = getCompetitorData(1) || data?.data?.competitor1;
  const competitor2 = getCompetitorData(2) || data?.data?.competitor2;
  const setCompetitorData = useWebSocketStore(state => state.setCompetitorData);
  const battleConfig = data?.data?.battleConfig;
  
  // Estado para el timer
  const [timeLeft, setTimeLeft] = useState(battleConfig?.roundDuration || 0);
  
  // Calcular rounds completados para mostrar indicadores
  const completedRounds = getAllRounds();
  const totalRounds = battleConfig?.rounds || 3;
  const isTimeMode = battleConfig?.mode === 'time';
  
  // Formatear tiempo para mostrar
  const timeFormatted = useMemo(() => {
    if (!isTimeMode || !timeLeft) return null;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = String(timeLeft % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timeLeft, isTimeMode]);
  
  // Efecto para manejar el timer (solo si es modo tiempo)
  useEffect(() => {
    if (!isTimeMode || timeLeft <= 0) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isTimeMode, timeLeft]);
  
  // Efecto para guardar los datos de competidores en el store cuando se reciben
    useEffect(() => {
      if (data?.data?.competitor1 || data?.data?.competitor2) {
        console.log('CAMBIAR DATOS');
        setCompetitorData(data.data.competitor1, data.data.competitor2);
      }
    }, [data?.data?.competitor1, data?.data?.competitor2, setCompetitorData]);
  
  // Resetear timer cuando cambia el round
  useEffect(() => {
    if (isTimeMode && battleConfig?.roundDuration) {
      setTimeLeft(battleConfig.roundDuration);
    }
  }, [currentRound, isTimeMode, battleConfig?.roundDuration]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video de fondo simulando transmisión */}
      {/* <video 
        className="absolute inset-0 w-full h-full object-cover"
        src="https://videos.pexels.com/video-files/4761711/4761711-uhd_2732_1440_25fps.mp4"
        autoPlay
        loop
        muted
        playsInline
      /> */}
      
      {/* Logo discreto con fondo sólido */}
      {/* <div className="absolute top-6 left-6 z-10"> */}
        <img
          src="/assets/logo-w.png"
          alt="BeatHard Logo"
          className="absolute top-6 left-6 w-24 filter brightness-90 drop-shadow-lg"
        />
      {/* </div> */}

      {/* Barra de información con máxima semitransparencia */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/25 backdrop-blur-sm border-t border-white/10 z-10 hover:bg-black/35 transition-all duration-300">
        <div className="bg-gradient-to-t from-black/30 via-black/15 to-transparent">
          <div className="max-w-7xl mx-auto px-8 py-6">
          
          {/* Indicadores de rounds sutiles */}
          <div className="flex justify-center mb-6">
            <div className="flex space-x-1">
              {Array.from({ length: totalRounds }, (_, i) => (
                <div
                  key={i + 1}
                  className={`w-8 h-1 rounded-full transition-all duration-300 ${
                    i + 1 < currentRound
                      ? "bg-green-400/80" // Rounds completados
                      : i + 1 === currentRound
                      ? "bg-white/80" // Round actual
                      : "bg-white/20" // Rounds futuros
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Información principal */}
          <div className="flex items-end justify-center space-x-32">
            
            {/* Player 1 - Último golpe */}
            <div className="flex items-end space-x-4">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <div 
                    className="text-2xl text-red-400 uppercase font-bold tracking-wider drop-shadow-lg" 
                    // style={{ color: player1Color }}
                  >
                    {competitor1?.name || "PELEADOR 1"}
                  </div>
                  {competitor1?.countryFlag && (
                    <img 
                      src={competitor1.countryFlag} 
                      alt="Flag"
                      className="w-6 h-4 object-cover rounded-sm opacity-80"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/90 drop-shadow-md">Fuerza:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-semibold drop-shadow-md">{getPlayerCombatData(1)?.lastHit?.force?.toFixed(1) || "0.0"} N</span>
                      {getPlayerMaxStats(1) && (
                        <span className="text-yellow-300 text-xs drop-shadow-md">
                          (Max: {getPlayerMaxStats(1).max_force?.toFixed(1)} N)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/90 drop-shadow-md">Velocidad:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-semibold drop-shadow-md">{getPlayerCombatData(1)?.lastHit?.velocity?.toFixed(1) || "0.0"} m/s</span>
                      {getPlayerMaxStats(1) && (
                        <span className="text-yellow-300 text-xs drop-shadow-md">
                          (Max: {getPlayerMaxStats(1).max_velocity?.toFixed(1)} m/s)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/90 drop-shadow-md pr-4">Aceleración:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-semibold drop-shadow-md">{getPlayerCombatData(1)?.lastHit?.acceleration?.toFixed(1) || "0.0"} m/s²</span>
                      {getPlayerMaxStats(1) && (
                        <span className="text-yellow-300 text-xs drop-shadow-md">
                          (Max: {getPlayerMaxStats(1).max_acceleration?.toFixed(1)} m/s²)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-white/20">
                    <span className="text-white/90 drop-shadow-md">Total Golpes:</span>
                    <span className="text-yellow-300 font-semibold drop-shadow-md">{getPlayerTotalHits(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Centro - Round y Contador */}
            <div className="text-center">
              <div className="text-white text-sm uppercase tracking-widest mb-1 drop-shadow-lg">
                Round {currentRound}
              </div>
              
              {/* Mostrar timer si es modo tiempo, sino mostrar número de round grande */}
              {isTimeMode && timeFormatted ? (
                <>
                  <div className="text-white text-5xl font-light tracking-wider mb-2 drop-shadow-2xl">
                    {timeFormatted}
                  </div>
                  <div className="text-white/90 text-xs uppercase tracking-widest drop-shadow-md">
                    Tiempo restante
                  </div>
                </>
              ) : (
                <>
                  <div className="text-white text-5xl font-bold tracking-wider mb-2 drop-shadow-2xl">
                    {currentRound}
                  </div>
                  <div className="text-white/90 text-xs uppercase tracking-widest drop-shadow-md">
                    {completedRounds.length > 0 ? `${completedRounds.length} rounds completados` : 'Round actual'}
                  </div>
                </>
              )}
            </div>

            {/* Player 2 - Último golpe */}
            <div className="flex items-end space-x-4 text-right">
              <div>
                <div className="flex items-center justify-end space-x-2 mb-2">
                  {competitor2?.countryFlag && (
                    <img 
                      src={competitor2.countryFlag} 
                      alt="Flag"
                      className="w-6 h-4 object-cover rounded-sm opacity-80"
                    />
                  )}
                  <div 
                    className="text-2xl text-blue-400 uppercase font-bold tracking-wider drop-shadow-lg" 
                    // style={{ color: player2Color }}
                  >
                    {competitor2?.name || "PELEADOR 2"}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/90 drop-shadow-md">Fuerza:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-semibold drop-shadow-md">{getPlayerCombatData(2)?.lastHit?.force?.toFixed(1) || "0.0"} N</span>
                      {getPlayerMaxStats(2) && (
                        <span className="text-yellow-300 text-xs drop-shadow-md">
                          (Max: {getPlayerMaxStats(2).max_force?.toFixed(1)} N)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/90 drop-shadow-md">Velocidad:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-semibold drop-shadow-md">{getPlayerCombatData(2)?.lastHit?.velocity?.toFixed(1) || "0.0"} m/s</span>
                      {getPlayerMaxStats(2) && (
                        <span className="text-yellow-300 text-xs drop-shadow-md">
                          (Max: {getPlayerMaxStats(2).max_velocity?.toFixed(1)} m/s)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/90 drop-shadow-md pr-4">Aceleración:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-semibold drop-shadow-md">{getPlayerCombatData(2)?.lastHit?.acceleration?.toFixed(1) || "0.0"} m/s²</span>
                      {getPlayerMaxStats(2) && (
                        <span className="text-yellow-300 text-xs drop-shadow-md">
                          (Max: {getPlayerMaxStats(2).max_acceleration?.toFixed(1)} m/s²)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-white/20">
                    <span className="text-white/90 drop-shadow-md">Total Golpes:</span>
                    <span className="text-yellow-300 font-semibold drop-shadow-md">{getPlayerTotalHits(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <HitHistorySidebar playerId={1} side="left" />
      <HitHistorySidebar playerId={2} side="right" />
    </div>
  );
};

export default StatsScreen;
