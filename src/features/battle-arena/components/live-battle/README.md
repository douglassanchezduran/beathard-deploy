# Live Battle Components

Esta carpeta contiene los componentes del `LiveBattleScreen`

## Estructura

```
live-battle/
├── components/
│   ├── BattleHeader.tsx      # Encabezado del combate
│   ├── BattleTimer.tsx       # Timer y controles del combate
│   ├── BattleActions.tsx     # Botones de acción (finalizar/cancelar)
│   ├── CompetitorPanel.tsx   # Panel de estadísticas de competidor
│   ├── EventItem.tsx         # Item individual de evento
│   └── index.ts              # Exportaciones de componentes
├── hooks/
│   ├── useBattleTimer.ts     # Hook para lógica del timer
│   ├── useBattleStats.ts     # Hook para estadísticas de combate
│   └── index.ts              # Exportaciones de hooks
└── README.md                 # Esta documentación
```

## Componentes

### BattleHeader

Componente simple que muestra el encabezado del combate con icono y título.

### BattleTimer

Componente responsable de:

- Mostrar el tiempo restante y ronda actual
- Controles de inicio, pausa y detención
- Barra de progreso del tiempo
- Estado del combate (activo, pausado, detenido)

### BattleActions

Componente que contiene los botones de acción principales:

- Finalizar combate
- Cancelar combate

### CompetitorPanel

Panel completo para mostrar información de un competidor:

- Información básica del competidor
- Estadísticas (golpes totales, máxima fuerza, máxima velocidad)
- Estadísticas por extremidad
- Eventos recientes

### EventItem

Componente para mostrar un evento individual de combate con:

- Icono del tipo de evento
- Información del evento (tipo, extremidad)
- Métricas (fuerza, velocidad, aceleración)
- Timestamp

## Hooks

### useBattleTimer

Hook personalizado que encapsula toda la lógica del timer:

- Estado del timer (activo, pausado, tiempo restante, ronda actual)
- Funciones de control (iniciar, pausar, detener)
- Lógica de transición entre rondas
- Auto-finalización del combate

### useBattleStats

Hook que calcula y mantiene las estadísticas de ambos competidores:

- Estadísticas generales (golpes totales, máximos)
- Estadísticas por extremidad
- Actualización automática basada en eventos de combate

## Beneficios de la Refactorización

1. **Responsabilidad Única**: Cada componente tiene una responsabilidad específica
2. **Reutilización**: Los componentes pueden ser reutilizados en otras partes de la aplicación
3. **Mantenibilidad**: Es más fácil mantener y debuggear componentes pequeños
4. **Testabilidad**: Cada componente puede ser testeado de forma independiente
5. **Legibilidad**: El código es más fácil de entender y seguir
6. **Performance**: Mejor control sobre re-renders con componentes más granulares

## Uso

```typescript
import {
  BattleHeader,
  BattleTimer,
  BattleActions,
  CompetitorPanel,
} from './live-battle/components';
import { useBattleTimer, useBattleStats } from './live-battle/hooks';

// En tu componente principal
const {
  isActive,
  isPaused,
  currentRound,
  timeLeft,
  handleStart,
  handlePause,
  handleStop,
} = useBattleTimer({ battleConfig, onFinish });

const { competitor1Stats, competitor2Stats } = useBattleStats({
  combatEvents,
  getCompetitor1Events,
  getCompetitor2Events,
});
```
