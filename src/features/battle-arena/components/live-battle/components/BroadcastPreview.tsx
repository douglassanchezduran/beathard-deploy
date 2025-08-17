import React from 'react';
import { Card, CardBody, CardHeader, Chip, Avatar, Progress } from '@heroui/react';
import { Monitor, Target, Clock, Zap } from 'lucide-react';
import type { Competitor } from '../../../types';

type BroadcastView = 'cover' | 'hits' | 'round' | 'summary' | 'idle';

interface BattleStats {
  totalHits: number;
  maxForce: number;
}

interface Props {
  currentView: BroadcastView;
  currentRound: number;
  totalRounds: number;
  competitor1?: Competitor | null;
  competitor2?: Competitor | null;
  competitor1Stats?: BattleStats;
  competitor2Stats?: BattleStats;
  isVisible: boolean;
}

const BroadcastPreview: React.FC<Props> = ({
  currentView,
  currentRound,
  totalRounds,
  competitor1,
  competitor2,
  competitor1Stats,
  competitor2Stats,
  isVisible,
}) => {
  const renderPreviewContent = () => {
    if (!isVisible) {
      return (
        <div className="flex h-48 items-center justify-center text-zinc-500">
          <div className="text-center">
            <Monitor size={48} className="mx-auto mb-2 opacity-50" />
            <p>Pantalla Oculta</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'cover':
        return (
          <div className="flex h-48 flex-col items-center justify-center bg-gradient-to-br from-red-900/20 to-blue-900/20 p-6">
            <Monitor size={48} className="mb-4 text-red-400" />
            <h2 className="mb-2 text-2xl font-bold text-white">BEAT HARD COMBAT</h2>
            <div className="flex items-center gap-4">
              {competitor1 && (
                <div className="text-center">
                  <Avatar src={competitor1.photoUrl} size="lg" className="mb-2" />
                  <p className="text-sm font-semibold text-red-400">{competitor1.name}</p>
                </div>
              )}
              <span className="text-xl font-bold text-white">VS</span>
              {competitor2 && (
                <div className="text-center">
                  <Avatar src={competitor2.photoUrl} size="lg" className="mb-2" />
                  <p className="text-sm font-semibold text-blue-400">{competitor2.name}</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'hits':
        return (
          <div className="flex h-48 flex-col justify-center p-4">
            <div className="mb-4 flex items-center justify-center gap-2">
              <Target size={24} className="text-green-400" />
              <h3 className="text-lg font-semibold text-white">Estadísticas de Golpes</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-red-400">{competitor1?.name || 'Competidor 1'}</p>
                <p className="text-2xl font-bold text-white">
                  {competitor1Stats?.totalHits || 0}
                </p>
                <p className="text-xs text-zinc-400">Golpes</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-blue-400">{competitor2?.name || 'Competidor 2'}</p>
                <p className="text-2xl font-bold text-white">
                  {competitor2Stats?.totalHits || 0}
                </p>
                <p className="text-xs text-zinc-400">Golpes</p>
              </div>
            </div>
          </div>
        );

      case 'round':
        return (
          <div className="flex h-48 flex-col items-center justify-center p-4">
            <Clock size={48} className="mb-4 text-blue-400" />
            <h2 className="mb-2 text-3xl font-bold text-white">RONDA {currentRound}</h2>
            <p className="mb-4 text-zinc-400">de {totalRounds} rondas</p>
            <Progress
              value={(currentRound / totalRounds) * 100}
              color="primary"
              className="w-full max-w-xs"
            />
          </div>
        );

      case 'summary':
        return (
          <div className="flex h-48 flex-col justify-center p-4">
            <div className="mb-4 flex items-center justify-center gap-2">
              <Zap size={24} className="text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Resumen del Combate</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-red-400">{competitor1?.name || 'Competidor 1'}</p>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-white">
                    {competitor1Stats?.totalHits || 0} golpes
                  </p>
                  <p className="text-sm text-zinc-400">
                    Fuerza máx: {competitor1Stats?.maxForce?.toFixed(1) || '0.0'}N
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-blue-400">{competitor2?.name || 'Competidor 2'}</p>
                <div className="space-y-1">
                  <p className="text-lg font-bold text-white">
                    {competitor2Stats?.totalHits || 0} golpes
                  </p>
                  <p className="text-sm text-zinc-400">
                    Fuerza máx: {competitor2Stats?.maxForce?.toFixed(1) || '0.0'}N
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex h-48 items-center justify-center text-zinc-500">
            <div className="text-center">
              <Monitor size={48} className="mx-auto mb-2 opacity-50" />
              <p>Esperando contenido...</p>
            </div>
          </div>
        );
    }
  };

  const getViewIcon = () => {
    switch (currentView) {
      case 'cover': return <Monitor size={16} />;
      case 'hits': return <Target size={16} />;
      case 'round': return <Clock size={16} />;
      case 'summary': return <Zap size={16} />;
      default: return <Monitor size={16} />;
    }
  };

  const getViewName = () => {
    switch (currentView) {
      case 'cover': return 'Portada';
      case 'hits': return 'Golpes';
      case 'round': return 'Ronda';
      case 'summary': return 'Resumen';
      default: return 'En Espera';
    }
  };

  return (
    <Card className="border border-zinc-600/50 bg-zinc-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Monitor size={20} className="text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Preview de Transmisión</h3>
          </div>
          <Chip
            color={isVisible ? "success" : "default"}
            variant="flat"
            size="sm"
            startContent={getViewIcon()}
          >
            {getViewName()}
          </Chip>
        </div>
      </CardHeader>
      
      <CardBody className="pt-0">
        <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800">
          {renderPreviewContent()}
        </div>
      </CardBody>
    </Card>
  );
};

export default BroadcastPreview;
