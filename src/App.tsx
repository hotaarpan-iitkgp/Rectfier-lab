import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ConverterConfig, DeviceType, SimulationResult, CircuitPreset } from './types';
import { runCircuitSimulation } from './utils/circuitSimulation';
import { CIRCUIT_PRESETS } from './utils/presets';
import { SchematicView } from './components/SchematicView';
import { WaveformViewer } from './components/WaveformViewer';
import { ControlPanel } from './components/ControlPanel';
import { MetricsPanel } from './components/MetricsPanel';
import { CircuitPresetSelector } from './components/CircuitPresetSelector';
import { TheoryModal } from './components/TheoryModal';
import { WaveformAnalysisModal } from './components/WaveformAnalysisModal';
import { FullScreenStudio } from './components/FullScreenStudio';
import { useTheme } from './context/ThemeContext';
import {
  Zap,
  Sparkles,
  BookOpen,
  RotateCcw,
  Sliders,
  Layers,
  HelpCircle,
  Cpu,
  Info,
  Calculator,
  Sun,
  Moon,
  Maximize2,
} from 'lucide-react';

const INITIAL_CONFIG: ConverterConfig = {
  phaseMode: '1-phase',
  circuitType: 'full-bridge',
  switches: {
    S1: 'thyristor',
    S2: 'thyristor',
    S3: 'thyristor',
    S4: 'thyristor',
    S5: 'diode',
    S6: 'diode',
  },
  hasFWD: true,
  isFWDActive: true,
  alpha: 45,
  loadType: 'RL',
  loadParams: {
    R: 20,
    L: 45,
    E: 0,
  },
  sourceParams: {
    Vrms: 230,
    frequency: 50,
  },
};

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [config, setConfig] = useState<ConverterConfig>(INITIAL_CONFIG);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isTheoryOpen, setIsTheoryOpen] = useState<boolean>(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState<boolean>(false);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);
  const [fullScreenTab, setFullScreenTab] = useState<'schematic' | 'waveforms'>('schematic');
  const [currentPresetId, setCurrentPresetId] = useState<string | undefined>('1ph-thyristor-bridge-rl');

  // Compute steady-state physics ODE solution
  const simResult: SimulationResult = useMemo(() => {
    return runCircuitSimulation(config);
  }, [config]);

  const totalPoints = simResult.points.length;
  const currentPoint = simResult.points[currentIndex] || simResult.points[0] || null;

  // Real-time animation loop using requestAnimationFrame with smooth continuous interpolation
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const floatIndexRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const animate = (time: number) => {
      // Guard against huge delta spikes when tab is backgrounded
      const rawDelta = (time - lastTimeRef.current) / 1000;
      const delta = Math.min(0.1, Math.max(0.001, rawDelta));
      lastTimeRef.current = time;

      if (totalPoints > 0) {
        // Base time for 1 electrical cycle (360 degrees) at 1x speed is ~3.0s
        // This ensures smooth, visible motion through both positive and negative half-cycles without vibration
        const cycleDurationSec = 3.0 / Math.max(0.05, simSpeed);
        const stepsPerSec = totalPoints / cycleDurationSec;
        const advance = delta * stepsPerSec;

        floatIndexRef.current = (floatIndexRef.current + advance) % totalPoints;
        const nextIntIndex = Math.floor(floatIndexRef.current);
        setCurrentIndex(nextIntIndex);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, totalPoints, simSpeed]);

  // Handler to toggle switch between diode and thyristor
  const handleToggleSwitch = (switchId: string) => {
    setConfig((prev) => {
      const currentType = prev.switches[switchId] || 'diode';
      const nextType: DeviceType = currentType === 'diode' ? 'thyristor' : 'diode';
      return {
        ...prev,
        switches: {
          ...prev.switches,
          [switchId]: nextType,
        },
      };
    });
    setCurrentPresetId(undefined);
  };

  // Toggle FWD connected / disconnected
  const handleToggleFWD = () => {
    setConfig((prev) => ({
      ...prev,
      hasFWD: !prev.hasFWD,
      isFWDActive: !prev.hasFWD ? true : false,
    }));
    setCurrentPresetId(undefined);
  };

  // Toggle FWD active / inactive conduction
  const handleToggleFWDActive = () => {
    setConfig((prev) => ({
      ...prev,
      isFWDActive: !prev.isFWDActive,
    }));
    setCurrentPresetId(undefined);
  };

  // Set all devices to diode or thyristor
  const handleSetAllDevices = (type: DeviceType) => {
    setConfig((prev) => ({
      ...prev,
      switches: {
        S1: type,
        S2: type,
        S3: type,
        S4: type,
        S5: type,
        S6: type,
      },
    }));
    setCurrentPresetId(undefined);
  };

  // Set semi-converter configuration (Top thyristors, Bottom diodes)
  const handleSetSemiConverter = () => {
    setConfig((prev) => ({
      ...prev,
      switches: {
        S1: 'thyristor',
        S2: 'diode',
        S3: 'thyristor',
        S4: 'diode',
        S5: 'thyristor',
        S6: 'diode',
      },
      hasFWD: true,
      isFWDActive: true,
    }));
    setCurrentPresetId(undefined);
  };

  // Handle configuration updates
  const handleChangeConfig = (newConfig: Partial<ConverterConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...newConfig,
    }));
    setCurrentPresetId(undefined);
  };

  // Load preset
  const handleSelectPreset = (preset: CircuitPreset) => {
    setConfig({
      phaseMode: preset.phaseMode,
      circuitType: preset.circuitType,
      switches: { ...preset.switches },
      hasFWD: preset.hasFWD,
      isFWDActive: preset.isFWDActive,
      alpha: preset.alpha,
      loadType: preset.loadType,
      loadParams: { ...preset.loadParams },
      sourceParams: { ...config.sourceParams },
    });
    setCurrentPresetId(preset.id);
  };

  // Step controls
  const handleStepForward = () => {
    setIsPlaying(false);
    floatIndexRef.current = (floatIndexRef.current + 20) % totalPoints;
    setCurrentIndex(Math.floor(floatIndexRef.current));
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    floatIndexRef.current = (floatIndexRef.current - 20 + totalPoints) % totalPoints;
    setCurrentIndex(Math.floor(floatIndexRef.current));
  };

  const handleResetTime = () => {
    floatIndexRef.current = 0;
    setCurrentIndex(0);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        theme === 'light'
          ? 'bg-slate-100 text-slate-800 selection:bg-sky-500/20'
          : 'bg-slate-950 text-slate-100 selection:bg-sky-500/30'
      }`}
    >
      {/* Top Application Header */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 lg:px-6 py-3 transition-colors duration-200 ${
          theme === 'light'
            ? 'bg-white/90 border-slate-200/90 text-slate-900 shadow-xs'
            : 'bg-slate-950/90 border-slate-800/80 text-slate-100'
        }`}
      >
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-500 text-white font-black shadow-lg shadow-sky-500/10">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`text-base sm:text-lg font-bold tracking-tight ${
                    theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                  }`}
                >
                  RectifierLab
                </h1>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full font-mono border ${
                    theme === 'light'
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                  }`}
                >
                  Power Electronics Studio
                </span>
              </div>
              <p
                className={`text-xs hidden sm:block ${
                  theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Interactive Single-Phase & Three-Phase Diode/Thyristor Bridge Converter Simulation
              </p>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              id="btn-toggle-theme"
              onClick={toggleTheme}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-xs ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light Mode</span>
                </>
              )}
            </button>

            <button
              id="btn-open-fullscreen-studio"
              onClick={() => {
                setFullScreenTab('schematic');
                setIsFullScreenOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition shadow-sm ${
                theme === 'light'
                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
                  : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/40'
              }`}
              title="Open Dedicated Full Screen Studio Mode"
            >
              <Maximize2 className="w-3.5 h-3.5 text-sky-500" />
              Full Screen Studio
            </button>

            <button
              id="btn-open-analysis"
              onClick={() => setIsAnalysisOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition shadow-sm ${
                theme === 'light'
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
              }`}
            >
              <Calculator className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`} />
              Waveform Analysis & Derivations
            </button>

            <button
              id="btn-open-presets"
              onClick={() => setIsPresetsOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              Presets
            </button>

            <button
              id="btn-open-theory"
              onClick={() => setIsTheoryOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              Theory
            </button>

            <button
              onClick={() => handleSelectPreset(CIRCUIT_PRESETS[0])}
              className={`p-1.5 rounded-lg border transition ${
                theme === 'light'
                  ? 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-300 shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
              title="Reset Default State"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Split-Screen Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 lg:p-6 space-y-4">
        {/* Split Screen Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left Column: Interactive Schematic (6 cols on lg) */}
          <div className="lg:col-span-6 flex flex-col min-h-[460px]">
            <SchematicView
              config={config}
              currentPoint={currentPoint}
              isPlaying={isPlaying}
              onToggleSwitch={handleToggleSwitch}
              onToggleFWD={handleToggleFWD}
              onToggleFWDActive={handleToggleFWDActive}
              onSelectLoad={() => {}}
              onOpenFullScreen={() => {
                setFullScreenTab('schematic');
                setIsFullScreenOpen(true);
              }}
            />
          </div>

          {/* Right Column: Waveforms & Scrubber (6 cols on lg) */}
          <div className="lg:col-span-6 flex flex-col min-h-[460px]">
            <WaveformViewer
              config={config}
              simResult={simResult}
              currentIndex={currentIndex}
              onSeekIndex={(idx) => {
                setIsPlaying(false);
                floatIndexRef.current = idx;
                setCurrentIndex(idx);
              }}
              onOpenFullScreen={() => {
                setFullScreenTab('waveforms');
                setIsFullScreenOpen(true);
              }}
            />
          </div>
        </div>

        {/* Real-time Control Panel Section */}
        <ControlPanel
          config={config}
          onChangeConfig={handleChangeConfig}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onStepForward={handleStepForward}
          onStepBackward={handleStepBackward}
          onResetTime={handleResetTime}
          simSpeed={simSpeed}
          onChangeSpeed={setSimSpeed}
          onSetAllDevices={handleSetAllDevices}
          onSetSemiConverter={handleSetSemiConverter}
        />

        {/* Metrics & Performance Quality Panel */}
        <MetricsPanel simResult={simResult} />
      </main>

      {/* Full Screen Studio Modal View */}
      <FullScreenStudio
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        initialTab={fullScreenTab}
        config={config}
        onChangeConfig={handleChangeConfig}
        currentPoint={currentPoint}
        simResult={simResult}
        currentIndex={currentIndex}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onStepForward={handleStepForward}
        onStepBackward={handleStepBackward}
        onResetTime={handleResetTime}
        simSpeed={simSpeed}
        onChangeSpeed={setSimSpeed}
        onToggleSwitch={handleToggleSwitch}
        onToggleFWD={handleToggleFWD}
        onToggleFWDActive={handleToggleFWDActive}
        onSetAllDevices={handleSetAllDevices}
        onSetSemiConverter={handleSetSemiConverter}
        onSeekIndex={(idx) => {
          setIsPlaying(false);
          floatIndexRef.current = idx;
          setCurrentIndex(idx);
        }}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenTheory={() => setIsTheoryOpen(true)}
        onOpenAnalysis={() => setIsAnalysisOpen(true)}
        onSelectPreset={handleSelectPreset}
      />

      {/* Preset Modal */}
      <CircuitPresetSelector
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPreset={handleSelectPreset}
        currentPresetId={currentPresetId}
      />

      {/* Educational Theory Guide Modal */}
      <TheoryModal
        isOpen={isTheoryOpen}
        onClose={() => setIsTheoryOpen(false)}
      />

      {/* Waveform Analysis & Derivations Modal */}
      <WaveformAnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => setIsAnalysisOpen(false)}
        config={config}
      />
    </div>
  );
}
