import React, { useEffect } from 'react';
import useWebSocketStore from '../stores/useWebSocketStore';
import CoverScreen from './CoverScreen';
import StatsScreen from './StatsScreen';
import StatsParcialScreen from './StatsParcialScreen';
import ResumenScreen from './ResumenScreen';

const BeatHardApp = () => {
  const currentView = useWebSocketStore(state => state.currentView);
  const viewData = useWebSocketStore(state => state.viewData);
  const initWebSocket = useWebSocketStore(state => state.initWebSocket);
  const closeWebSocket = useWebSocketStore(state => state.closeWebSocket);

  useEffect(() => {
    // Inicializar WebSocket
    initWebSocket();
    
    // Cleanup al desmontar
    return () => {
      closeWebSocket();
    };
  }, [initWebSocket, closeWebSocket]);

  const renderView = () => {
    const screens = {
      'cover': <CoverScreen data={viewData} />,
      'stats': <StatsScreen data={viewData} />,
      'stats-parcial': <StatsParcialScreen data={viewData} />,
      'resumen': <ResumenScreen data={viewData} />,
    };

    return screens[currentView] ?? <CoverScreen data={viewData} />;
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {renderView()}
    </div>
  );
};

export default BeatHardApp;
