import React, { useState, useMemo } from 'react';
import { ConverterConfig } from '../types';
import {
  DERIVATION_CASES,
  DerivationCase,
  getMatchingDerivationCase,
} from '../utils/waveformDerivations';
import { AnnotatedWaveformPlot } from './AnnotatedWaveformPlot';
import { LatexMath } from './LatexMath';
import { useTheme } from '../context/ThemeContext';
import {
  X,
  Calculator,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  Table,
  BookOpen,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface WaveformAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConverterConfig;
}

export const WaveformAnalysisModal: React.FC<WaveformAnalysisModalProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Matched default case
  const defaultCase = useMemo(() => getMatchingDerivationCase(config), [config]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(defaultCase.id);
  const [activeTab, setActiveTab] = useState<'derivation' | 'comparison' | 'substitution'>('derivation');

  // Local parameter overrides for interactive testing inside analysis tab
  const [localAlpha, setLocalAlpha] = useState<number>(config.alpha);
  const [localVrms, setLocalVrms] = useState<number>(config.sourceParams.Vrms);
  const [localR, setLocalR] = useState<number>(config.loadParams.R);
  const [localL, setLocalL] = useState<number>(config.loadParams.L);

  // Sync with main app config when modal opens or config changes
  React.useEffect(() => {
    if (isOpen) {
      const matched = getMatchingDerivationCase(config);
      setSelectedCaseId(matched.id);
      setLocalAlpha(config.alpha);
      setLocalVrms(config.sourceParams.Vrms);
      setLocalR(config.loadParams.R);
      setLocalL(config.loadParams.L);
    }
  }, [isOpen, config]);

  const currentCase = useMemo(() => {
    return DERIVATION_CASES.find((c) => c.id === selectedCaseId) || defaultCase;
  }, [selectedCaseId, defaultCase]);

  const liveValues = useMemo(() => {
    return currentCase.calculateValues({
      Vrms: localVrms,
      alphaDeg: localAlpha,
      R: localR,
      L: localL,
      freq: config.sourceParams.frequency,
    });
  }, [currentCase, localVrms, localAlpha, localR, localL, config.sourceParams.frequency]);

  if (!isOpen) return null;

  return (
    <div
      id="waveform-analysis-modal"
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-md animate-fadeIn select-none ${
        isLight ? 'bg-slate-900/40' : 'bg-slate-950/85'
      }`}
    >
      <div className={`border rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200 shadow-slate-300/50' : 'bg-slate-900 border-slate-800'
      }`}>
        {/* Modal Header */}
        <div className={`flex flex-wrap items-center justify-between px-5 py-3.5 border-b gap-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${
              isLight ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  Waveform & Output Voltage Analysis
                </h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border font-mono ${
                  isLight
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                }`}>
                  Calculus & LaTeX Derivations
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Detailed step-by-step mathematical derivations of Average (V_dc) and RMS (V_rms) load voltages with annotated waveforms.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const matched = getMatchingDerivationCase(config);
                setSelectedCaseId(matched.id);
                setLocalAlpha(config.alpha);
                setLocalVrms(config.sourceParams.Vrms);
                setLocalR(config.loadParams.R);
                setLocalL(config.loadParams.L);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Sync with Active Live Circuit Configuration"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
              Sync Live Circuit
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition ${
                isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Control Bar: Case Selector & Tab Navigation */}
        <div className={`flex flex-wrap items-center justify-between px-5 py-2.5 border-b gap-3 ${
          isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-slate-950/60 border-slate-800'
        }`}>
          {/* Topology Dropdown Selector */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium flex items-center gap-1 ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              <Layers className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
              Converter Case:
            </span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className={`text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500 font-medium border ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 shadow-xs'
                  : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}
            >
              <optgroup label="Single-Phase (1Φ) Converters">
                {DERIVATION_CASES.filter((c) => c.category === '1-phase').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Three-Phase (3Φ) Converters">
                {DERIVATION_CASES.filter((c) => c.category === '3-phase').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Tab Navigation */}
          <div className={`flex items-center gap-1 p-1 rounded-lg border text-xs ${
            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
          }`}>
            <button
              onClick={() => setActiveTab('derivation')}
              className={`px-3 py-1 rounded font-semibold transition ${
                activeTab === 'derivation'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Derivations & Calculus
            </button>
            <button
              onClick={() => setActiveTab('substitution')}
              className={`px-3 py-1 rounded font-semibold transition ${
                activeTab === 'substitution'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Substitution
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1 rounded font-semibold transition ${
                activeTab === 'comparison'
                  ? 'bg-amber-500 text-slate-950 shadow font-bold'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Formula Summary Table
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* 1. Specially Annotated Waveform View (Only on this Analysis tab) */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className={`text-sm font-bold flex items-center gap-2 ${
                isLight ? 'text-slate-900' : 'text-slate-200'
              }`}>
                <TrendingUp className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                Annotated Output Voltage Waveform (Integration Boundaries)
              </h4>
              <div className="flex items-center gap-3 text-xs">
                {/* Alpha Slider in Header for instant interactive feedback */}
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950 border-slate-800'
                }`}>
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Firing Angle (α):</span>
                  <input
                    type="range"
                    min={0}
                    max={180}
                    step={1}
                    value={localAlpha}
                    onChange={(e) => setLocalAlpha(parseInt(e.target.value, 10))}
                    className={`w-24 h-1.5 rounded appearance-none cursor-pointer accent-amber-500 ${
                      isLight ? 'bg-slate-200' : 'bg-slate-800'
                    }`}
                  />
                  <span className={`font-mono font-bold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{localAlpha}°</span>
                </div>
              </div>
            </div>

            <AnnotatedWaveformPlot
              derivationCase={currentCase}
              Vrms={localVrms}
              alphaDeg={localAlpha}
              R={localR}
              L={localL}
              freq={config.sourceParams.frequency}
            />
          </div>

          {/* Tab 1: Step-by-Step LaTeX Derivations */}
          {activeTab === 'derivation' && (
            <div className="space-y-6">
              {/* Case Overview & Closed Form Summary Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isLight ? 'text-emerald-700' : 'text-emerald-400'
                  }`}>
                    Average DC Voltage Formula (V_dc)
                  </span>
                  <LatexMath math={currentCase.summaryFormulaVdc} block className={`text-lg ${
                    isLight ? 'text-emerald-800' : 'text-emerald-300'
                  }`} />
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Integration of instantaneous output voltage over one repetition period T₀ = {currentCase.period.replace('\\', '')}.
                  </p>
                </div>

                <div className={`p-4 rounded-xl border space-y-2 ${
                  isLight ? 'bg-cyan-50/50 border-cyan-200' : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isLight ? 'text-cyan-700' : 'text-cyan-400'
                  }`}>
                    RMS Output Voltage Formula (V_rms)
                  </span>
                  <LatexMath math={currentCase.summaryFormulaVrms} block className={`text-lg ${
                    isLight ? 'text-cyan-800' : 'text-cyan-300'
                  }`} />
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Square root of mean square instantaneous voltage over repetition period T₀ = {currentCase.period.replace('\\', '')}.
                  </p>
                </div>
              </div>

              {/* Special Extinction Angle & Transcendental Equation Card for RL load */}
              {currentCase.betaSymbol && (
                <div className={`p-4 sm:p-5 rounded-xl border space-y-3 ${
                  isLight ? 'bg-pink-50/60 border-pink-200 shadow-xs' : 'bg-slate-950/80 border-pink-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isLight ? 'text-pink-700' : 'text-pink-400'
                    }`}>
                      <Sparkles className="w-4 h-4" />
                      Transcendental Equation for Extinction Angle (β)
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                      isLight ? 'bg-pink-100 text-pink-800' : 'bg-pink-500/20 text-pink-300'
                    }`}>
                      Conduction: α ≤ θ ≤ β
                    </span>
                  </div>

                  <div className={`p-3 rounded-lg border ${
                    isLight ? 'bg-white border-pink-200' : 'bg-slate-900/90 border-pink-500/20'
                  }`}>
                    <LatexMath
                      math={currentCase.id.includes('diode')
                        ? '\\sin(\\beta - \\phi) + \\sin\\phi \\, e^{-\\frac{\\beta}{\\tan\\phi}} = 0'
                        : '\\sin(\\beta - \\phi) - \\sin(\\alpha - \\phi) e^{-\\frac{\\beta - \\alpha}{\\tan\\phi}} = 0'}
                      block
                      className={`text-base sm:text-lg font-semibold ${
                        isLight ? 'text-pink-900' : 'text-pink-300'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className={`p-2 rounded border ${isLight ? 'bg-white border-pink-100' : 'bg-slate-900 border-slate-800'}`}>
                      <span className={`block text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Load Impedance (Z):</span>
                      <strong className={isLight ? 'text-slate-800' : 'text-slate-200'}>
                        {Math.sqrt(localR * localR + Math.pow(2 * Math.PI * (config.sourceParams.frequency || 50) * (localL * 1e-3), 2)).toFixed(2)} Ω
                      </strong>
                    </div>
                    <div className={`p-2 rounded border ${isLight ? 'bg-white border-pink-100' : 'bg-slate-900 border-slate-800'}`}>
                      <span className={`block text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Load Phase Angle (φ):</span>
                      <strong className={isLight ? 'text-amber-700' : 'text-amber-300'}>
                        {((Math.atan2(2 * Math.PI * (config.sourceParams.frequency || 50) * (localL * 1e-3), Math.max(1e-4, localR)) * 180) / Math.PI).toFixed(1)}°
                      </strong>
                    </div>
                    <div className={`p-2 rounded border ${isLight ? 'bg-white border-pink-100' : 'bg-slate-900 border-slate-800'}`}>
                      <span className={`block text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Extinction Angle (β):</span>
                      <strong className={isLight ? 'text-pink-700' : 'text-pink-300'}>
                        {liveValues.betaCalc ?? '—'}°
                      </strong>
                    </div>
                    <div className={`p-2 rounded border ${isLight ? 'bg-white border-pink-100' : 'bg-slate-900 border-slate-800'}`}>
                      <span className={`block text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Conduction Angle (γ):</span>
                      <strong className={isLight ? 'text-emerald-700' : 'text-emerald-300'}>
                        {liveValues.gammaCalc ?? '—'}°
                      </strong>
                    </div>
                  </div>

                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <strong>Physical Mechanism:</strong> During the positive source half-cycle, inductive energy <LatexMath math="E_L = \frac{1}{2}L i^2" /> is stored in the load inductor. As the source voltage crosses zero and swings negative at 180°, the collapsing magnetic field creates a positive self-induced voltage <LatexMath math="v_L = -L \frac{di}{dt}" /> that maintains positive forward current through the thyristor/diode until all stored magnetic energy is dissipated across the load resistor at angle <LatexMath math="\beta > 180^\circ" />.
                  </p>
                </div>
              )}

              {/* Step-by-Step Average Voltage Derivation */}
              <div className={`p-5 rounded-xl border space-y-4 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className={`flex items-center gap-2 border-b pb-2 ${
                  isLight ? 'border-slate-200' : 'border-slate-800'
                }`}>
                  <div className="w-2 h-4 bg-emerald-500 rounded-sm"></div>
                  <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    Part A: Derivation of Average Output Voltage (V_dc)
                  </h4>
                </div>

                <div className="space-y-4">
                  {currentCase.vdcSteps.map((step, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border space-y-2 ${
                      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/70 border-slate-800/80'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                          isLight
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {step.title}
                        </span>
                      </div>
                      <p className={`text-xs whitespace-pre-line leading-relaxed ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}>
                        {step.description}
                      </p>
                      <div className={`p-3 rounded-md border overflow-x-auto ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800/60'
                      }`}>
                        <LatexMath math={step.latex} block />
                      </div>
                      {step.note && (
                        <p className={`text-[11px] italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Note: {step.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Step-by-Step RMS Voltage Derivation */}
              <div className={`p-5 rounded-xl border space-y-4 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <div className={`flex items-center gap-2 border-b pb-2 ${
                  isLight ? 'border-slate-200' : 'border-slate-800'
                }`}>
                  <div className="w-2 h-4 bg-cyan-500 rounded-sm"></div>
                  <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                    Part B: Derivation of RMS Output Voltage (V_rms)
                  </h4>
                </div>

                <div className="space-y-4">
                  {currentCase.vrmsSteps.map((step, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border space-y-2 ${
                      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900/70 border-slate-800/80'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${
                          isLight
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                            : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                        }`}>
                          {step.title}
                        </span>
                      </div>
                      <p className={`text-xs whitespace-pre-line leading-relaxed ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}>
                        {step.description}
                      </p>
                      <div className={`p-3 rounded-md border overflow-x-auto ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/90 border-slate-800/60'
                      }`}>
                        <LatexMath math={step.latex} block />
                      </div>
                      {step.note && (
                        <p className={`text-[11px] italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          Note: {step.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Live Substitution & Real-Time Calculation */}
          {activeTab === 'substitution' && (
            <div className="space-y-6">
              {/* Interactive Parameter Controls */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
              }`}>
                <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}>
                  <Sliders className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                  Evaluate Formula with Custom Numerical Parameters
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className={`block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Source RMS (V_s):</label>
                    <input
                      type="number"
                      value={localVrms}
                      onChange={(e) => setLocalVrms(parseFloat(e.target.value) || 0)}
                      className={`w-full border rounded px-2.5 py-1 font-mono ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-900 border-slate-700 text-slate-100'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Firing Angle (α°):</label>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      value={localAlpha}
                      onChange={(e) => setLocalAlpha(parseFloat(e.target.value) || 0)}
                      className={`w-full border rounded px-2.5 py-1 font-mono font-semibold ${
                        isLight
                          ? 'bg-white border-slate-300 text-amber-700'
                          : 'bg-slate-900 border-slate-700 text-amber-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Resistance R (Ω):</label>
                    <input
                      type="number"
                      value={localR}
                      onChange={(e) => setLocalR(parseFloat(e.target.value) || 0)}
                      className={`w-full border rounded px-2.5 py-1 font-mono ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-900 border-slate-700 text-slate-100'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Inductance L (mH):</label>
                    <input
                      type="number"
                      value={localL}
                      onChange={(e) => setLocalL(parseFloat(e.target.value) || 0)}
                      className={`w-full border rounded px-2.5 py-1 font-mono ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-slate-900 border-slate-700 text-slate-100'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Exact Numerical Substitution Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vdc Substitution */}
                <div className={`p-5 rounded-xl border space-y-3 ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      isLight ? 'text-emerald-700' : 'text-emerald-400'
                    }`}>
                      V_dc Numerical Evaluation
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                      isLight
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}>
                      {liveValues.Vdc.toFixed(2)} V
                    </span>
                  </div>
                  <div className={`p-3.5 rounded-lg font-mono text-xs space-y-2 border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/80 border-slate-800 text-slate-300'
                  }`}>
                    <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                      Peak Voltage V_m = √2 × {localVrms} = {(Math.sqrt(2) * localVrms).toFixed(2)} V
                    </p>
                    <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                      cos(α) = cos({localAlpha}°) = {Math.cos((localAlpha * Math.PI) / 180).toFixed(4)}
                    </p>
                    <div className={`border-t pt-2 font-bold ${
                      isLight ? 'border-slate-200 text-emerald-700' : 'border-slate-800 text-emerald-400'
                    }`}>
                      V_dc = {currentCase.summaryFormulaVdc.split('=')[1]} = {liveValues.Vdc.toFixed(2)} V
                    </div>
                  </div>
                </div>

                {/* Vrms Substitution */}
                <div className={`p-5 rounded-xl border space-y-3 ${
                  isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      isLight ? 'text-cyan-700' : 'text-cyan-400'
                    }`}>
                      V_rms Numerical Evaluation
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                      isLight
                        ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                        : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                    }`}>
                      {liveValues.Vrms.toFixed(2)} V
                    </span>
                  </div>
                  <div className={`p-3.5 rounded-lg font-mono text-xs space-y-2 border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/80 border-slate-800 text-slate-300'
                  }`}>
                    <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                      Form Factor (FF) = V_rms / V_dc = {liveValues.formFactor.toFixed(4)}
                    </p>
                    <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                      Ripple Factor (RF) = √(FF² - 1) = {(liveValues.rippleFactor * 100).toFixed(2)}%
                    </p>
                    <div className={`border-t pt-2 font-bold ${
                      isLight ? 'border-slate-200 text-cyan-700' : 'border-slate-800 text-cyan-400'
                    }`}>
                      V_rms = {liveValues.Vrms.toFixed(2)} V
                    </div>
                  </div>
                </div>
              </div>

              {/* Extinction Angle Beta Info (if RL load) */}
              {liveValues.betaCalc !== undefined && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isLight ? 'bg-pink-50/50 border-pink-200' : 'bg-slate-950/80 border-pink-500/20'
                }`}>
                  <h5 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    isLight ? 'text-pink-700' : 'text-pink-400'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    Inductive Conduction Angles (Extinction Angle β & Conduction Angle γ)
                  </h5>
                  <div className="grid grid-cols-3 gap-3 text-xs font-mono pt-1">
                    <div className={`p-2.5 rounded border ${
                      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
                    }`}>
                      <span className={`block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Firing Angle (α):</span>
                      <strong className={`text-sm ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>{localAlpha}°</strong>
                    </div>
                    <div className={`p-2.5 rounded border ${
                      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
                    }`}>
                      <span className={`block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Extinction Angle (β):</span>
                      <strong className={`text-sm ${isLight ? 'text-pink-700' : 'text-pink-300'}`}>{liveValues.betaCalc}°</strong>
                    </div>
                    <div className={`p-2.5 rounded border ${
                      isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
                    }`}>
                      <span className={`block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Conduction Angle (γ = β - α):</span>
                      <strong className={`text-sm ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>{liveValues.gammaCalc}°</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Formula Summary Table across ALL Converter Cases */}
          {activeTab === 'comparison' && (
            <div className={`p-4 sm:p-5 rounded-xl border space-y-4 ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-950/80 border-slate-800'
            }`}>
              <div className={`flex items-center gap-2 border-b pb-2 ${
                isLight ? 'border-slate-200' : 'border-slate-800'
              }`}>
                <Table className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  Comprehensive Converter Equation Reference Table
                </h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className={`border-b ${
                      isLight ? 'border-slate-200 bg-slate-100/80 text-slate-700' : 'border-slate-800 bg-slate-900/90 text-slate-300'
                    }`}>
                      <th className="py-2.5 px-3 font-bold">Topology & Load Case</th>
                      <th className="py-2.5 px-3 font-bold">Repetition T₀</th>
                      <th className={`py-2.5 px-3 font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>Average Output V_dc</th>
                      <th className={`py-2.5 px-3 font-bold ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`}>RMS Output V_rms</th>
                      <th className="py-2.5 px-3 font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${
                    isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/60 text-slate-300'
                  }`}>
                    {DERIVATION_CASES.map((c) => {
                      const isSelected = c.id === currentCase.id;
                      return (
                        <tr
                          key={c.id}
                          className={`transition ${
                            isSelected
                              ? isLight
                                ? 'bg-amber-50'
                                : 'bg-amber-500/10'
                              : isLight
                              ? 'hover:bg-slate-50'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-3">
                            <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{c.name}</div>
                            <div className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{c.loadCondition}</div>
                          </td>
                          <td className={`py-3 px-3 font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            <LatexMath math={`T_0 = ${c.period}`} />
                          </td>
                          <td className="py-3 px-3">
                            <LatexMath math={c.summaryFormulaVdc} className={`font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`} />
                          </td>
                          <td className="py-3 px-3">
                            <LatexMath math={c.summaryFormulaVrms} className={`font-semibold ${isLight ? 'text-cyan-700' : 'text-cyan-300'}`} />
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => {
                                setSelectedCaseId(c.id);
                                setActiveTab('derivation');
                              }}
                              className={`px-2.5 py-1 rounded font-semibold border transition flex items-center gap-1 ${
                                isLight
                                  ? 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
                                  : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border-slate-700'
                              }`}
                            >
                              Analyze <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

