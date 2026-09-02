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
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  BookOpen,
  Calculator,
  Sun,
  Moon,
  RotateCcw,
} from 'lucide-react';

interface FullScreenStudioProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'schematic' | 'waveforms';
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
  const [activeTab, setActiveTab] = useState<'schematic' | 'waveforms'>(initialTab);
  const [isBrowserFullScreen, setIsBrowserFullScreen] = useState<boolean>(false);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle ESC key to exit full screen
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
        className={`flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6 py-2.5 border-b select-none z-30 transition-colors duration-200 ${
          isLight
            ? 'bg-white/95 border-slate-200 text-slate-900 shadow-xs'
            : 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-lg'
        }`}
      >
        {/* Left: App Branding & Status */}
        <div className="flex items-center gap-3">
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
                  isLight
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                }`}
              >
                FULL SCREEN STUDIO
              </span>
            </div>
          </div>
        </div>

        {/* Center: Major View Mode Tabs (Circuit Schematic vs Waveforms) */}
        <div className="flex items-center">
          <div
            className={`flex items-center p-1 rounded-xl border ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <button
              id="fs-tab-schematic"
              onClick={() => setActiveTab('schematic')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'schematic'
                  ? isLight
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-sky-500 text-slate-950 shadow-md'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4" />
              Circuit Schematic Diagram
            </button>

            <button
              id="fs-tab-waveforms"
              onClick={() => setActiveTab('waveforms')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'waveforms'
                  ? isLight
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-sky-500 text-slate-950 shadow-md'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              Waveforms & Oscilloscope
            </button>
          </div>
        </div>

        {/* Right: Auxiliary Actions & Exit Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onOpenAnalysis && (
            <button
              onClick={onOpenAnalysis}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                isLight
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
              title="Mathematical Derivations & Waveform Calculus"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Waveform Analysis</span>
            </button>
          )}

          {onOpenPresets && (
            <button
              onClick={onOpenPresets}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
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
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
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
            <span>Exit Full Screen</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 text-[9px] font-mono">
              ESC
            </kbd>
          </button>
        </div>
      </header>

      {/* Main Studio Body: Left Parameter Sidebar + Center Full View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Optimized Parameter Panel */}
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

        {/* Right Side: Main Full-Screen Display Area */}
        <main className="flex-1 h-full overflow-hidden flex flex-col p-2.5 sm:p-3 lg:p-4">
          {activeTab === 'schematic' ? (
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
