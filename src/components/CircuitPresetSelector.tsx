import React from 'react';
import { CIRCUIT_PRESETS } from '../utils/presets';
import { CircuitPreset } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Sparkles, Check, X, ArrowRight, Zap } from 'lucide-react';

interface CircuitPresetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: CircuitPreset) => void;
  currentPresetId?: string;
}

export const CircuitPresetSelector: React.FC<CircuitPresetSelectorProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  currentPresetId,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn ${
      isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'
    }`}>
      <div className={`border rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200 shadow-slate-300/50' : 'bg-slate-900 border-slate-800'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              isLight ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>Standard Converter Presets</h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Load classic single-phase, three-phase, semi-converter, and controlled bridge configurations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Cards Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto">
          {CIRCUIT_PRESETS.map((preset) => {
            const isSelected = preset.id === currentPresetId;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  onSelectPreset(preset);
                  onClose();
                }}
                className={`group p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? isLight
                      ? 'bg-sky-50/70 border-sky-400 ring-2 ring-sky-400/30 shadow-md'
                      : 'bg-sky-950/40 border-sky-500/60 ring-1 ring-sky-500/40 shadow-lg'
                    : isLight
                    ? 'bg-white border-slate-200 hover:border-sky-300 hover:bg-slate-50/80 shadow-xs'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                      isLight
                        ? 'bg-slate-100 text-sky-700 border-slate-200'
                        : 'bg-slate-800 text-sky-400 border-slate-700'
                    }`}>
                      {preset.badge}
                    </span>
                    {preset.alpha > 0 && (
                      <span className={`text-[11px] font-mono font-semibold ${
                        isLight ? 'text-amber-700' : 'text-amber-400'
                      }`}>
                        α = {preset.alpha}°
                      </span>
                    )}
                  </div>
                  <h4 className={`text-sm font-bold transition ${
                    isLight
                      ? 'text-slate-900 group-hover:text-sky-700'
                      : 'text-slate-100 group-hover:text-sky-300'
                  }`}>
                    {preset.name}
                  </h4>
                  <p className={`text-xs mt-1 line-clamp-2 ${
                    isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {preset.description}
                  </p>
                </div>

                <div className={`flex items-center justify-between mt-3 pt-3 border-t text-[11px] ${
                  isLight ? 'border-slate-100 text-slate-500' : 'border-slate-800/80 text-slate-400'
                }`}>
                  <div className="flex items-center gap-2 font-mono">
                    <span>{preset.loadType} Load</span>
                    <span>•</span>
                    <span>R={preset.loadParams.R}Ω</span>
                    {preset.loadParams.L > 0 && <span>L={preset.loadParams.L}mH</span>}
                  </div>
                  <span className={`flex items-center gap-1 font-medium group-hover:translate-x-0.5 transition-transform ${
                    isLight ? 'text-sky-600 font-semibold' : 'text-sky-400'
                  }`}>
                    Load <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

