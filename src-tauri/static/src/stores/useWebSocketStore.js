import { create } from 'zustand';

const useWebSocketStore = create((set, get) => ({
  // Estado
  currentView: 'cover',
  viewData: {},
  combatData: {}, // Estructura: { fighter_1: {...}, fighter_2: {...} }
  maxStatsData: {}, // Estructura: { fighter_1: {...}, fighter_2: {...} }
  roundsHistory: {}, // Estructura: { round_1: { fighter_1: {...}, fighter_2: {...} }, round_2: {...} }
  currentRound: 1,
  ws: null,
  isConnected: false,
  competitorData: {}, // Almacena datos persistentes de los competidores

  // Acciones
  setCurrentView: (view) => set({ currentView: view }),
  setViewData: (data) => set({ viewData: data }),

  updateCombatData: (eventData) => set((state) => {
    const fighterData = eventData.data;
    const currentFighter = state.combatData[fighterData.fighter_id] || { 
      name: fighterData.competitor_name, 
      hitHistory: [],
      totalHits: 0 // Contador manejado en frontend
    };
    
    const newHit = {
      force: fighterData.force,
      velocity: fighterData.velocity,
      acceleration: fighterData.acceleration,
      timestamp: fighterData.timestamp,
      id: Date.now() + Math.random(), // ID único para el golpe
      expiresAt: Date.now() + 10000 // Expira en 10 segundos
    };
    
    // Filtrar golpes expirados y mantener solo los últimos 3
    const now = Date.now();
    const validHits = currentFighter.hitHistory.filter(hit => hit.expiresAt > now);
    const updatedHistory = [newHit, ...validHits].slice(0, 3);
    
    return {
      combatData: {
        ...state.combatData,
        [fighterData.fighter_id]: {
          name: fighterData.competitor_name,
          lastHit: newHit,
          hitHistory: updatedHistory,
          totalHits: (currentFighter.totalHits || 0) + 1 // Incrementar contador frontend
        }
      }
    };
  }),
  
  // Limpiar golpes expirados
  cleanExpiredHits: () => set((state) => {
    const now = Date.now();
    const cleanedCombatData = {};
    
    Object.keys(state.combatData).forEach(fighterId => {
      const fighter = state.combatData[fighterId];
      const validHits = fighter.hitHistory?.filter(hit => hit.expiresAt > now) || [];
      
      cleanedCombatData[fighterId] = {
        ...fighter,
        hitHistory: validHits
      };
    });
    
    return { combatData: cleanedCombatData };
  }),
  
  // Helper para obtener datos de un peleador
  getPlayerCombatData: (playerId) => {
    const { combatData } = get();
    const fighterKey = `fighter_${playerId}`;
    return combatData[fighterKey] || null;
  },

  // Helper para obtener total de golpes de un peleador
  getPlayerTotalHits: (playerId) => {
    const { combatData } = get();
    const fighterKey = `fighter_${playerId}`;
    return combatData[fighterKey]?.totalHits || 0;
  },

  // Función para avanzar al siguiente round
  advanceToNextRound: () => set((state) => {
    const currentRoundKey = `round_${state.currentRound}`;
    
    // Guardar datos del round actual en el historial
    const updatedRoundsHistory = {
      ...state.roundsHistory,
      [currentRoundKey]: {
        ...state.combatData,
        roundNumber: state.currentRound,
        timestamp: Date.now()
      }
    };
    
    // Resetear datos de combate para el nuevo round
    const resetCombatData = {};
    Object.keys(state.combatData).forEach(fighterId => {
      resetCombatData[fighterId] = {
        name: state.combatData[fighterId]?.name || '',
        totalHits: 0,
        hitHistory: []
      };
    });
    
    return {
      roundsHistory: updatedRoundsHistory,
      currentRound: state.currentRound + 1,
      combatData: resetCombatData
    };
  }),
  
  // Función para resetear contadores (útil para nuevos rounds)
  resetPlayerCounters: () => set((state) => {
    const resetCombatData = {};
    Object.keys(state.combatData).forEach(fighterId => {
      resetCombatData[fighterId] = {
        ...state.combatData[fighterId],
        totalHits: 0,
        hitHistory: []
      };
    });
    return { combatData: resetCombatData };
  }),
  
  // Helper para obtener historial de golpes de un peleador
  getPlayerHitHistory: (playerId) => {
    const { combatData } = get();
    const fighterKey = `fighter_${playerId}`;
    return combatData[fighterKey]?.hitHistory || [];
  },
  
  // Helper para obtener datos de un round específico
  getRoundData: (roundNumber) => {
    const { roundsHistory } = get();
    const roundKey = `round_${roundNumber}`;
    return roundsHistory[roundKey] || null;
  },
  
  // Helper para obtener datos de un peleador en un round específico
  getPlayerRoundData: (playerId, roundNumber) => {
    const roundData = get().getRoundData(roundNumber);
    if (!roundData) return null;
    const fighterKey = `fighter_${playerId}`;
    return roundData[fighterKey] || null;
  },
  
  // Helper para obtener todos los rounds completados
  getAllRounds: () => {
    const { roundsHistory } = get();
    return Object.keys(roundsHistory)
      .map(key => roundsHistory[key])
      .sort((a, b) => a.roundNumber - b.roundNumber);
  },
  
  // Helper para obtener estadísticas totales de todos los rounds
  getPlayerTotalStats: (playerId) => {
    const { roundsHistory, combatData } = get();
    const fighterKey = `fighter_${playerId}`;
    
    let totalHits = 0;
    let totalForce = 0;
    let maxVelocity = 0;
    let maxAcceleration = 0;
    
    // Sumar estadísticas de rounds completados
    Object.values(roundsHistory).forEach(round => {
      const playerData = round[fighterKey];
      if (playerData) {
        totalHits += playerData.totalHits || 0;
        if (playerData.lastHit) {
          totalForce += playerData.lastHit.force || 0;
          maxVelocity = Math.max(maxVelocity, playerData.lastHit.velocity || 0);
          maxAcceleration = Math.max(maxAcceleration, playerData.lastHit.acceleration || 0);
        }
      }
    });
    
    // Agregar estadísticas del round actual
    const currentPlayerData = combatData[fighterKey];
    if (currentPlayerData) {
      totalHits += currentPlayerData.totalHits || 0;
      if (currentPlayerData.lastHit) {
        totalForce += currentPlayerData.lastHit.force || 0;
        maxVelocity = Math.max(maxVelocity, currentPlayerData.lastHit.velocity || 0);
        maxAcceleration = Math.max(maxAcceleration, currentPlayerData.lastHit.acceleration || 0);
      }
    }
    
    return {
      totalHits,
      averageForce: totalHits > 0 ? totalForce / totalHits : 0,
      maxVelocity,
      maxAcceleration,
      roundsPlayed: Object.keys(roundsHistory).length + 1
    };
  },
  
  // Función para resetear toda la batalla
  resetBattle: () => set({
    combatData: {},
    roundsHistory: {},
    currentRound: 1,
    maxStatsData: {},
    // No reseteamos competitorData para mantener persistencia entre batallas
  }),
  
  // Mantener función legacy para compatibilidad
  setCombatData: (data) => set({ combatData: data }),
  
  // Funciones para manejar datos persistentes de competidores
  setCompetitorData: (competitor1, competitor2) => set((state) => {
    const updatedCompetitorData = { ...state.competitorData };
    
    if (competitor1) {
      updatedCompetitorData[1] = competitor1;
    }
    
    if (competitor2) {
      updatedCompetitorData[2] = competitor2;
    }
    
    return { competitorData: updatedCompetitorData };
  }),
  
  getCompetitorData: (competitorId) => {
    const { competitorData } = get();
    return competitorData[competitorId] || null;
  },
  // Optimizada: Actualizar solo el peleador específico
  updateMaxStats: (fighterData) => set((state) => ({
    maxStatsData: {
      ...state.maxStatsData,
      [fighterData.fighter_id]: fighterData
    }
  })),
  
  // Función helper para obtener stats de un peleador
  getPlayerMaxStats: (playerId) => {
    const { maxStatsData } = get();
    const fighterKey = `fighter_${playerId}`;
    return maxStatsData[fighterKey] || null;
  },
  setConnectionStatus: (status) => set({ isConnected: status }),

  // Inicializar WebSocket
  initWebSocket: () => {
    const ws = new WebSocket('ws://127.0.0.1:8080/ws');
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      set({ ws, isConnected: true });
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      set({ isConnected: false });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      set({ isConnected: false });
    };

    ws.onmessage = (event) => {
      const receivedData = JSON.parse(event.data);
      console.log("WebSocket message received:", receivedData);

      // Si es round_advance, solo actualizar el round sin cambiar vista
      if (receivedData.viewType === 'round_advance') {
        get().advanceToNextRound();
        return;
      }

      // Para otros tipos de mensaje, manejar cambios de vista normalmente
      get().setCurrentView(receivedData.viewType);
      get().setViewData(receivedData);
      
      // Si es stats, actualizar solo ese peleador
      if (receivedData.viewType === 'stats') {
        get().updateCombatData(receivedData);
      }

      // Si es max_stats_update, actualizar solo ese peleador
      if (receivedData.type === 'max_stats_update') {
        get().updateMaxStats(receivedData.data);
      }
    };

    set({ ws });
  },

  // Cerrar WebSocket
  closeWebSocket: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
      set({ ws: null, isConnected: false });
    }
  }
}));

export default useWebSocketStore;
