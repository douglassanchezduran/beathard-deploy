import React from 'react';

const ResumenScreen = ({ data }) => {
  const limbNames = {
    limb_1: "Brazo derecho",
    limb_2: "Brazo izquierdo",
    limb_3: "Pierna derecha",
    limb_4: "Pierna izquierda",
  };

  return (
    <div className="absolute inset-0">
      {/* Fighters Background */}
      <div className="flex h-full">
        <div
          className="flex-1 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${data?.player1?.photo})` }}
        >
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-white text-4xl font-bold uppercase">
            {data?.player1?.name}
          </div>
        </div>
        <div
          className="flex-1 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${data?.player2?.photo})` }}
        >
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-white text-4xl font-bold uppercase">
            {data?.player2?.name}
          </div>
        </div>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/85 to-transparent z-10"></div>

      {/* Logo */}
      <div className="absolute top-16 left-16 z-30">
        <img
          src="../logo-w.png"
          alt="BeatHard Logo"
          className="w-32 drop-shadow-2xl"
        />
      </div>

      {/* Results Table */}
      <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 bg-black/30 backdrop-blur-md rounded-3xl p-8 w-2/5">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-orange-400 mb-2">
            RESUMEN FINAL
          </h2>
          <p className="text-xl text-gray-300">
            Ronda {data?.round} / {data?.rounds}
          </p>
        </div>

        <div className="space-y-4">
          {/* Fuerza máxima */}
          <div className="flex justify-between items-center py-3 border-b border-white/20">
            <div className="text-lg font-bold">
              {data?.player1?.maxFuerza?.toFixed(2) || "0.00"}
            </div>
            <div className="text-gray-400 font-bold uppercase text-center flex-1">
              Fuerza máx
            </div>
            <div className="text-lg font-bold">
              {data?.player2?.maxFuerza?.toFixed(2) || "0.00"}
            </div>
          </div>

          {/* Velocidad máxima */}
          <div className="flex justify-between items-center py-3 border-b border-white/20">
            <div className="text-lg font-bold">
              {data?.player1?.maxAceleracion?.toFixed(2) || "0.00"}
            </div>
            <div className="text-gray-400 font-bold uppercase text-center flex-1">
              Velocidad máx
            </div>
            <div className="text-lg font-bold">
              {data?.player2?.maxAceleracion?.toFixed(2) || "0.00"}
            </div>
          </div>

          {/* Golpes por extremidad */}
          {Object.entries(limbNames).map(([limb, label]) => (
            <div
              key={limb}
              className="flex justify-between items-center py-2 border-b border-white/10"
            >
              <div className="text-base font-bold">
                {data?.player1?.golpes?.[limb] ?? 0}
              </div>
              <div className="text-gray-400 font-medium text-center flex-1 text-sm">
                {label}
              </div>
              <div className="text-base font-bold">
                {data?.player2?.golpes?.[limb] ?? 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VS Banner */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
        <p className="text-red-500 text-8xl font-bold uppercase tracking-widest drop-shadow-2xl">
          VS
        </p>
      </div>
    </div>
  );
};

export default ResumenScreen;
