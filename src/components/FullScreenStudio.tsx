import React, { useState, useEffect } from 'react';
import { ConverterConfig, DeviceType, SimulationPoint, SimulationResult, CircuitPreset } from '../types';
import { useTheme } from '../context/ThemeContext';
import { SchematicView } from './SchematicView';
import { WaveformViewer } from './WaveformViewer';
import { OptimizedParameterSidebar } from './OptimizedParameterSidebar';
import {
  Zap,
  Activity,
  BarChart2,
  Columns2,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  BookOpen,
  Calculator,
  Sun,
  Moon,
  RotateCcw,
  Play,
  Pause,
  SkipBack,
  SkipForward,
} from 'lucide-react';

interface FullScreenStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'schematic' | 'waveforms' | 'hybrid';
  config: ConverterConfig;
  onChangeConfig: (newConfig: Partial<ConverterConfig>) => void;
  currentPoint: SimulationPoint | null;
  simResult: SimulationResult;
  currentIndex: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onResetTime: () => void;
  simSpeed: number;
  onChangeSpeed: (speed: number) => void;
  onToggleSwitch: (switchId: string) => void;
  onToggleFWD: () => void;
  onToggleFWDActive: () => void;
  onSetAllDevices: (type: DeviceType) => void;
  onSetSemiConverter: () => void;
  onSeekIndex: (index: number) => void;
  onOpenPresets?: () => void;
  onOpenTheory?: () => void;
  onOpenAnalysis?: () => void;
  onSelectPreset?: (preset: CircuitPreset) => void;
}

export const FullScreenStudio: React.FC<FullScreenStudioProps> = ({
  isOpen,
  onClose,
  initialTab = 'schematic',
  config,
  onChangeConfig,
  currentPoint,
  simResult,
  currentIndex,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  onResetTime,
  simSpeed,
  onChangeSpeed,
  onToggleSwitch,
  onToggleFWD,
  onToggleFWDActive,
  onSetAllDevices,
  onSetSemiConverter,
  onSeekIndex,
  onOpenPresets,
  onOpenTheory,
  onOpenAnalysis,
  onSelectPreset,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'schematic' | 'waveforms' | 'hybrid'>(initialTab);
  const [isBrowserFullScreen, setIsBrowserFullScreen] = useState<boolean>(false);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle keyboard shortcuts (ESC to exit, Space to toggle play, Arrows to step)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') {
        return;
      }

      if (e.key === 'Escape') {
        onClose();
      } else if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onStepBackward();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onStepForward();
      } else if (e.key === 'r' || e.key === 'R') {
        onResetTime();
      } else if (e.key === '1') {
        setActiveTab('schematic');
      } else if (e.key === '2') {
        setActiveTab('waveforms');
      } else if (e.key === '3') {
        setActiveTab('hybrid');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onTogglePlay, onStepBackward, onStepForward, onResetTime]);

  // Track browser native fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsBrowserFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="fullscreen-studio-root"
      className={`fixed inset-0 z-50 flex flex-col w-screen h-screen overflow-hidden font-sans transition-colors duration-200 ${
        isLight ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Header Navigation Bar */}
      <header
        className={`flex flex-wrap items-center justify-between gap-2.5 px-3 lg:px-5 py-2 border-b select-none z-30 transition-colors duration-200 ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-900 shadow-xs'
            : 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-lg'
        }`}
      >
        {/* Left: App Branding & Status */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-sky-600 to-emerald-500 text-white shadow-md shadow-sky-500/20">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight">
                RectifierLab
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono border ${
                  activeTab === 'hybrid'
                    ? isLight
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : isLight
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                }`}
              >
                {activeTab === 'hybrid' ? 'HYBRID DUAL FULL SCREEN' : 'FULL SCREEN STUDIO'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Major View Mode Tabs (3 Modes: Schematic, Waveforms, Hybrid) */}
        <div className="flex items-center">
          <div
            className={`flex items-center p-1 rounded-xl border ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <button
              id="fs-tab-schematic"
              onClick={() => setActiveTab('schematic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'schematic'
                  ? isLight
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-sky-500 text-slate-950 shadow-md'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Circuit Schematic Diagram with Parameter Controls (Key: 1)"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Circuit Schematic</span>
              <span className="md:hidden">Schematic</span>
            </button>

            <button
              id="fs-tab-waveforms"
              onClick={() => setActiveTab('waveforms')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'waveforms'
                  ? isLight
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-sky-500 text-slate-950 shadow-md'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Waveforms & Oscilloscope with Parameter Controls (Key: 2)"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Waveforms</span>
              <span className="md:hidden">Plots</span>
            </button>

            <button
              id="fs-tab-hybrid"
              onClick={() => setActiveTab('hybrid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'hybrid'
                  ? isLight
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-emerald-500 text-slate-950 shadow-md'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Hybrid View: Schematic & Waveforms side by side, full vertical screen, no parameter controls (Key: 3)"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Hybrid Mode</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono uppercase tracking-wider font-semibold ${
                  activeTab === 'hybrid'
                    ? isLight
                      ? 'bg-white/20 text-white'
                      : 'bg-black/20 text-slate-950'
                    : isLight
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                Side-by-Side
              </span>
            </button>
          </div>
        </div>

        {/* Right: Simulation Quick Playback + Auxiliary Actions & Exit Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Simulation Playback Bar */}
          <div
            className={`flex items-center gap-1 px-1.5 py-1 rounded-lg border select-none transition-colors duration-200 ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <button
              onClick={onTogglePlay}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title={isPlaying ? 'Pause Simulation (Space)' : 'Run Simulation (Space)'}
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
              <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Run'}</span>
            </button>

            <button
              onClick={onStepBackward}
              className={`p-1 rounded-md border transition ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
              title="Step Backward (Left Arrow)"
            >
              <SkipBack className="w-3 h-3" />
            </button>

            <button
              onClick={onStepForward}
              className={`p-1 rounded-md border transition ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
              title="Step Forward (Right Arrow)"
            >
              <SkipForward className="w-3 h-3" />
            </button>

            <button
              onClick={onResetTime}
              className={`p-1 rounded-md border transition ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
              title="Reset Angle to 0° (R)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            {/* Speed Options */}
            <div className="hidden lg:flex items-center gap-0.5 text-[10px] font-mono font-bold pl-1 border-l border-slate-300 dark:border-slate-800">
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onChangeSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded transition ${
                    simSpeed === spd
                      ? isLight
                        ? 'bg-sky-600 text-white font-bold'
                        : 'bg-sky-500 text-slate-950 font-bold'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {onOpenAnalysis && (
            <button
              onClick={onOpenAnalysis}
              className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                isLight
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
              title="Mathematical Derivations & Waveform Calculus"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Waveform Analysis</span>
            </button>
          )}

          {onOpenPresets && (
            <button
              onClick={onOpenPresets}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Select Circuit Preset"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              Presets
            </button>
          )}

          {onOpenTheory && (
            <button
              onClick={onOpenTheory}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Educational Guide & Theory"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              Theory
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg border transition ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {isLight ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Browser Fullscreen Toggle */}
          <button
            onClick={toggleBrowserFullscreen}
            className={`hidden sm:flex p-1.5 rounded-lg border transition ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title={isBrowserFullScreen ? 'Exit Full Screen' : 'Toggle Browser Fullscreen'}
          >
            {isBrowserFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Exit Full Screen Studio Button */}
          <button
            id="btn-exit-fullscreen-studio"
            onClick={onClose}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition shadow-sm ${
              isLight
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
                : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40'
            }`}
            title="Exit Full Screen View (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 text-[9px] font-mono">
              ESC
            </kbd>
          </button>
        </div>
      </header>

      {/* Main Studio Body: Parameter Sidebar (hidden in Hybrid mode) + Center Display Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side: Optimized Parameter Panel - HIDDEN in Hybrid Mode */}
        {activeTab !== 'hybrid' && (
          <OptimizedParameterSidebar
            config={config}
            onChangeConfig={onChangeConfig}
            isPlaying={isPlaying}
            onTogglePlay={onTogglePlay}
            onStepForward={onStepForward}
            onStepBackward={onStepBackward}
            onResetTime={onResetTime}
            simSpeed={simSpeed}
            onChangeSpeed={onChangeSpeed}
            onSetAllDevices={onSetAllDevices}
            onSetSemiConverter={onSetSemiConverter}
            onSelectPreset={onSelectPreset}
          />
        )}

        {/* Center: Main Display Area (Full vertical screen together) */}
        <main className="flex-1 h-full overflow-hidden flex flex-col p-2 sm:p-2.5 lg:p-3 min-w-0">
          {activeTab === 'hybrid' ? (
            /* 3rd Mode: Hybrid Side-by-Side View (Schematic & Waveforms together, full screen vertically, no parameter controls) */
            <div className="w-full h-full flex flex-col lg:flex-row gap-2.5 lg:gap-3 min-h-0">
              {/* Left Column: Full-Height Schematic View */}
              <div className="flex-1 w-full lg:w-1/2 h-full flex flex-col min-h-0 overflow-hidden">
                <SchematicView
                  config={config}
                  currentPoint={currentPoint}
                  isPlaying={isPlaying}
                  onToggleSwitch={onToggleSwitch}
                  onToggleFWD={onToggleFWD}
                  onToggleFWDActive={onToggleFWDActive}
                  onSelectLoad={() => {}}
                />
              </div>

              {/* Right Column: Full-Height Waveforms & Plots */}
              <div className="flex-1 w-full lg:w-1/2 h-full flex flex-col min-h-0 overflow-hidden">
                <WaveformViewer
                  config={config}
                  simResult={simResult}
                  currentIndex={currentIndex}
                  onSeekIndex={onSeekIndex}
                />
              </div>
            </div>
          ) : activeTab === 'schematic' ? (
            /* 1st Mode: Schematic Only with Parameters */
            <div className="w-full h-full flex flex-col min-h-0">
              <SchematicView
                config={config}
                currentPoint={currentPoint}
                isPlaying={isPlaying}
                onToggleSwitch={onToggleSwitch}
                onToggleFWD={onToggleFWD}
                onToggleFWDActive={onToggleFWDActive}
                onSelectLoad={() => {}}
              />
            </div>
          ) : (
            /* 2nd Mode: Waveforms Only with Parameters */
            <div className="w-full h-full flex flex-col min-h-0">
              <WaveformViewer
                config={config}
                simResult={simResult}
                currentIndex={currentIndex}
                onSeekIndex={onSeekIndex}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
