import React from 'react';
import { ConverterConfig, DeviceType, LoadType, PhaseMode, CircuitType, CircuitPreset } from '../types';
import { useTheme } from '../context/ThemeContext';
import { CIRCUIT_PRESETS } from '../utils/presets';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Sliders,
  Zap,
  Gauge,
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowRightLeft,
  ChevronDown,
} from 'lucide-react';

interface OptimizedParameterSidebarProps {
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
  onSelectPreset?: (preset: CircuitPreset) => void;
}

export const OptimizedParameterSidebar: React.FC<OptimizedParameterSidebarProps> = ({
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
  onSelectPreset,
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
  const isAllThyristors = Object.values(switches).every((s) => s === 'thyristor');
  const isAllDiodes = Object.values(switches).every((s) => s === 'diode');

  return (
    <aside
      id="optimized-parameter-sidebar"
      className={`w-80 sm:w-88 xl:w-96 h-full flex flex-col flex-shrink-0 border-r overflow-y-auto select-none transition-colors duration-200 ${
        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-100'
      }`}
    >
      {/* Sidebar Header */}
      <div
        className={`p-3.5 border-b sticky top-0 z-20 backdrop-blur-md transition-colors duration-200 ${
          isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/95 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg border ${
                isLight ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
              }`}
            >
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider">Control Parameters</h2>
              <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Live Real-Time Tuning
              </p>
            </div>
          </div>

          {/* Quick Presets Dropdown */}
          {onSelectPreset && (
            <div className="relative">
              <select
                aria-label="Select circuit preset"
                onChange={(e) => {
                  const preset = CIRCUIT_PRESETS.find((p) => p.id === e.target.value);
                  if (preset) onSelectPreset(preset);
                }}
                defaultValue=""
                className={`text-[11px] font-semibold py-1 px-2 pr-6 rounded-lg border appearance-none cursor-pointer focus:outline-none transition ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <option value="" disabled>Load Preset...</option>
                {CIRCUIT_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
            </div>
          )}
        </div>
      </div>

      <div className="p-3.5 space-y-4">
        {/* 1. Simulation Engine Bar */}
        <div
          className={`p-3 rounded-xl border space-y-2.5 transition-colors duration-200 ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800/80 shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Simulation Engine
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                isPlaying
                  ? isLight
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : isLight
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {isPlaying ? 'Running' : 'Paused'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="fs-btn-play-pause"
              onClick={onTogglePlay}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-xs transition-all shadow-sm ${
                isPlaying
                  ? isLight
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : isLight
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isPlaying ? 'Pause' : 'Run'}
            </button>

            <button
              id="fs-btn-step-back"
              onClick={onStepBackward}
              className={`p-2 rounded-lg border transition ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Step Backward"
            >
              <Rewind className="w-3.5 h-3.5" />
            </button>

            <button
              id="fs-btn-step-fwd"
              onClick={onStepForward}
              className={`p-2 rounded-lg border transition ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Step Forward"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>

            <button
              id="fs-btn-reset-time"
              onClick={onResetTime}
              className={`p-2 rounded-lg border transition ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
              title="Reset to 0°"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Speed Controls */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
            <span className={`text-[11px] font-medium flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <Gauge className="w-3 h-3 text-sky-500" />
              Speed
            </span>
            <div className="flex items-center gap-1">
              {[0.2, 0.5, 1.0, 2.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onChangeSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                    Math.abs(simSpeed - spd) < 0.05
                      ? isLight
                        ? 'bg-sky-600 text-white'
                        : 'bg-sky-500 text-slate-950'
                      : isLight
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Topology & Phase Architecture */}
        <div
          className={`p-3 rounded-xl border space-y-3 transition-colors duration-200 ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800/80 shadow-md'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            Converter Topology
          </span>

          {/* Phase Mode Toggle */}
          <div>
            <label className={`block text-[10px] uppercase font-semibold mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              AC Supply Phase
            </label>
            <div className={`grid grid-cols-2 gap-1 p-1 rounded-lg border text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <button
                onClick={() => onChangeConfig({ phaseMode: '1-phase' })}
                className={`py-1 rounded font-semibold transition ${
                  phaseMode === '1-phase'
                    ? isLight
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-500 text-slate-950 shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1-Phase (1Φ)
              </button>
              <button
                onClick={() => onChangeConfig({ phaseMode: '3-phase' })}
                className={`py-1 rounded font-semibold transition ${
                  phaseMode === '3-phase'
                    ? isLight
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-500 text-slate-950 shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3-Phase (3Φ)
              </button>
            </div>
          </div>

          {/* Circuit Type Toggle */}
          <div>
            <label className={`block text-[10px] uppercase font-semibold mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Bridge Circuit Structure
            </label>
            <div className={`grid grid-cols-2 gap-1 p-1 rounded-lg border text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <button
                onClick={() => onChangeConfig({ circuitType: 'full-bridge' })}
                className={`py-1 rounded font-semibold transition ${
                  circuitType === 'full-bridge'
                    ? isLight
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-500 text-slate-950 shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Full-Bridge
              </button>
              <button
                onClick={() => onChangeConfig({ circuitType: 'half-wave' })}
                className={`py-1 rounded font-semibold transition ${
                  circuitType === 'half-wave'
                    ? isLight
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-500 text-slate-950 shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Half-Wave
              </button>
            </div>
          </div>

          {/* Quick Switch Configurations */}
          <div>
            <label className={`block text-[10px] uppercase font-semibold mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Switch Types
            </label>
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              <button
                onClick={() => onSetAllDevices('thyristor')}
                className={`py-1 px-1.5 rounded border font-semibold transition text-center ${
                  isAllThyristors
                    ? isLight
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-amber-500 text-slate-950 border-amber-400'
                    : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                All SCRs
              </button>
              <button
                onClick={() => onSetAllDevices('diode')}
                className={`py-1 px-1.5 rounded border font-semibold transition text-center ${
                  isAllDiodes
                    ? isLight
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                All Diodes
              </button>
              <button
                onClick={onSetSemiConverter}
                className={`py-1 px-1.5 rounded border font-semibold transition text-center ${
                  !isAllThyristors && !isAllDiodes
                    ? isLight
                      ? 'bg-purple-600 text-white border-purple-700'
                      : 'bg-purple-500 text-slate-950 border-purple-400'
                    : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                Semi-Conv
              </button>
            </div>
          </div>

          {/* Freewheeling Diode (FWD) Toggle */}
          <div className="pt-1 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className={`text-[11px] font-semibold block ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                Freewheeling Diode (D_FW)
              </span>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Prevents negative output voltage
              </span>
            </div>
            <button
              onClick={() => onChangeConfig({ hasFWD: !hasFWD, isFWDActive: !hasFWD })}
              className={`px-2 py-0.5 rounded text-xs font-bold border transition ${
                hasFWD
                  ? isLight
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : isLight
                  ? 'bg-slate-100 text-slate-400 border-slate-300'
                  : 'bg-slate-800 text-slate-500 border-slate-700'
              }`}
            >
              {hasFWD ? 'Active' : 'None'}
            </button>
          </div>
        </div>

        {/* 3. Firing Angle Alpha Control (if SCRs present) */}
        {hasAnyThyristor && (
          <div
            className={`p-3 rounded-xl border space-y-2.5 transition-colors duration-200 ${
              isLight ? 'bg-white border-amber-200 shadow-xs' : 'bg-slate-900 border-amber-500/30 shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-amber-800' : 'text-amber-400'}`}>
                <Zap className="w-3.5 h-3.5 fill-current" />
                Firing Angle (α)
              </span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  isLight
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                α = {alpha}°
              </span>
            </div>

            <input
              id="fs-slider-alpha"
              type="range"
              min={0}
              max={180}
              step={1}
              value={alpha}
              onChange={(e) => onChangeConfig({ alpha: parseInt(e.target.value) || 0 })}
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none ${
                isLight ? 'bg-slate-200 accent-amber-500' : 'bg-slate-800 accent-amber-400'
              }`}
            />

            {/* Quick Angle Badges */}
            <div className="grid grid-cols-6 gap-1 text-center">
              {[0, 30, 45, 60, 90, 120].map((deg) => (
                <button
                  key={deg}
                  onClick={() => onChangeConfig({ alpha: deg })}
                  className={`py-0.5 rounded text-[10px] font-mono font-semibold border transition ${
                    alpha === deg
                      ? isLight
                        ? 'bg-amber-500 text-white border-amber-600 font-bold'
                        : 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Load Parameters Section */}
        <div
          className={`p-3 rounded-xl border space-y-3 transition-colors duration-200 ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800/80 shadow-md'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500" />
            Load Configuration
          </span>

          {/* Load Type Selector */}
          <div className={`grid grid-cols-3 gap-1 p-1 rounded-lg border text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
            {(['R', 'RL', 'RLE'] as LoadType[]).map((type) => (
              <button
                key={type}
                onClick={() => onChangeConfig({ loadType: type })}
                className={`py-1 rounded font-bold transition text-center ${
                  loadType === type
                    ? isLight
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-500 text-slate-950 shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type} Load
              </button>
            ))}
          </div>

          {/* Load Resistor (R) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Resistance (R):
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {loadParams.R} Ω
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={loadParams.R}
              onChange={(e) =>
                onChangeConfig({
                  loadParams: { ...loadParams, R: parseFloat(e.target.value) || 1 },
                })
              }
              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none ${
                isLight ? 'bg-slate-200 accent-emerald-600' : 'bg-slate-800 accent-emerald-400'
              }`}
            />
          </div>

          {/* Load Inductor (L) */}
          {(loadType === 'RL' || loadType === 'RLE') && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Inductance (L):
                </span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                  {loadParams.L} mH
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={200}
                step={2}
                value={loadParams.L}
                onChange={(e) =>
                  onChangeConfig({
                    loadParams: { ...loadParams, L: parseFloat(e.target.value) || 0 },
                  })
                }
                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none ${
                  isLight ? 'bg-slate-200 accent-sky-600' : 'bg-slate-800 accent-sky-400'
                }`}
              />
            </div>
          )}

          {/* Load Back-EMF (E) */}
          {loadType === 'RLE' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Back-EMF Battery (E):
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {loadParams.E} V
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={150}
                step={2}
                value={loadParams.E}
                onChange={(e) =>
                  onChangeConfig({
                    loadParams: { ...loadParams, E: parseFloat(e.target.value) || 0 },
                  })
                }
                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none ${
                  isLight ? 'bg-slate-200 accent-amber-600' : 'bg-slate-800 accent-amber-400'
                }`}
              />
            </div>
          )}
        </div>

        {/* 5. AC Power Source Section */}
        <div
          className={`p-3 rounded-xl border space-y-2.5 transition-colors duration-200 ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800/80 shadow-md'
          }`}
        >
          <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            <Zap className="w-3.5 h-3.5 text-sky-500" />
            AC Power Source
          </span>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                RMS Voltage (Vs):
              </span>
              <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                {sourceParams.Vrms} V_rms
              </span>
            </div>
            <input
              type="range"
              min={24}
              max={440}
              step={5}
              value={sourceParams.Vrms}
              onChange={(e) =>
                onChangeConfig({
                  sourceParams: { ...sourceParams, Vrms: parseFloat(e.target.value) || 230 },
                })
              }
              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none ${
                isLight ? 'bg-slate-200 accent-sky-600' : 'bg-slate-800 accent-sky-400'
              }`}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Frequency (f):
              </span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                {sourceParams.frequency} Hz
              </span>
            </div>
            <input
              type="range"
              min={25}
              max={100}
              step={5}
              value={sourceParams.frequency}
              onChange={(e) =>
                onChangeConfig({
                  sourceParams: { ...sourceParams, frequency: parseFloat(e.target.value) || 50 },
                })
              }
              className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none ${
                isLight ? 'bg-slate-200 accent-purple-600' : 'bg-slate-800 accent-purple-400'
              }`}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
