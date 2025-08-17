import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Divider,
  Chip,
} from '@heroui/react';
import { Monitor, Target, Clock, Zap, Wifi, ExternalLink } from 'lucide-react';

import { useWebSocketBroadcast } from '@hooks/useWebSocketBroadcast';
import useBattleStore from '@features/battle-arena/stores/useBattleStore';

interface Props {
  currentRound: number;
  totalRounds: number;
  onShowCover?: () => void;
}

const BroadcastControls: React.FC<Props> = ({
  currentRound,
  totalRounds,
  onShowCover,
}) => {
  const [currentView, setCurrentView] = React.useState<string | null>(null);
  const { broadcastViewChange, wsPort, wsHost, openBroadcastUrl } =
    useWebSocketBroadcast();

  const battleConfig = useBattleStore(state => state.battleConfig);
  const competitor1 = useBattleStore(state => state.competitor1);
  const competitor2 = useBattleStore(state => state.competitor2);

  const showCoverScreen = async () => {
    const data = {
      competitor1,
      competitor2,
      battleConfig: {
        ...battleConfig,
        currentRound: currentRound,
      },
    };

    await broadcastViewChange('cover', data);

    if (onShowCover) {
      onShowCover();
    }
  };

  return (
    <Card className="border border-zinc-600/50 bg-zinc-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Monitor size={20} className="text-blue-400" />
          <h3 className="text-lg font-semibold text-white">
            Controles de Transmisión
          </h3>
        </div>
      </CardHeader>

      <Divider className="bg-zinc-700" />

      <CardBody className="pt-4">
        {/* Información del servidor WebSocket */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">
              Servidor de Transmisión
            </span>
            <Chip
              color="success"
              variant="flat"
              size="sm"
              startContent={<Wifi size={14} />}
            >
              Automático
            </Chip>
          </div>

          <div className="text-xs text-zinc-400">
            📡 Transmisión disponible en:{' '}
            <button
              onClick={async () => {
                await openBroadcastUrl('/index.html');
              }}
              className="inline-flex cursor-pointer items-center gap-1 font-mono text-blue-400 underline decoration-dotted transition-colors hover:text-blue-300 hover:decoration-solid"
            >
              http://{wsHost}:{wsPort}
              <ExternalLink size={12} className="opacity-70" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Mostrar Portada */}
          <Button
            color={currentView === 'cover' ? 'success' : 'danger'}
            variant={currentView === 'cover' ? 'solid' : 'bordered'}
            size="sm"
            startContent={<Monitor size={16} />}
            className="h-12"
            onPress={() => {
              setCurrentView('cover');
              showCoverScreen();
            }}
          >
            {currentView === 'cover' ? '✓ ' : ''}Mostrar Portada
          </Button>

          {/* Mostrar Golpes */}
          <Button
            color={currentView === 'stats' ? 'success' : 'secondary'}
            variant={currentView === 'stats' ? 'solid' : 'bordered'}
            size="sm"
            startContent={<Target size={16} />}
            onPress={async () => {
              setCurrentView('stats');
              const data = {
                competitor1,
                competitor2,
                battleConfig: {
                  ...battleConfig,
                  currentRound: currentRound,
                },
              };

              await broadcastViewChange('stats', data);
            }}
            className="h-12"
          >
            {currentView === 'stats' ? '✓ ' : ''}Mostrar Golpes
          </Button>

          {/* Mostrar Round */}
          <Button
            color={currentView === 'stats-parcial' ? 'success' : 'primary'}
            variant={currentView === 'stats-parcial' ? 'solid' : 'bordered'}
            size="sm"
            startContent={<Clock size={16} />}
            onPress={async () => {
              setCurrentView('stats-parcial');
              // Cambiar vista a stats-parcial via WebSocket
              const data = {
                competitor1,
                competitor2,
              };

              await broadcastViewChange('stats-parcial', data);
            }}
            className="h-12"
          >
            {currentView === 'stats-parcial' ? '✓ ' : ''}Mostrar Round
          </Button>

          {/* Mostrar Resumen */}
          <Button
            color="warning"
            variant="bordered"
            size="sm"
            startContent={<Zap size={16} />}
            onPress={() => {}}
            className="h-12"
          >
            Mostrar Resumen
          </Button>
        </div>

        {/* Información de la ronda actual */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Ronda {currentRound} de {totalRounds}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default BroadcastControls;
