import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { X, BookOpen, Lightbulb, Zap, ShieldCheck, HelpCircle } from 'lucide-react';

interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn ${
      isLight ? 'bg-slate-900/40' : 'bg-slate-950/80'
    }`}>
      <div className={`border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200 shadow-slate-300/50' : 'bg-slate-900 border-slate-800'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg border ${
              isLight ? 'bg-sky-50 text-sky-600 border-sky-200' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'
            }`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                Power Electronics Rectifier Principles
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Operating modes, commutation, semi-converters, and freewheeling diode mechanics.
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

        {/* Content */}
        <div className={`p-6 space-y-6 overflow-y-auto text-sm leading-relaxed ${
          isLight ? 'text-slate-700' : 'text-slate-300'
        }`}>
          {/* Section 1 */}
          <div className={`p-4 rounded-xl border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <h4 className={`text-sm font-bold flex items-center gap-2 mb-2 ${
              isLight ? 'text-sky-700' : 'text-sky-300'
            }`}>
              <Zap className={`w-4 h-4 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
              1. Diode vs. Thyristor (SCR) Operation
            </h4>
            <p className={`text-xs mb-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              • <strong>Diode Rectifiers (Uncontrolled)</strong>: Turn ON automatically whenever forward-biased (V_AK &gt; 0) and turn OFF when current falls to zero. Output DC voltage is fixed by the AC source amplitude.
            </p>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              • <strong>Thyristor Converters (Controlled)</strong>: Require both forward-bias (V_AK &gt; 0) <em>and</em> a gate trigger pulse (I_g). By delaying the firing angle α, the average DC output voltage can be smoothly adjusted from maximum positive to zero (or even negative in 2-quadrant inversion mode).
            </p>
          </div>

          {/* Section 2 */}
          <div className={`p-4 rounded-xl border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <h4 className={`text-sm font-bold flex items-center gap-2 mb-2 ${
              isLight ? 'text-emerald-700' : 'text-emerald-300'
            }`}>
              <ShieldCheck className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              2. Freewheeling Diode (D_FW) Role &amp; Advantages
            </h4>
            <div className={`text-xs space-y-1.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              <p>
                When supplying inductive loads (RL or RLE), the inductor stores magnetic energy (0.5 · L · i²). When the AC source voltage reverses polarity:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>
                  <strong>Without FWD</strong>: The collapsing magnetic field forces the bridge switches to stay ON, pulling the load voltage into the negative region (v_o &lt; 0), which reduces average DC voltage and increases current ripple.
                </li>
                <li>
                  <strong>With FWD</strong>: The negative voltage immediately forward-biases the freewheeling diode. Inductor current diverts through D_FW (v_o = 0), clamping negative voltage spikes, improving power factor (cos φ), and allowing natural switch turn-off.
                </li>
              </ul>
            </div>
          </div>

          {/* Section 3 */}
          <div className={`p-4 rounded-xl border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <h4 className={`text-sm font-bold flex items-center gap-2 mb-2 ${
              isLight ? 'text-purple-700' : 'text-violet-300'
            }`}>
              <Lightbulb className={`w-4 h-4 ${isLight ? 'text-purple-600' : 'text-violet-400'}`} />
              3. Semi-Converters (Half-Controlled Bridges)
            </h4>
            <p className={`text-xs mb-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              A <strong>Semi-Converter</strong> mixes controlled switches (Thyristors) in one half of the bridge (e.g. top rail) with uncontrolled Diodes in the other half.
            </p>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              During the freewheeling interval, current naturally loops through one top thyristor and one bottom diode, providing intrinsic freewheeling action even without an external FWD. Output voltage cannot go negative: V_dc = (Vm / π) · (1 + cos α).
            </p>
          </div>

          {/* Section 4 */}
          <div className={`p-4 rounded-xl border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}>
            <h4 className={`text-sm font-bold flex items-center gap-2 mb-2 ${
              isLight ? 'text-rose-700' : 'text-rose-300'
            }`}>
              <HelpCircle className={`w-4 h-4 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
              4. Three-Phase 6-Pulse Converter Features
            </h4>
            <p className={`text-xs mb-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              • Operates with a firing sequence of 60° phase intervals (S1 → S2 → S3 → S4 → S5 → S6).
            </p>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              • The output voltage ripple occurs at 6 × f_line (300 Hz for 50 Hz, 360 Hz for 60 Hz), dramatically reducing filter inductor requirements compared to single-phase (100 Hz).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

