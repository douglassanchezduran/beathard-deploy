import React from 'react';
import useWebSocketStore from '../stores/useWebSocketStore';

const StatsParcialScreen = () => {
  // Obtener todos los datos necesarios del WebSocket store
  const currentRound = useWebSocketStore(state => state.currentRound);
  const viewData = useWebSocketStore(state => state.viewData);
  const getPlayerMaxStats = useWebSocketStore(state => state.getPlayerMaxStats);
  const getPlayerCombatData = useWebSocketStore(state => state.getPlayerCombatData);
  const getPlayerTotalStats = useWebSocketStore(state => state.getPlayerTotalStats);
  const getAllRounds = useWebSocketStore(state => state.getAllRounds);
  
  // Obtener datos de los competidores del viewData o usar valores por defecto
  const competitor1 = viewData?.data?.competitor1 || { name: 'JUGADOR 1' };
  const competitor2 = viewData?.data?.competitor2 || { name: 'JUGADOR 2' };
  const battleConfig = viewData?.data?.battleConfig || { rounds: 3 };
  
  const totalRounds = battleConfig?.rounds || 3;
  const completedRounds = getAllRounds();
  
  // Obtener estadísticas de ambos jugadores
  const player1MaxStats = getPlayerMaxStats(1);
  const player2MaxStats = getPlayerMaxStats(2);
  const player1CombatData = getPlayerCombatData(1);
  const player2CombatData = getPlayerCombatData(2);
  const player1TotalStats = getPlayerTotalStats(1);
  const player2TotalStats = getPlayerTotalStats(2);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-red-900">
      {/* Logo BeatHard */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
        <img
          src="assets/logo-w.png"
          alt="BeatHard Logo"
          className="h-20 w-auto brightness-100 drop-shadow-2xl filter"
        />
      </div>

      {/* Título del evento */}
      <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-30 text-center">
        <div className="bg-black/80 px-12 py-4 rounded-xl">
          <h1 className="text-white text-3xl font-bold tracking-wider">BEAT HARD COMBAT</h1>
          <p className="text-gray-300 text-xl">ROUND {currentRound}</p>
        </div>
      </div>

      {/* Layout principal estilo UFC */}
      <div className="flex items-center justify-center h-full px-8">
        
        {/* Peleador 1 */}
        <div className="flex-1 flex justify-end pr-8">
          <div className="relative">
            {/* Foto del peleador */}
            <div className="w-[30rem] h-[36rem] relative overflow-hidden rounded-lg">
              {competitor1?.photoUrl ? (
                <img 
                  src={competitor1.photoUrl} 
                  alt={competitor1.name}
                  className="w-full h-full object-cover"
                />
              ) : null}
              {/* Fallback siempre visible */}
              <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center">
                <span className="text-white text-6xl font-bold">
                  {competitor1?.name?.charAt(0) || 'P1'}
                </span>
              </div>
              
              {/* Overlay con información */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                <h2 className="text-white text-2xl font-bold tracking-wider mb-1">
                  {competitor1?.name || "JUGADOR 1"}
                </h2>
                {competitor1?.nationality && (
                  <p className="text-gray-300 text-sm uppercase tracking-wide">
                    {competitor1.nationality}
                  </p>
                )}
                
                {/* Record */}
                <div className="flex items-center mt-2">
                  {competitor1?.countryFlag && (
                    <img 
                      src={competitor1.countryFlag} 
                      alt="Flag"
                      className="w-6 h-4 mr-2 rounded-sm"
                    />
                  )}
                  <span className="text-green-400 font-bold">
                    {player1TotalStats?.totalHits || "0"}-{completedRounds.length}
                  </span>
                  <span className="text-yellow-400 ml-2 text-sm">
                    +{player1MaxStats?.max_force?.toFixed(0) || "0"} MAX
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Panel central de estadísticas */}
        <div className="w-[36rem] mx-8">
          <div className="bg-black/90 rounded-xl p-12 border border-yellow-500 h-[36rem] flex flex-col justify-center">
            
            {/* Estadísticas comparativas */}
            <div className="space-y-8">
              
              {/* Fuerza Máxima */}
              <div className="grid grid-cols-3 items-center text-center">
                <div className="text-4xl font-bold text-white">
                  {player1MaxStats?.max_force?.toFixed(1) || "0.0"}
                  <span className="text-lg text-gray-400 ml-1">N</span>
                </div>
                <div className="text-gray-400 text-lg font-bold">FUERZA MÁX</div>
                <div className="text-4xl font-bold text-white">
                  {player2MaxStats?.max_force?.toFixed(1) || "0.0"}
                  <span className="text-lg text-gray-400 ml-1">N</span>
                </div>
              </div>

              <div className="border-t border-gray-700"></div>

              {/* Velocidad Máxima */}
              <div className="grid grid-cols-3 items-center text-center">
                <div className="text-4xl font-bold text-white">
                  {player1MaxStats?.max_velocity?.toFixed(1) || "0.0"}
                  <span className="text-lg text-gray-400 ml-1">m/s</span>
                </div>
                <div className="text-gray-400 text-lg font-bold">VELOCIDAD MÁX</div>
                <div className="text-4xl font-bold text-white">
                  {player2MaxStats?.max_velocity?.toFixed(1) || "0.0"}
                  <span className="text-lg text-gray-400 ml-1">m/s</span>
                </div>
              </div>

              <div className="border-t border-gray-700"></div>

              {/* Aceleración */}
              <div className="grid grid-cols-3 items-center text-center">
                <div className="text-4xl font-bold text-white">
                  {player1MaxStats?.max_acceleration?.toFixed(1) || "0.0"}
                  <span className="text-lg text-gray-400 ml-1">m/s²</span>
                </div>
                <div className="text-gray-400 text-lg font-bold">ACELERACIÓN</div>
                <div className="text-4xl font-bold text-white">
                  {player2MaxStats?.max_acceleration?.toFixed(1) || "0.0"}
                  <span className="text-lg text-gray-400 ml-1">m/s²</span>
                </div>
              </div>

              <div className="border-t border-gray-700"></div>

              {/* Total Golpes */}
              <div className="grid grid-cols-3 items-center text-center">
                <div className="text-4xl font-bold text-white">
                  {player1TotalStats?.totalHits || player1CombatData?.totalHits || "0"}
                </div>
                <div className="text-gray-400 text-lg font-bold">GOLPES</div>
                <div className="text-4xl font-bold text-white">
                  {player2TotalStats?.totalHits || player2CombatData?.totalHits || "0"}
                </div>
              </div>

              <div className="border-t border-gray-700"></div>

              {/* Promedio */}
              <div className="grid grid-cols-3 items-center text-center">
                <div className="text-3xl font-bold text-white">
                  {player1TotalStats?.averageForce?.toFixed(1) || "0.0"}
                  <span className="text-lg text-gray-400 ml-1">N</span>
                </div>
                <div className="text-gray-400 text-lg font-bold">PROMEDIO</div>
                <div className="text-3xl font-bold text-white">
                  {player2TotalStats?.averageForce?.toFixed(1) || "0.0"}
                  <span className="text-lg text-gray-400 ml-1">N</span>
                </div>
              </div>
            </div>

            {/* Sponsor */}
            <div className="mt-6 text-center">
              <div className="text-gray-500 text-xs">Powered by</div>
              <div className="text-blue-400 font-bold">BeatHard</div>
            </div>
          </div>
        </div>

        {/* Peleador 2 */}
        <div className="flex-1 flex justify-start pl-8">
          <div className="relative">
            {/* Foto del peleador */}
            <div className="w-[30rem] h-[36rem] relative overflow-hidden rounded-lg">
              {competitor2?.photoUrl ? (
                <img 
                  src={competitor2.photoUrl} 
                  alt={competitor2.name}
                  className="w-full h-full object-cover"
                />
              ) : null}
              {/* Fallback siempre visible */}
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                <span className="text-white text-6xl font-bold">
                  {competitor2?.name?.charAt(0) || 'P2'}
                </span>
              </div>
              
              {/* Overlay con información */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                <h2 className="text-white text-2xl font-bold tracking-wider mb-1">
                  {competitor2?.name || "JUGADOR 2"}
                </h2>
                {competitor2?.nationality && (
                  <p className="text-gray-300 text-sm uppercase tracking-wide">
                    {competitor2.nationality}
                  </p>
                )}
                
                {/* Record */}
                <div className="flex items-center mt-2">
                  {competitor2?.countryFlag && (
                    <img 
                      src={competitor2.countryFlag} 
                      alt="Flag"
                      className="w-6 h-4 mr-2 rounded-sm"
                    />
                  )}
                  <span className="text-green-400 font-bold">
                    {player2TotalStats?.totalHits || "0"}-{completedRounds.length}
                  </span>
                  <span className="text-yellow-400 ml-2 text-sm">
                    +{player2MaxStats?.max_force?.toFixed(0) || "0"} MAX
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsParcialScreen;
