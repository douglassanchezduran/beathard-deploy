import React, { useRef } from 'react';
import useBattleStore from '../stores/useBattleStore';
import { useBLEStore } from '@stores/useBLEStore';
import {
  BattleHeader,
  BattleTimer,
  BattleActions,
  CompetitorPanel,
  BroadcastControls,
  // BroadcastPreview,
} from './live-battle/components';
import { useBattleTimer, useBattleStats } from './live-battle/hooks';

interface LiveBattleScreenProps {
  onFinish: () => void;
  onCancel: () => void;
}

const LiveBattleScreen: React.FC<LiveBattleScreenProps> = ({
  onFinish,
  onCancel,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Estado para controles de transmisión
  // const [isScreenVisible, setIsScreenVisible] = React.useState(true);
  /* const [currentBroadcastView, setCurrentBroadcastView] = React.useState<
    'cover' | 'hits' | 'round' | 'summary' | 'idle'
  >('idle'); */

  // Battle Store
  const competitor1 = useBattleStore(state => state.competitor1);
  const competitor2 = useBattleStore(state => state.competitor2);
  const battleConfig = useBattleStore(state => state.battleConfig);

  // BLE Store
  const combatEvents = useBLEStore(state => state.combatEvents);
  const getCompetitor1Events = useBLEStore(state => state.getCompetitor1Events);
  const getCompetitor2Events = useBLEStore(state => state.getCompetitor2Events);

  // Custom hooks
  const {
    isActive,
    isPaused,
    currentRound,
    timeLeft,
    isBattleFinished,
    handleStart,
    handlePause,
    handleStop,
    handleNextRound,
    handleResetRound,
    handleFinishBattle,
    canAdvanceToNextRound,
  } = useBattleTimer({ battleConfig, onFinish });

  const { competitor1Stats, competitor2Stats } = useBattleStats({
    combatEvents,
    getCompetitor1Events,
    getCompetitor2Events,
  });

  // Funciones para controles de transmisión
  /* const handleShowCover = () => {
    setCurrentBroadcastView('cover');
    console.log('Mostrando portada en pantalla de transmisión');
  };

  const handleShowHits = () => {
    setCurrentBroadcastView('hits');
    console.log('Mostrando golpes en pantalla de transmisión');
  };

  const handleShowRound = () => {
    setCurrentBroadcastView('round');
    console.log('Mostrando información de ronda en pantalla de transmisión');
  };

  const handleShowSummary = () => {
    setCurrentBroadcastView('summary');
    console.log('Mostrando resumen en pantalla de transmisión');
  }; */

  /* const handleToggleScreen = () => {
    setIsScreenVisible(!isScreenVisible);
    console.log(
      `Pantalla de transmisión ${!isScreenVisible ? 'visible' : 'oculta'}`,
    );
  }; */

  // Scroll to component on mount
  React.useEffect(() => {
    if (cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-6">
      <div className="mx-auto max-w-7xl">
        <BattleHeader />

        <BattleTimer
          timeLeft={timeLeft}
          currentRound={currentRound}
          totalRounds={battleConfig.rounds}
          roundDuration={battleConfig.roundDuration}
          battleMode={battleConfig.mode}
          isActive={isActive}
          isPaused={isPaused}
          isBattleFinished={isBattleFinished}
          onStart={handleStart}
          onPause={handlePause}
          onStop={handleStop}
          onFinishBattle={handleFinishBattle}
          onNextRound={handleNextRound}
          onResetRound={handleResetRound}
          canAdvanceToNextRound={canAdvanceToNextRound}
        />

        {/* Broadcast Section */}
        <div className="mb-8 w-full">
          <BroadcastControls
            currentRound={currentRound}
            totalRounds={battleConfig.rounds}
            onShowCover={() => {}}
          />

          {/* <BroadcastPreview
            currentView={currentBroadcastView}
            currentRound={currentRound}
            totalRounds={battleConfig.rounds}
            competitor1={competitor1}
            competitor2={competitor2}
            competitor1Stats={competitor1Stats}
            competitor2Stats={competitor2Stats}
            isVisible={isScreenVisible}
          /> */}
        </div>

        {/* Competitors Grid */}
        <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <CompetitorPanel
            competitor={competitor1}
            stats={competitor1Stats}
            events={getCompetitor1Events()}
            isCompetitor1={true}
            teamColor="red"
          />

          <CompetitorPanel
            competitor={competitor2}
            stats={competitor2Stats}
            events={getCompetitor2Events()}
            isCompetitor1={false}
            teamColor="blue"
          />
        </div>

        <BattleActions onFinish={onFinish} onCancel={onCancel} />
      </div>
    </div>
  );
};

export default LiveBattleScreen;
