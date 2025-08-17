import { Settings } from 'lucide-react';

import Header from '@components/Header';
// import BattleConfiguration from './components/BattleConfiguration';
import { BattleConfiguration } from './components/battle-configuration';
import { DeviceControl } from './components/device-control';
// import { BattleConfig } from './stores/useBattleStore';
// import DeviceControl from './components/DeviceControl';

import { useFighters } from '@features/fighters/hooks/useFighters';
import DeviceSelectionManager from './components/device-control/DeviceSelectionManager';
import LiveBattleScreen from './components/LiveBattleScreen';
import DeviceControlNavigation from './components/device-control/DeviceControlNavigation';
import useBattleStore from './stores/useBattleStore';
import { useBLEStore } from '@stores/useBLEStore';
import BattleConfirmation from './components/BattleConfirmation';
// import BattleConfirmation from './components/BattleConfirmation';

// type BattleStep = 'arena' | 'configuration' | 'setup' | 'confirmation' | 'live';

const BattleArenaScreen: React.FC = () => {
  const { fighters } = useFighters();
  const { 
    currentStep, 
    nextStep, 
    prevStep, 
    resetBattle,
    competitor1,
    competitor2,
    battleConfig,
    competitor1Devices,
    competitor2Devices
  } = useBattleStore();
  
  // Estado BLE para verificar conexiones
  const connectedDevices = useBLEStore(state => state.connectedDevices);

  // Validación para habilitar el botón "Siguiente"
  const canProceedToNext = () => {
    console.log('🔍 [Setup] Validando configuración para proceder...');
    
    // 1. Verificar que ambos competidores estén seleccionados
    if (!competitor1 || !competitor2) {
      console.log('❌ [Setup] Faltan competidores:', { competitor1: !!competitor1, competitor2: !!competitor2 });
      return false;
    }

    // 2. Verificar que ambos competidores tengan al menos un dispositivo asignado
    if (competitor1Devices.length === 0 || competitor2Devices.length === 0) {
      console.log('❌ [Setup] Faltan dispositivos asignados:', { 
        competitor1Devices: competitor1Devices.length, 
        competitor2Devices: competitor2Devices.length 
      });
      return false;
    }

    // 3. Verificar que los dispositivos asignados estén realmente conectados
    const competitor1ConnectedDevices = competitor1Devices.filter(device => 
      connectedDevices.includes(device.id)
    );
    const competitor2ConnectedDevices = competitor2Devices.filter(device => 
      connectedDevices.includes(device.id)
    );
    
    if (competitor1ConnectedDevices.length === 0 || competitor2ConnectedDevices.length === 0) {
      console.log('❌ [Setup] Dispositivos no conectados:', { 
        competitor1Connected: competitor1ConnectedDevices.length,
        competitor2Connected: competitor2ConnectedDevices.length,
        totalConnected: connectedDevices.length
      });
      return false;
    }

    // 4. Verificar configuración de batalla básica
    if (!battleConfig.mode || !battleConfig.rounds) {
      console.log('❌ [Setup] Configuración de batalla incompleta:', battleConfig);
      return false;
    }

    // 5. Si es modo tiempo, verificar que tenga duración
    if (battleConfig.mode === 'time' && !battleConfig.roundDuration) {
      console.log('❌ [Setup] Modo tiempo sin duración:', battleConfig);
      return false;
    }

    console.log('✅ [Setup] Configuración completa, puede proceder');
    return true;
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 pt-8">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Header
          title="Arena de Combate"
          description="Selecciona los parámetros del combate."
          icon={<Settings size={32} className="text-white" />}
        />

        <div className="mb-8 text-center">
          {currentStep === 'setup' && (
            <>
              <BattleConfiguration />
              <DeviceControl fighters={fighters} />
              <DeviceSelectionManager />
              <DeviceControlNavigation
                onBack={undefined}
                onNext={nextStep}
                canProceed={canProceedToNext()}
              />
            </>
          )}

          {currentStep === 'confirmation' && (
            <>
              <BattleConfirmation
                // fighter1={competitor1}
                // fighter2={competitor2}
                onConfirm={nextStep}
                onCancel={prevStep}
              />
              {/* <DeviceControlNavigation
                onBack={prevStep}
                onNext={nextStep}
                canProceed={true}
              /> */}
            </>
          )}

          {currentStep === 'live' && (
            <LiveBattleScreen
              onFinish={async () => {
                // Lógica para finalizar combate
                console.log('🏁 Finalizando combate y reseteando sistema...');
                try {
                  await resetBattle();
                  console.log('✅ Combate finalizado y sistema reseteado exitosamente');
                } catch (error) {
                  console.error('❌ Error al finalizar combate:', error);
                }
              }}
              onCancel={() => {
                // Volver al paso de confirmación
                prevStep();
              }}
            />
          )}

          {/* {currentStep !== 'live' && (
            <DeviceControlNavigation
              onBack={currentStep === 'setup' ? undefined : prevStep}
              onNext={nextStep}
              canProceed={true}
            />
          )} */}

          {/* <BattleConfiguration
            onNext={() => {}}
            onBack={() => {}}
            onConfigurationChange={handleConfigurationChange}
          /> */}

          {/* <DeviceControl
            onNext={() => {}}
            onBack={() => {}}
            selectedDevices={[]}
            onDevicesChange={() => {}}
            fighters={fighters}
            battleConfig={battleConfig}
          /> */}

          {/* <BattleConfirmation
            fighter1={competitors[0]}
            fighter2={competitors[1]}
            onConfirm={handleNextStep}
            onCancel={handleCancelCombat}
          /> */}
          {/* <Button
            color="primary"
            size="lg"
            className="transform bg-primary-500 px-8 py-6 text-lg font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-primary-600 hover:shadow-primary-500/40"
            startContent={<Trophy size={24} />}
            // onPress={handleOpenCreateModal}
          >
            Configurar nuevo combate
          </Button> */}
        </div>
      </div>
    </section>
  );
};

export default BattleArenaScreen;
