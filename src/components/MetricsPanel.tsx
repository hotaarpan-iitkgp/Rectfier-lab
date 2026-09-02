import React from 'react';
import { SimulationResult } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Activity, Gauge, Zap, TrendingUp, Cpu, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';

interface MetricsPanelProps {
  simResult: SimulationResult;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ simResult }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const {
    vDcAvg,
    vRms,
    iDcAvg,
    iRms,
    pLoad,
    sInput,
    pf,
    displacementFactor,
    thd,
    rippleFactor,
    formFactor,
    rectificationEfficiency,
    isDiscontinuous,
    theoreticalFormula,
  } = simResult;

  return (
    <div id="metrics-panel-container" className="space-y-4">
      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1: Average DC Voltage */}
        <div
          className={`rounded-xl p-3 border transition-colors duration-200 shadow-md ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 shadow-lg'
          }`}
        >
          <div className={`flex items-center justify-between text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>Avg DC Voltage</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isLight ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-sky-500/10 text-sky-400'
              }`}
            >
              V_dc
            </span>
          </div>
          <div className={`text-xl font-bold font-mono ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            {vDcAvg.toFixed(1)} <span className={`text-xs font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>V</span>
          </div>
          <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            V_rms = <span className={`font-mono ${isLight ? 'text-slate-700 font-semibold' : 'text-slate-300'}`}>{vRms.toFixed(1)} V</span>
          </div>
        </div>

        {/* Metric 2: Average Load Current */}
        <div
          className={`rounded-xl p-3 border transition-colors duration-200 shadow-md ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 shadow-lg'
          }`}
        >
          <div className={`flex items-center justify-between text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>Avg DC Current</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              I_dc
            </span>
          </div>
          <div className={`text-xl font-bold font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
            {iDcAvg.toFixed(2)} <span className={`text-xs font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>A</span>
          </div>
          <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            I_rms = <span className={`font-mono ${isLight ? 'text-slate-700 font-semibold' : 'text-slate-300'}`}>{iRms.toFixed(2)} A</span>
          </div>
        </div>

        {/* Metric 3: Active Power Output */}
        <div
          className={`rounded-xl p-3 border transition-colors duration-200 shadow-md ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 shadow-lg'
          }`}
        >
          <div className={`flex items-center justify-between text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>Output Power</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isLight ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              P_load
            </span>
          </div>
          <div className={`text-xl font-bold font-mono ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
            {pLoad.toFixed(1)} <span className={`text-xs font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>W</span>
          </div>
          <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            S_in = <span className={`font-mono ${isLight ? 'text-slate-700 font-semibold' : 'text-slate-300'}`}>{sInput.toFixed(0)} VA</span>
          </div>
        </div>

        {/* Metric 4: Input Power Factor & DF */}
        <div
          className={`rounded-xl p-3 border transition-colors duration-200 shadow-md ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 shadow-lg'
          }`}
        >
          <div className={`flex items-center justify-between text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>Power Factor</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isLight ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-violet-500/10 text-violet-400'
              }`}
            >
              PF
            </span>
          </div>
          <div className={`text-xl font-bold font-mono ${isLight ? 'text-purple-700' : 'text-violet-400'}`}>
            {pf.toFixed(3)}
          </div>
          <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            cos(φ1) = <span className={`font-mono ${isLight ? 'text-slate-700 font-semibold' : 'text-slate-300'}`}>{displacementFactor.toFixed(3)}</span>
          </div>
        </div>

        {/* Metric 5: Ripple Factor & Form Factor */}
        <div
          className={`rounded-xl p-3 border transition-colors duration-200 shadow-md ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 shadow-lg'
          }`}
        >
          <div className={`flex items-center justify-between text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>Ripple Factor</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isLight ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              RF
            </span>
          </div>
          <div className={`text-xl font-bold font-mono ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
            {rippleFactor.toFixed(3)}
          </div>
          <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Form Factor FF = <span className={`font-mono ${isLight ? 'text-slate-700 font-semibold' : 'text-slate-300'}`}>{formFactor.toFixed(2)}</span>
          </div>
        </div>

        {/* Metric 6: Current THD & Conduction Mode */}
        <div
          className={`rounded-xl p-3 border transition-colors duration-200 shadow-md ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 shadow-lg'
          }`}
        >
          <div className={`flex items-center justify-between text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>Source THD_i</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isLight ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-cyan-500/10 text-cyan-400'
              }`}
            >
              THD
            </span>
          </div>
          <div className={`text-xl font-bold font-mono ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
            {thd.toFixed(1)} <span className={`text-xs font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>%</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] mt-1">
            {isDiscontinuous ? (
              <span className={`flex items-center gap-1 font-semibold ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                <AlertTriangle className="w-3 h-3" /> DCM Mode
              </span>
            ) : (
              <span className={`flex items-center gap-1 font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                <CheckCircle2 className="w-3 h-3" /> CCM Continuous
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Analytical Formula & Theory Verification Card */}
      {theoreticalFormula && (
        <div
          className={`rounded-xl p-4 border transition-colors duration-200 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900/90 border-slate-800 shadow-lg'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
              <h4 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                {theoreticalFormula.title} — Analytical DC Voltage Equation
              </h4>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {theoreticalFormula.description}
            </p>
          </div>

          <div
            className={`flex items-center gap-4 px-4 py-2.5 rounded-lg border shrink-0 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
            }`}
          >
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Theoretical Formula</span>
              <span className={`text-sm font-mono font-bold ${isLight ? 'text-sky-700' : 'text-sky-300'}`}>
                {theoreticalFormula.formulaVdc}
              </span>
            </div>
            <div className={`h-8 w-px ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}></div>
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Ideal Theoretical V_dc</span>
              <span className={`text-base font-mono font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                {theoreticalFormula.calculatedVdc.toFixed(1)} V
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

