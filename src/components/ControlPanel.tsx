import React from 'react';
import { ConverterConfig, LoadType, PhaseMode, CircuitType, DeviceType } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Sliders,
  Zap,
  Gauge,
  Cpu,
  Layers,
  Settings2,
  ShieldAlert,
  ArrowRightLeft,
} from 'lucide-react';

interface ControlPanelProps {
  config: ConverterConfig;
  onChangeConfig: (newConfig: Partial<ConverterConfig>) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onResetTime: () => void;
  simSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onSetAllDevices: (type: DeviceType) => void;
  onSetSemiConverter: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onChangeConfig,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  onResetTime,
  simSpeed,
  onChangeSpeed,
  onSetAllDevices,
  onSetSemiConverter,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const {
    phaseMode,
    circuitType,
    switches,
    hasFWD,
    isFWDActive,
    alpha,
    loadType,
    loadParams,
    sourceParams,
  } = config;

  const hasAnyThyristor = Object.values(switches).some((s) => s === 'thyristor');

  return (
    <div
      id="converter-control-panel"
      className={`rounded-xl p-4 border transition-colors duration-200 shadow-lg space-y-4 ${
        isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 shadow-xl'
      }`}
    >
      {/* Playback & Real-Time Engine Bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border transition-colors duration-200 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            id="btn-play-pause"
            onClick={onTogglePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-md ${
              isPlaying
                ? isLight
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : isLight
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isPlaying ? 'Pause Simulation' : 'Run Real-Time'}
          </button>

          <button
            id="btn-step-back"
            onClick={onStepBackward}
            className={`p-2 rounded-lg border transition ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Step Back 10°"
          >
            <Rewind className="w-4 h-4" />
          </button>

          <button
            id="btn-step-fwd"
            onClick={onStepForward}
            className={`p-2 rounded-lg border transition ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Step Forward 10°"
          >
            <FastForward className="w-4 h-4" />
          </button>

          <button
            id="btn-reset-time"
            onClick={onResetTime}
            className={`p-2 rounded-lg border transition ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-300 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700'
            }`}
            title="Reset Angle to 0°"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Slider */}
        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Gauge className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
            <span className={`text-xs font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Speed:</span>
          </div>
          <input
            id="slider-sim-speed"
            type="range"
            min={0.1}
            max={2.5}
            step={0.05}
            value={simSpeed}
            onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
            className={`w-60 sm:w-72 md:w-80 h-2 rounded-lg appearance-none cursor-pointer focus:outline-none ${
              isLight ? 'bg-slate-200 accent-sky-600' : 'bg-slate-800 accent-sky-400'
            }`}
            title={`Simulation Speed: ${simSpeed.toFixed(2)}x`}
          />
          <span
            className={`text-xs font-mono font-bold min-w-[40px] px-1.5 py-0.5 rounded border text-center ${
              isLight
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
            }`}
          >
            {simSpeed.toFixed(1)}x
          </span>
          <div className={`hidden xl:flex items-center gap-1 pl-1 border-l ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            {[0.2, 0.5, 1.0, 2.0].map((spd) => (
              <button
                key={spd}
                onClick={() => onChangeSpeed(spd)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                  Math.abs(simSpeed - spd) < 0.05
                    ? isLight
                      ? 'bg-sky-600 text-white font-bold'
                      : 'bg-sky-500 text-slate-950 font-bold'
                    : isLight
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Configuration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Topology & Phase Mode */}
        <div
          className={`p-3.5 rounded-lg border space-y-3 transition-colors duration-200 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Layers className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
              Converter Topology
            </span>
          </div>

          {/* Phase Mode Toggle */}
          <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-lg border text-xs ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <button
              onClick={() => onChangeConfig({ phaseMode: '1-phase' })}
              className={`py-1.5 rounded font-semibold transition ${
                phaseMode === '1-phase'
                  ? isLight
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-500 text-slate-950 shadow'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Single-Phase (1Φ)
            </button>
            <button
              onClick={() => onChangeConfig({ phaseMode: '3-phase' })}
              className={`py-1.5 rounded font-semibold transition ${
                phaseMode === '3-phase'
                  ? isLight
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-500 text-slate-950 shadow'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Three-Phase (3Φ)
            </button>
          </div>

          {/* Circuit Type Toggle */}
          <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-lg border text-xs ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <button
              onClick={() => onChangeConfig({ circuitType: 'full-bridge' })}
              className={`py-1.5 rounded font-semibold transition ${
                circuitType === 'full-bridge'
                  ? isLight
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-500 text-slate-950 shadow'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full-Bridge
            </button>
            <button
              onClick={() => onChangeConfig({ circuitType: 'half-wave' })}
              className={`py-1.5 rounded font-semibold transition ${
                circuitType === 'half-wave'
                  ? isLight
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-500 text-slate-950 shadow'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Half-Wave
            </button>
          </div>

          {/* Quick Switch Device Preset actions */}
          <div className="space-y-1.5 pt-1">
            <span className={`text-[11px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Quick Device Setup:</span>
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              <button
                onClick={() => onSetAllDevices('diode')}
                className={`px-2 py-1 font-medium rounded border transition ${
                  isLight
                    ? 'bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200'
                    : 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border-slate-800'
                }`}
              >
                All Diodes
              </button>
              <button
                onClick={() => onSetAllDevices('thyristor')}
                className={`px-2 py-1 font-medium rounded border transition ${
                  isLight
                    ? 'bg-white hover:bg-amber-50 text-amber-700 border-slate-200'
                    : 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-800'
                }`}
              >
                All Thyristors
              </button>
              <button
                onClick={onSetSemiConverter}
                className={`px-2 py-1 font-medium rounded border transition ${
                  isLight
                    ? 'bg-white hover:bg-sky-50 text-sky-700 border-slate-200'
                    : 'bg-slate-900 hover:bg-slate-800 text-sky-400 border-slate-800'
                }`}
                title="Semi-converter (Top Thyristors, Bottom Diodes)"
              >
                Semi-Conv
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Firing Angle & Freewheeling Diode */}
        <div
          className={`p-3.5 rounded-lg border space-y-3 transition-colors duration-200 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Zap className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              Firing Angle α & FWD
            </span>
          </div>

          {/* Firing Angle Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Firing Angle (α):</span>
              <span className={`font-mono font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{alpha}°</span>
            </div>
            <input
              id="slider-firing-angle"
              type="range"
              min={0}
              max={180}
              step={1}
              value={alpha}
              disabled={!hasAnyThyristor}
              onChange={(e) => onChangeConfig({ alpha: parseInt(e.target.value, 10) })}
              className={`w-full h-1.5 rounded appearance-none cursor-pointer disabled:opacity-40 ${
                isLight ? 'bg-slate-200 accent-amber-600' : 'bg-slate-800 accent-amber-400'
              }`}
            />
            {/* Quick Angle Chips */}
            <div className="flex items-center justify-between gap-1 pt-1">
              {[0, 30, 45, 60, 90, 120, 150].map((deg) => (
                <button
                  key={deg}
                  disabled={!hasAnyThyristor}
                  onClick={() => onChangeConfig({ alpha: deg })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                    alpha === deg
                      ? isLight
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-amber-500 text-slate-950 font-bold'
                      : isLight
                      ? 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 disabled:opacity-40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 disabled:opacity-40'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* Freewheeling Diode (FWD) Toggle Switches */}
          <div className={`pt-2 border-t space-y-2 ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Freewheeling Diode (D_FW):</span>
              <button
                id="btn-toggle-fwd-presence"
                onClick={() =>
                  onChangeConfig({
                    hasFWD: !hasFWD,
                    isFWDActive: !hasFWD ? true : false,
                  })
                }
                className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                  hasFWD
                    ? isLight
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : isLight
                    ? 'bg-white text-slate-400 border-slate-200'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                {hasFWD ? 'Connected' : 'Disconnected'}
              </button>
            </div>

            {hasFWD && (
              <div className="flex items-center justify-between text-xs pl-2">
                <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Diode Conduction:</span>
                <button
                  id="btn-toggle-fwd-active"
                  onClick={() => onChangeConfig({ isFWDActive: !isFWDActive })}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                    isFWDActive
                      ? isLight
                        ? 'bg-sky-50 text-sky-700 border-sky-300 font-semibold'
                        : 'bg-sky-500/20 text-sky-400 border-sky-500/30 font-semibold'
                      : isLight
                      ? 'bg-white text-slate-500 border-slate-200'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {isFWDActive ? 'Active (Conducting)' : 'Disabled / Bypassed'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Load & AC Source Parameters */}
        <div
          className={`p-3.5 rounded-lg border space-y-3 transition-colors duration-200 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
              <Sliders className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              Load & Source Parameters
            </span>
          </div>

          {/* Load Type Selector */}
          <div className={`grid grid-cols-3 gap-1 p-1 rounded-lg border text-xs ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            {(['R', 'RL', 'RLE'] as LoadType[]).map((type) => (
              <button
                key={type}
                onClick={() => onChangeConfig({ loadType: type })}
                className={`py-1 rounded font-semibold transition ${
                  loadType === type
                    ? isLight
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-500 text-slate-950 shadow'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type} Load
              </button>
            ))}
          </div>

          {/* Sliders for R, L, E */}
          <div className="space-y-2 text-xs">
            {/* Resistance R */}
            <div className="flex items-center justify-between gap-2">
              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>R (Resistance):</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={loadParams.R}
                  onChange={(e) =>
                    onChangeConfig({
                      loadParams: { ...loadParams, R: parseInt(e.target.value, 10) },
                    })
                  }
                  className={`w-24 h-1.5 rounded appearance-none cursor-pointer ${
                    isLight ? 'bg-slate-200 accent-emerald-600' : 'bg-slate-800 accent-emerald-400'
                  }`}
                />
                <span className={`font-mono font-bold min-w-[38px] text-right ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  {loadParams.R} Ω
                </span>
              </div>
            </div>

            {/* Inductance L (if RL or RLE) */}
            {(loadType === 'RL' || loadType === 'RLE') && (
              <div className="flex items-center justify-between gap-2">
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>L (Inductance):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={200}
                    step={1}
                    value={loadParams.L}
                    onChange={(e) =>
                      onChangeConfig({
                        loadParams: { ...loadParams, L: parseInt(e.target.value, 10) },
                      })
                    }
                    className={`w-24 h-1.5 rounded appearance-none cursor-pointer ${
                      isLight ? 'bg-slate-200 accent-amber-600' : 'bg-slate-800 accent-amber-400'
                    }`}
                  />
                  <span className={`font-mono font-bold min-w-[38px] text-right ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                    {loadParams.L} mH
                  </span>
                </div>
              </div>
            )}

            {/* Back-EMF E (if RLE) */}
            {loadType === 'RLE' && (
              <div className="flex items-center justify-between gap-2">
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>E (Back-EMF):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={2}
                    value={loadParams.E}
                    onChange={(e) =>
                      onChangeConfig({
                        loadParams: { ...loadParams, E: parseInt(e.target.value, 10) },
                      })
                    }
                    className={`w-24 h-1.5 rounded appearance-none cursor-pointer ${
                      isLight ? 'bg-slate-200 accent-rose-600' : 'bg-slate-800 accent-red-400'
                    }`}
                  />
                  <span className={`font-mono font-bold min-w-[38px] text-right ${isLight ? 'text-rose-700' : 'text-red-400'}`}>
                    {loadParams.E} V
                  </span>
                </div>
              </div>
            )}

            {/* Source Voltage & Frequency */}
            <div className={`flex items-center justify-between pt-1 border-t text-[11px] ${isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800/80 text-slate-400'}`}>
              <span>Source RMS:</span>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={50}
                  max={415}
                  step={5}
                  value={sourceParams.Vrms}
                  onChange={(e) =>
                    onChangeConfig({
                      sourceParams: { ...sourceParams, Vrms: parseInt(e.target.value, 10) },
                    })
                  }
                  className={`w-20 h-1 rounded appearance-none cursor-pointer ${
                    isLight ? 'bg-slate-200 accent-sky-600' : 'bg-slate-800 accent-sky-400'
                  }`}
                />
                <span className={`font-mono font-semibold ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>{sourceParams.Vrms}V</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

