import { ConverterConfig } from '../types';

export interface DerivationStep {
  title: string;
  description: string;
  latex: string;
  note?: string;
}

export interface DerivationCase {
  id: string;
  name: string;
  category: '1-phase' | '3-phase';
  subCategory: 'Half-Wave' | 'Full-Bridge' | 'Semi-Converter';
  loadCondition: string;
  period: string; // e.g. "2\pi", "\pi", "\pi/3"
  periodVal: number;
  alphaSymbol: string;
  betaSymbol?: string;
  summaryFormulaVdc: string;
  summaryFormulaVrms: string;
  waveformType: '1ph-hw-r' | '1ph-hw-rl' | '1ph-hw-fwd' | '1ph-fb-cont' | '1ph-fb-disc' | '1ph-fb-r' | '1ph-semi' | '1ph-diode-fb' | '3ph-hw' | '3ph-fb-ctrl' | '3ph-fb-diode' | '3ph-semi';
  description: string;
  vdcSteps: DerivationStep[];
  vrmsSteps: DerivationStep[];
  calculateValues: (params: {
    Vrms: number;
    alphaDeg: number;
    betaDeg?: number;
    freq?: number;
    R?: number;
    L?: number;
  }) => {
    Vdc: number;
    Vrms: number;
    formFactor: number;
    rippleFactor: number;
    rippleVoltage: number;
    betaCalc?: number;
    gammaCalc?: number;
  };
}

/**
 * Numerically solves for the RL extinction angle beta where i(beta) = 0
 * i(wt) = (Vm/Z)*[ sin(wt - phi) - sin(alpha - phi)*exp(-(wt-alpha)/tan(phi)) ]
 */
export function solveExtinctionAngle(alphaDeg: number, R: number, L_mH: number, freq: number = 50): number {
  const alphaRad = (alphaDeg * Math.PI) / 180;
  const L = L_mH * 1e-3;
  const omega = 2 * Math.PI * freq;
  const XL = omega * L;
  const Z = Math.sqrt(R * R + XL * XL);
  const phi = Math.atan2(XL, R);

  if (XL <= 1e-6) {
    return 180; // Pure resistive load extinguishes at 180 deg
  }

  // Scan from alpha to 2*pi in fine steps
  const f = (theta: number) => {
    const term1 = Math.sin(theta - phi);
    const term2 = Math.sin(alphaRad - phi) * Math.exp(-(theta - alphaRad) / Math.tan(phi));
    return term1 - term2;
  };

  const start = alphaRad + 0.01;
  const end = Math.min(2 * Math.PI, alphaRad + Math.PI * 1.5);
  const steps = 300;
  const dTheta = (end - start) / steps;

  let prevVal = f(start);
  let betaRad = Math.PI;

  for (let i = 1; i <= steps; i++) {
    const curTheta = start + i * dTheta;
    const curVal = f(curTheta);
    if (prevVal >= 0 && curVal < 0) {
      // Linear interpolation root finding
      betaRad = curTheta - (curVal * dTheta) / (curVal - prevVal);
      return Math.round(((betaRad * 180) / Math.PI) * 10) / 10;
    }
    prevVal = curVal;
  }

  return Math.min(360, Math.round(((betaRad * 180) / Math.PI) * 10) / 10);
}

export const DERIVATION_CASES: DerivationCase[] = [
  // =========================================================================
  // 1. Single-Phase Full-Bridge Converter (Highly Inductive RL / Continuous)
  // =========================================================================
  {
    id: '1ph-fb-cont',
    name: '1-Phase Full-Bridge Controlled Rectifier (Continuous Conduction)',
    category: '1-phase',
    subCategory: 'Full-Bridge',
    loadCondition: 'Highly Inductive Load (RL continuous without FWD)',
    period: '\\pi',
    periodVal: Math.PI,
    alphaSymbol: '\\alpha',
    waveformType: '1ph-fb-cont',
    summaryFormulaVdc: 'V_{dc} = \\frac{2V_m}{\\pi}\\cos\\alpha',
    summaryFormulaVrms: 'V_{rms} = \\frac{V_m}{\\sqrt{2}} = V_{s,rms}',
    description: 'Thyristor pairs (S1+S2 and S3+S4) conduct in alternate half-cycles. High load inductance maintains non-zero current across the zero-crossing, allowing the output voltage to go negative until the next thyristor pair is fired at π+α.',
    vdcSteps: [
      {
        title: 'Step 1: Fundamental Average Voltage Definition',
        description: 'The average DC output voltage is the integral of the instantaneous voltage v_o(θ) over one fundamental repetition period T₀ = π (180°):',
        latex: 'V_{dc} = \\frac{1}{T_0} \\int_{\\theta_1}^{\\theta_2} v_o(\\theta) \\, d\\theta = \\frac{1}{\\pi} \\int_{\\alpha}^{\\pi + \\alpha} v_o(\\theta) \\, d\\theta',
      },
      {
        title: 'Step 2: Substitute Instantaneous Source Waveform',
        description: 'Over the interval [α, π+α], the output voltage tracks the AC line voltage v_s(θ) = V_m sin(θ):',
        latex: 'V_{dc} = \\frac{1}{\\pi} \\int_{\\alpha}^{\\pi + \\alpha} V_m \\sin\\theta \\, d\\theta = \\frac{V_m}{\\pi} \\left[ -\\cos\\theta \\right]_{\\alpha}^{\\pi + \\alpha}',
      },
      {
        title: 'Step 3: Evaluate Limits of Integration',
        description: 'Applying trigonometric identity cos(π+α) = -cos(α):',
        latex: 'V_{dc} = \\frac{V_m}{\\pi} \\left( -\\cos(\\pi + \\alpha) - (-\\cos\\alpha) \\right) = \\frac{V_m}{\\pi} \\left( -(-\\cos\\alpha) + \\cos\\alpha \\right) = \\frac{V_m}{\\pi} (2\\cos\\alpha)',
      },
      {
        title: 'Step 4: Final Closed-Form DC Expression',
        description: 'Expressed in terms of peak voltage V_m and RMS input voltage V_s (where V_m = √2 V_s):',
        latex: 'V_{dc} = \\frac{2V_m}{\\pi} \\cos\\alpha = \\frac{2\\sqrt{2}V_s}{\\pi} \\cos\\alpha \\approx 0.90 \\, V_s \\cos\\alpha',
      },
    ],
    vrmsSteps: [
      {
        title: 'Step 1: Fundamental RMS Voltage Definition',
        description: 'The Root-Mean-Square (RMS) value is the square root of the mean squared voltage over one repetition period T₀ = π:',
        latex: 'V_{rms} = \\sqrt{ \\frac{1}{T_0} \\int_{\\alpha}^{\\pi + \\alpha} v_o^2(\\theta) \\, d\\theta } = \\left[ \\frac{1}{\\pi} \\int_{\\alpha}^{\\pi + \\alpha} V_m^2 \\sin^2\\theta \\, d\\theta \\right]^{1/2}',
      },
      {
        title: 'Step 2: Use Half-Angle Identity',
        description: 'Using the trigonometric identity sin²(θ) = (1 - cos(2θ)) / 2:',
        latex: 'V_{rms} = V_m \\left[ \\frac{1}{\\pi} \\int_{\\alpha}^{\\pi + \\alpha} \\frac{1 - \\cos(2\\theta)}{2} \\, d\\theta \\right]^{1/2} = V_m \\left[ \\frac{1}{2\\pi} \\left( [\\theta]_{\\alpha}^{\\pi+\\alpha} - \\left[ \\frac{\\sin(2\\theta)}{2} \\right]_{\\alpha}^{\\pi+\\alpha} \\right) \\right]^{1/2}',
      },
      {
        title: 'Step 3: Evaluate Limits',
        description: 'Since sin(2(π+α)) = sin(2π + 2α) = sin(2α), the sinusoidal terms cancel out completely:',
        latex: 'V_{rms} = V_m \\left[ \\frac{1}{2\\pi} \\left( \\pi - \\frac{\\sin(2\\pi + 2\\alpha) - \\sin(2\\alpha)}{2} \\right) \\right]^{1/2} = V_m \\left[ \\frac{1}{2\\pi} \\cdot \\pi \\right]^{1/2} = \\frac{V_m}{\\sqrt{2}}',
      },
      {
        title: 'Step 4: Final Closed-Form RMS Result',
        description: 'In continuous conduction without freewheeling, the RMS load voltage is constant and identical to the AC supply RMS voltage:',
        latex: 'V_{rms} = \\frac{V_m}{\\sqrt{2}} = V_s',
      },
    ],
    calculateValues: ({ Vrms, alphaDeg }) => {
      const alphaRad = (alphaDeg * Math.PI) / 180;
      const Vm = Math.sqrt(2) * Vrms;
      const Vdc = (2 * Vm * Math.cos(alphaRad)) / Math.PI;
      const VrmsOut = Vrms;
      const ff = Vdc !== 0 ? Math.abs(VrmsOut / Vdc) : 1;
      const rf = Math.sqrt(Math.max(0, ff * ff - 1));
      const Vripple = Math.sqrt(Math.max(0, VrmsOut * VrmsOut - Vdc * Vdc));
      return { Vdc, Vrms: VrmsOut, formFactor: ff, rippleFactor: rf, rippleVoltage: Vripple };
    },
  },

  // =========================================================================
  // 2. Single-Phase Full-Bridge Controlled (Resistive Load R or with FWD)
  // =========================================================================
  {
    id: '1ph-fb-r',
    name: '1-Phase Full-Bridge Controlled Rectifier (R Load / with FWD)',
    category: '1-phase',
    subCategory: 'Full-Bridge',
    loadCondition: 'Resistive Load (R) OR Inductive Load with Freewheeling Diode (FWD)',
    period: '\\pi',
    periodVal: Math.PI,
    alphaSymbol: '\\alpha',
    waveformType: '1ph-fb-r',
    summaryFormulaVdc: 'V_{dc} = \\frac{V_m}{\\pi}(1 + \\cos\\alpha)',
    summaryFormulaVrms: 'V_{rms} = \\frac{V_m}{\\sqrt{2}}\\sqrt{1 - \\frac{\\alpha}{\\pi} + \\frac{\\sin 2\\alpha}{2\\pi}}',
    description: 'When supplying a resistive load or when a freewheeling diode (D_FW) is connected across an inductive load, the output voltage cannot go negative. The output conducts from α to π, and remains zero from π to π+α.',
    vdcSteps: [
      {
        title: 'Step 1: Piecewise Interval Integration',
        description: 'Output voltage is v_o(θ) = V_m sin(θ) for θ ∈ [α, π], and v_o(θ) = 0 for θ ∈ [π, π+α]:',
        latex: 'V_{dc} = \\frac{1}{\\pi} \\left[ \\int_{\\alpha}^{\\pi} V_m \\sin\\theta \\, d\\theta + \\int_{\\pi}^{\\pi + \\alpha} 0 \\, d\\theta \\right]',
      },
      {
        title: 'Step 2: Integrate Sine over Non-Zero Interval',
        description: 'Integrating from α to π:',
        latex: 'V_{dc} = \\frac{V_m}{\\pi} \\left[ -\\cos\\theta \\right]_{\\alpha}^{\\pi} = \\frac{V_m}{\\pi} \\left( -\\cos(\\pi) - (-\\cos\\alpha) \\right)',
      },
      {
        title: 'Step 3: Substitute cos(π) = -1',
        description: 'Simplifying the boundary terms:',
        latex: 'V_{dc} = \\frac{V_m}{\\pi} \\left( -(-1) + \\cos\\alpha \\right) = \\frac{V_m}{\\pi} (1 + \\cos\\alpha) = \\frac{\\sqrt{2}V_s}{\\pi} (1 + \\cos\\alpha)',
      },
    ],
    vrmsSteps: [
      {
        title: 'Step 1: RMS Definition over [α, π]',
        description: 'Applying the RMS integral over the active interval:',
        latex: 'V_{rms} = \\left[ \\frac{1}{\\pi} \\int_{\\alpha}^{\\pi} V_m^2 \\sin^2\\theta \\, d\\theta \\right]^{1/2} = V_m \\left[ \\frac{1}{2\\pi} \\int_{\\alpha}^{\\pi} (1 - \\cos(2\\theta)) \\, d\\theta \\right]^{1/2}',
      },
      {
        title: 'Step 2: Integrate and Apply Limits',
        description: 'Evaluating θ - sin(2θ)/2 from α to π:',
        latex: 'V_{rms} = V_m \\left[ \\frac{1}{2\\pi} \\left( (\\pi - \\alpha) - \\frac{\\sin(2\\pi) - \\sin(2\\alpha)}{2} \\right) \\right]^{1/2} = V_m \\left[ \\frac{1}{2\\pi} \\left( \\pi - \\alpha + \\frac{\\sin(2\\alpha)}{2} \\right) \\right]^{1/2}',
      },
      {
        title: 'Step 3: Final Closed-Form Expression',
        description: 'Normalized with AC source RMS voltage V_s = V_m / √2:',
        latex: 'V_{rms} = \\frac{V_m}{\\sqrt{2}} \\sqrt{ 1 - \\frac{\\alpha}{\\pi} + \\frac{\\sin(2\\alpha)}{2\\pi} } = V_s \\sqrt{ 1 - \\frac{\\alpha}{\\pi} + \\frac{\\sin(2\\alpha)}{2\\pi} }',
      },
    ],
    calculateValues: ({ Vrms, alphaDeg }) => {
      const alphaRad = (alphaDeg * Math.PI) / 180;
      const Vm = Math.sqrt(2) * Vrms;
      const Vdc = (Vm / Math.PI) * (1 + Math.cos(alphaRad));
      const term = 1 - alphaRad / Math.PI + Math.sin(2 * alphaRad) / (2 * Math.PI);
      const VrmsOut = Vrms * Math.sqrt(Math.max(0, term));
      const ff = Vdc !== 0 ? Math.abs(VrmsOut / Vdc) : 1;
      const rf = Math.sqrt(Math.max(0, ff * ff - 1));
      const Vripple = Math.sqrt(Math.max(0, VrmsOut * VrmsOut - Vdc * Vdc));
      return { Vdc, Vrms: VrmsOut, formFactor: ff, rippleFactor: rf, rippleVoltage: Vripple };
    },
  },

  // =========================================================================
  // 3. Single-Phase Full-Bridge Discontinuous Conduction (RL Load, Extinction β)
  // =========================================================================
  {
    id: '1ph-fb-disc',
    name: '1-Phase Full-Bridge Controlled (Discontinuous Conduction, RL Load)',
    category: '1-phase',
    subCategory: 'Full-Bridge',
    loadCondition: 'RL Load with Discontinuous Current (Extinguishes at β < π+α)',
    period: '\\pi',
    periodVal: Math.PI,
    alphaSymbol: '\\alpha',
    betaSymbol: '\\beta',
    waveformType: '1ph-fb-disc',
    summaryFormulaVdc: 'V_{dc} = \\frac{V_m}{\\pi}(\\cos\\alpha - \\cos\\beta)',
    summaryFormulaVrms: 'V_{rms} = \\frac{V_m}{\\sqrt{2\\pi}}\\sqrt{(\\beta - \\alpha) - \\frac{\\sin 2\\beta - \\sin 2\\alpha}{2}}',
    description: 'In moderate inductance loads without FWD, current starts at firing angle α, continues into the negative voltage region due to stored inductive energy, and extinguishes at angle β (where β < π+α). Voltage remains zero for β ≤ θ ≤ π+α.',
    vdcSteps: [
      {
        title: 'Step 1: Integration Over Conduction Interval [α, β]',
        description: 'Since current conducts from α to β and remains zero until the next gate pulse at π+α:',
        latex: 'V_{dc} = \\frac{1}{\\pi} \\int_{\\alpha}^{\\beta} V_m \\sin\\theta \\, d\\theta = \\frac{V_m}{\\pi} \\left[ -\\cos\\theta \\right]_{\\alpha}^{\\beta}',
      },
      {
        title: 'Step 2: Evaluate at Limits α and β',
        description: 'Applying fundamental theorem of calculus:',
        latex: 'V_{dc} = \\frac{V_m}{\\pi} \\left( -\\cos\\beta - (-\\cos\\alpha) \\right) = \\frac{V_m}{\\pi} (\\cos\\alpha - \\cos\\beta)',
      },
      {
        title: 'Step 3: Extinction Angle β Determination',
        description: 'The extinction angle β is the transcendental root of the load current equation i(β) = 0:',
        latex: 'i(\\beta) = \\frac{V_m}{Z} \\left[ \\sin(\\beta - \\phi) - \\sin(\\alpha - \\phi) e^{-\\frac{\\beta - \\alpha}{\\tan\\phi}} \\right] = 0, \\quad \\phi = \\tan^{-1}\\left(\\frac{\\omega L}{R}\\right)',
      },
    ],
    vrmsSteps: [
      {
        title: 'Step 1: RMS Integral with Extinction Limit β',
        description: 'Integrating v_o²(θ) from α to β:',
        latex: 'V_{rms} = \\left[ \\frac{1}{\\pi} \\int_{\\alpha}^{\\beta} V_m^2 \\sin^2\\theta \\, d\\theta \\right]^{1/2} = V_m \\left[ \\frac{1}{2\\pi} \\int_{\\alpha}^{\\beta} (1 - \\cos(2\\theta)) \\, d\\theta \\right]^{1/2}',
      },
      {
        title: 'Step 2: Integrate Trigonometric Identity',
        description: 'Evaluating limits at α and β:',
        latex: 'V_{rms} = \\frac{V_m}{\\sqrt{2\\pi}} \\left[ (\\beta - \\alpha) - \\frac{\\sin(2\\beta) - \\sin(2\\alpha)}{2} \\right]^{1/2}',
      },
    ],
    calculateValues: ({ Vrms, alphaDeg, R = 20, L = 45, freq = 50 }) => {
      const betaDeg = solveExtinctionAngle(alphaDeg, R, L, freq);
      const alphaRad = (alphaDeg * Math.PI) / 180;
      const betaRad = (betaDeg * Math.PI) / 180;
      const Vm = Math.sqrt(2) * Vrms;
      const Vdc = (Vm / Math.PI) * (Math.cos(alphaRad) - Math.cos(betaRad));
      const term = (betaRad - alphaRad) - (Math.sin(2 * betaRad) - Math.sin(2 * alphaRad)) / 2;
      const VrmsOut = (Vm / Math.sqrt(2 * Math.PI)) * Math.sqrt(Math.max(0, term));
      const ff = Vdc !== 0 ? Math.abs(VrmsOut / Vdc) : 1;
      const rf = Math.sqrt(Math.max(0, ff * ff - 1));
      const Vripple = Math.sqrt(Math.max(0, VrmsOut * VrmsOut - Vdc * Vdc));
      return {
        Vdc,
        Vrms: VrmsOut,
        formFactor: ff,
        rippleFactor: rf,
        rippleVoltage: Vripple,
        betaCalc: betaDeg,
        gammaCalc: Math.round((betaDeg - alphaDeg) * 10) / 10,
      };
    },
  },

  // =========================================================================
  // 4. Single-Phase Semi-Converter (Half-Controlled Bridge)
  // =========================================================================
  {
    id: '1ph-semi',
    name: '1-Phase Semi-Converter (Half-Controlled Bridge)',
    category: '1-phase',
    subCategory: 'Semi-Converter',
    loadCondition: 'RL Load (Intrinsic Freewheeling Action)',
    period: '\\pi',
    periodVal: Math.PI,
    alphaSymbol: '\\alpha',
    waveformType: '1ph-semi',
    summaryFormulaVdc: 'V_{dc} = \\frac{V_m}{\\pi}(1 + \\cos\\alpha)',
    summaryFormulaVrms: 'V_{rms} = \\frac{V_m}{\\sqrt{2}}\\sqrt{1 - \\frac{\\alpha}{\\pi} + \\frac{\\sin 2\\alpha}{2\\pi}}',
    description: 'A semi-converter uses Thyristors for top switches (S1, S3) and Diodes for bottom switches (S2, S4). When AC voltage reverses at θ = π, diode D4 naturally turns ON, freewheeling the load current with S1 at zero output voltage (v_o = 0) until S3 is fired at π+α.',
    vdcSteps: [
      {
        title: 'Step 1: Conduction Intervals',
        description: '• Interval 1 [α to π]: S1 and D2 conduct supply voltage v_o = V_m sin(θ).\n• Interval 2 [π to π+α]: S1 and D4 freewheel together, clamping v_o = 0.',
        latex: 'V_{dc} = \\frac{1}{\\pi} \\left[ \\int_{\\alpha}^{\\pi} V_m \\sin\\theta \\, d\\theta + \\int_{\\pi}^{\\pi + \\alpha} 0 \\, d\\theta \\right]',
      },
      {
        title: 'Step 2: Integration and Simplification',
        description: 'Integral evaluates to:',
        latex: 'V_{dc} = \\frac{V_m}{\\pi} [-\\cos\\theta]_{\\alpha}^{\\pi} = \\frac{V_m}{\\pi}(1 + \\cos\\alpha)',
      },
    ],
    vrmsSteps: [
      {
        title: 'Step 1: RMS Derivation',
        description: 'Since v_o = 0 during freewheeling, the RMS calculation is identical to the resistive load bridge:',
        latex: 'V_{rms} = \\left[ \\frac{1}{\\pi} \\int_{\\alpha}^{\\pi} V_m^2 \\sin^2\\theta \\, d\\theta \\right]^{1/2} = \\frac{V_m}{\\sqrt{2}} \\sqrt{1 - \\frac{\\alpha}{\\pi} + \\frac{\\sin(2\\alpha)}{2\\pi}}',
      },
    ],
    calculateValues: ({ Vrms, alphaDeg }) => {
      const alphaRad = (alphaDeg * Math.PI) / 180;
      const Vm = Math.sqrt(2) * Vrms;
      const Vdc = (Vm / Math.PI) * (1 + Math.cos(alphaRad));
      const term = 1 - alphaRad / Math.PI + Math.sin(2 * alphaRad) / (2 * Math.PI);
      const VrmsOut = Vrms * Math.sqrt(Math.max(0, term));
      const ff = Vdc !== 0 ? Math.abs(VrmsOut / Vdc) : 1;
      const rf = Math.sqrt(Math.max(0, ff * ff - 1));
      const Vripple = Math.sqrt(Math.max(0, VrmsOut * VrmsOut - Vdc * Vdc));
      return { Vdc, Vrms: VrmsOut, formFactor: ff, rippleFactor: rf, rippleVoltage: Vripple };
    },
  },

  // =========================================================================
  // 5. Single-Phase Half-Wave Controlled Converter (RL Load with Extinction Angle β)
  // =========================================================================
  {
    id: '1ph-hw-rl',
    name: '1-Phase Half-Wave Controlled Rectifier (RL Load with Extinction β)',
    category: '1-phase',
    subCategory: 'Half-Wave',
    loadCondition: 'RL Inductive Load with Extinction Angle β (Discontinuous Conduction)',
    period: '2\\pi',
    periodVal: 2 * Math.PI,
    alphaSymbol: '\\alpha',
    betaSymbol: '\\beta',
    waveformType: '1ph-hw-rl',
    summaryFormulaVdc: 'V_{dc} = \\frac{V_m}{2\\pi}(\\cos\\alpha - \\cos\\beta)',
    summaryFormulaVrms: 'V_{rms} = \\frac{V_m}{2\\sqrt{\\pi}}\\sqrt{(\\beta - \\alpha) - \\frac{\\sin 2\\beta - \\sin 2\\alpha}{2}}',
    description: 'When supplying an inductive RL load without a freewheeling diode, thyristor conduction begins at firing angle α and continues into the negative half-cycle (π < θ ≤ β) due to the inductor self-induced back-EMF, extinguishing at angle β where the load current naturally decays to zero.',
    vdcSteps: [
      {
        title: 'Step 1: Circuit Differential Equation & General Current Solution',
        description: 'Applying Kirchhoff\'s Voltage Law (KVL) during thyristor conduction for α ≤ θ ≤ β (where v_s(θ) = V_m sin(θ)):\n• L di/dt + R i = V_m sin(ωt)\n• di/dθ + (R / ωL) i = (V_m / ωL) sin(θ)\n\nThe complete current solution is the sum of steady-state current i_ss(θ) and transient current i_tr(θ):',
        latex: 'i(\\theta) = i_{ss}(\\theta) + i_{tr}(\\theta) = \\frac{V_m}{Z} \\sin(\\theta - \\phi) + A e^{-\\frac{\\theta}{\\tan\\phi}}',
        note: 'where circuit impedance Z = √(R² + (ωL)²), phase angle φ = tan⁻¹(ωL / R), and tanφ = ωL/R = ωτ.',
      },
      {
        title: 'Step 2: Boundary Condition at Firing Instant θ = α',
        description: 'Assuming discontinuous mode where initial current at firing angle α is zero (i(α) = 0):',
        latex: 'i(\\alpha) = 0 \\implies \\frac{V_m}{Z} \\sin(\\alpha - \\phi) + A e^{-\\frac{\\alpha}{\\tan\\phi}} = 0 \\implies A = -\\frac{V_m}{Z} \\sin(\\alpha - \\phi) e^{\\frac{\\alpha}{\\tan\\phi}}',
      },
      {
        title: 'Step 3: Complete Instantaneous Load Current Equation',
        description: 'Substituting the constant A back into the current equation gives the instantaneous current for α ≤ θ ≤ β:',
        latex: 'i(\\theta) = \\frac{V_m}{Z} \\left[ \\sin(\\theta - \\phi) - \\sin(\\alpha - \\phi) e^{-\\frac{\\theta - \\alpha}{\\tan\\phi}} \\right], \\quad \\alpha \\le \\theta \\le \\beta',
      },
      {
        title: 'Step 4: Transcendental Equation for Extinction Angle β',
        description: 'The thyristor commutates OFF when the current drops to zero at the extinction angle θ = β (i.e. i(β) = 0). Setting i(β) = 0 yields the fundamental transcendental equation:',
        latex: '\\sin(\\beta - \\phi) - \\sin(\\alpha - \\phi) e^{-\\frac{\\beta - \\alpha}{\\tan\\phi}} = 0',
        note: 'Because stored magnetic energy in the inductor (½Li²) discharges across the resistor, conduction extends past π (π < β < 2π). Conduction angle γ = β - α.',
      },
      {
        title: 'Step 5: Average Output Voltage (V_dc) Integration',
        description: 'The repetition period is T₀ = 2π. The output voltage is v_o(θ) = V_m sin(θ) for α ≤ θ ≤ β, and v_o(θ) = 0 for β ≤ θ ≤ 2π+α:',
        latex: 'V_{dc} = \\frac{1}{2\\pi} \\int_{\\alpha}^{\\beta} V_m \\sin\\theta \\, d\\theta = \\frac{V_m}{2\\pi} \\left[ -\\cos\\theta \\right]_{\\alpha}^{\\beta} = \\frac{V_m}{2\\pi} (\\cos\\alpha - \\cos\\beta)',
      },
      {
        title: 'Step 6: Closed-Form Expression with AC RMS Source Voltage',
        description: 'Expressed in terms of peak voltage V_m = √2 V_s:',
        latex: 'V_{dc} = \\frac{V_m}{2\\pi} (\\cos\\alpha - \\cos\\beta) = \\frac{\\sqrt{2}V_s}{2\\pi} (\\cos\\alpha - \\cos\\beta) = \\frac{V_s}{\\sqrt{2}\\pi} (\\cos\\alpha - \\cos\\beta)',
      },
    ],
    vrmsSteps: [
      {
        title: 'Step 1: Fundamental RMS Voltage Integral over T₀ = 2π',
        description: 'Applying Root-Mean-Square integration over the conduction interval [α, β]:',
        latex: 'V_{rms} = \\sqrt{ \\frac{1}{2\\pi} \\int_{\\alpha}^{\\beta} V_m^2 \\sin^2\\theta \\, d\\theta } = V_m \\left[ \\frac{1}{4\\pi} \\int_{\\alpha}^{\\beta} (1 - \\cos(2\\theta)) \\, d\\theta \\right]^{1/2}',
      },
      {
        title: 'Step 2: Definite Integration and Boundary Limits Evaluation',
        description: 'Evaluating θ - sin(2θ)/2 at upper limit β and lower limit α:',
        latex: 'V_{rms} = V_m \\left[ \\frac{1}{4\\pi} \\left( [\\theta]_{\\alpha}^{\\beta} - \\left[ \\frac{\\sin(2\\theta)}{2} \\right]_{\\alpha}^{\\beta} \\right) \\right]^{1/2} = V_m \\left[ \\frac{1}{4\\pi} \\left( (\\beta - \\alpha) - \\frac{\\sin(2\\beta) - \\sin(2\\alpha)}{2} \\right) \\right]^{1/2}',
      },
      {
        title: 'Step 3: Final Closed-Form RMS Output Voltage Result',
        description: 'Written in terms of peak voltage V_m and source RMS voltage V_s = V_m / √2:',
        latex: 'V_{rms} = \\frac{V_m}{2\\sqrt{\\pi}} \\sqrt{ (\\beta - \\alpha) - \\frac{\\sin(2\\beta) - \\sin(2\\alpha)}{2} } = \\frac{V_s}{\\sqrt{2\\pi}} \\sqrt{ (\\beta - \\alpha) - \\frac{\\sin(2\\beta) - \\sin(2\\alpha)}{2} }',
      },
    ],
    calculateValues: ({ Vrms, alphaDeg, R = 20, L = 45, freq = 50 }) => {
      const betaDeg = solveExtinctionAngle(alphaDeg, R, L, freq);
      const alphaRad = (alphaDeg * Math.PI) / 180;
      const betaRad = (betaDeg * Math.PI) / 180;
      const Vm = Math.sqrt(2) * Vrms;
      const Vdc = (Vm / (2 * Math.PI)) * (Math.cos(alphaRad) - Math.cos(betaRad));
      const term = (betaRad - alphaRad) - (Math.sin(2 * betaRad) - Math.sin(2 * alphaRad)) / 2;
      const VrmsOut = (Vm / (2 * Math.sqrt(Math.PI))) * Math.sqrt(Math.max(0, term));
      const ff = Vdc !== 0 ? Math.abs(VrmsOut / Vdc) : 1;
      const rf = Math.sqrt(Math.max(0, ff * ff - 1));
      const Vripple = Math.sqrt(Math.max(0, VrmsOut * VrmsOut - Vdc * Vdc));
      return {
        Vdc,
        Vrms: VrmsOut,
        formFactor: ff,
        rippleFactor: rf,
        rippleVoltage: Vripple,
        betaCalc: betaDeg,
        gammaCalc: Math.round((betaDeg - alphaDeg) * 10) / 10,
      };
    },
  },

  // =========================================================================
  // 6. Single-Phase Half-Wave Diode Rectifier (RL Load with Extinction Angle β)
  // =========================================================================
  {
    id: '1ph-hw-diode-rl',
    name: '1-Phase Half-Wave Diode Rectifier (RL Load with Extinction β)',
    category: '1-phase',
    subCategory: 'Half-Wave',
    loadCondition: 'Uncontrolled Diode (α = 0°) with Inductive RL Load',
    period: '2\\pi',
    periodVal: 2 * Math.PI,
    alphaSymbol: '0^\\circ',
    betaSymbol: '\\beta',
    waveformType: '1ph-hw-rl',
    summaryFormulaVdc: 'V_{dc} = \\frac{V_m}{2\\pi}(1 - \\cos\\beta)',
    summaryFormulaVrms: 'V_{rms} = \\frac{V_m}{2\\sqrt{\\pi}}\\sqrt{\\beta - \\frac{\\sin 2\\beta}{2}}',
    description: 'An uncontrolled diode starts conducting automatically at θ = 0° when forward-biased. Due to energy storage in the load inductance L, the diode remains in conduction beyond 180° into the negative voltage region (180° < θ ≤ β) until the stored magnetic energy is dissipated and current reaches zero at extinction angle β.',
    vdcSteps: [
      {
        title: 'Step 1: Diode Current Differential Equation (α = 0°)',
        description: 'For an uncontrolled diode, firing delay is zero (α = 0°). Substituting α = 0 into the KVL solution gives:',
        latex: 'i(\\theta) = \\frac{V_m}{Z} \\left[ \\sin(\\theta - \\phi) + \\sin\\phi \\, e^{-\\frac{\\theta}{\\tan\\phi}} \\right], \\quad 0 \\le \\theta \\le \\beta',
        note: 'Impedance Z = √(R² + (ωL)²), phase angle φ = tan⁻¹(ωL / R), and tanφ = ωL/R.',
      },
      {
        title: 'Step 2: Transcendental Equation for Diode Extinction Angle β',
        description: 'The diode stops conducting when i(β) = 0. Substituting θ = β:',
        latex: '\\sin(\\beta - \\phi) + \\sin\\phi \\, e^{-\\frac{\\beta}{\\tan\\phi}} = 0',
        note: 'Because stored inductive energy acts as a temporary voltage source, β is always strictly greater than π (180° < β < 360°).',
      },
      {
        title: 'Step 3: Average Output Voltage (V_dc) Integration with α = 0',
        description: 'Integrating from θ = 0 to extinction angle θ = β over one full period T₀ = 2π:',
        latex: 'V_{dc} = \\frac{1}{2\\pi} \\int_{0}^{\\beta} V_m \\sin\\theta \\, d\\theta = \\frac{V_m}{2\\pi} [-\\cos\\theta]_{0}^{\\beta} = \\frac{V_m}{2\\pi} (-\\cos\\beta - (-\\cos 0)) = \\frac{V_m}{2\\pi} (1 - \\cos\\beta)',
      },
      {
        title: 'Step 4: Final Expression with RMS Input Voltage',
        description: 'Expressed using V_m = √2 V_s:',
        latex: 'V_{dc} = \\frac{\\sqrt{2}V_s}{2\\pi} (1 - \\cos\\beta) = \\frac{V_s}{\\sqrt{2}\\pi} (1 - \\cos\\beta)',
      },
    ],
    vrmsSteps: [
      {
        title: 'Step 1: RMS Voltage Definition with Limits 0 to β',
        description: 'Root-Mean-Square calculation over period 2π:',
        latex: 'V_{rms} = \\sqrt{ \\frac{1}{2\\pi} \\int_{0}^{\\beta} V_m^2 \\sin^2\\theta \\, d\\theta } = V_m \\left[ \\frac{1}{4\\pi} \\int_{0}^{\\beta} (1 - \\cos(2\\theta)) \\, d\\theta \\right]^{1/2}',
      },
      {
        title: 'Step 2: Evaluate Definite Integral at 0 and β',
        description: 'Carrying out the integration and substituting lower limit 0:',
        latex: 'V_{rms} = V_m \\left[ \\frac{1}{4\\pi} \\left( \\beta - \\frac{\\sin(2\\beta)}{2} \\right) \\right]^{1/2} = \\frac{V_m}{2\\sqrt{\\pi}} \\sqrt{ \\beta - \\frac{\\sin(2\\beta)}{2} }',
      },
    ],
    calculateValues: ({ Vrms, R = 20, L = 45, freq = 50 }) => {
      const betaDeg = solveExtinctionAngle(0, R, L, freq);
      const betaRad = (betaDeg * Math.PI) / 180;
      const Vm = Math.sqrt(2) * Vrms;
      const Vdc = (Vm / (2 * Math.PI)) * (1 - Math.cos(betaRad));
      const term = betaRad - Math.sin(2 * betaRad) / 2;
      const VrmsOut = (Vm / (2 * Math.sqrt(Math.PI))) * Math.sqrt(Math.max(0, term));
      const ff = Vdc !== 0 ? Math.abs(VrmsOut / Vdc) : 1;
      const rf = Math.sqrt(Math.max(0, ff * ff - 1));
      const Vripple = Math.sqrt(Math.max(0, VrmsOut * VrmsOut - Vdc * Vdc));
      return {
        Vdc,
        Vrms: VrmsOut,
        formFactor: ff,
        rippleFactor: rf,
        rippleVoltage: Vripple,
        betaCalc: betaDeg,
        gammaCalc: betaDeg,
      };
    },
  },

  // =========================================================================
  // 7. Single-Phase Half-Wave Controlled Converter (R Load)
  // =========================================================================
  {
    id: '1ph-hw-r',
    name: '1-Phase Half-Wave Controlled Rectifier (R Load)',
    category: '1-phase',
    subCategory: 'Half-Wave',
    loadCondition: 'Resistive Load (R)',
    period: '2\\pi',
    periodVal: 2 * Math.PI,
    alphaSymbol: '\\alpha',
    waveformType: '1ph-hw-r',
    summaryFormulaVdc: 'V_{dc} = \\frac{V_m}{2\\pi}(1 + \\cos\\alpha)',
    summaryFormulaVrms: 'V_{rms} = \\frac{V_m}{2}\\sqrt{1 - \\frac{\\alpha}{\\pi} + \\frac{\\sin 2\\alpha}{2\\pi}}',
    description: 'Single thyristor conducts during the positive half-cycle from α to π. Negative half-cycle is blocked completely (v_o = 0 from π to 2π+α). Repetition period is 2π.',
    vdcSteps: [
      {
        title: 'Step 1: Integration over Full 2π Period',
        description: 'Output is non-zero only between α and π:',
        latex: 'V_{dc} = \\frac{1}{2\\pi} \\int_{\\alpha}^{\\pi} V_m \\sin\\theta \\, d\\theta = \\frac{V_m}{2\\pi} [-\\cos\\theta]_{\\alpha}^{\\pi}',
      },
      {
        title: 'Step 2: Boundary Evaluation',
        description: 'Evaluating at π and α:',
        latex: 'V_{dc} = \\frac{V_m}{2\\pi} (-\\cos\\pi - (-\\cos\\alpha)) = \\frac{V_m}{2\\pi} (1 + \\cos\\alpha)',
      },
    ],
    vrmsSteps: [
      {
        title: 'Step 1: RMS Integral with Period 2π',
        description: 'Evaluating RMS over 2π:',
        latex: 'V_{rms} = \\left[ \\frac{1}{2\\pi} \\int_{\\alpha}^{\\pi} V_m^2 \\sin^2\\theta \\, d\\theta \\right]^{1/2} = V_m \\left[ \\frac{1}{4\\pi} \\int_{\\alpha}^{\\pi} (1 - \\cos 2\\theta) \\, d\\theta \\right]^{1/2}',
      },
      {
        title: 'Step 2: Final Result',
        description: 'Carrying out integration:',
        latex: 'V_{rms} = \\frac{V_m}{2} \\sqrt{ 1 - \\frac{\\alpha}{\\pi} + \\frac{\\sin(2\\alpha)}{2\\pi} } = \\frac{V_s}{\\sqrt{2}} \\sqrt{ 1 - \\frac{\\alpha}{\\pi} + \\frac{\\sin(2\\alpha)}{2\\pi} }',
      },
    ],
    calculateValues: ({ Vrms, alphaDeg }) => {
      const alphaRad = (alphaDeg * Math.PI) / 180;
      const Vm = Math.sqrt(2) * Vrms;
      const Vdc = (Vm / (2 * Math.PI)) * (1 + Math.cos(alphaRad));
      const term = 1 - alphaRad / Math.PI + Math.sin(2 * alphaRad) / (2 * Math.PI);
      const VrmsOut = (Vm / 2) * Math.sqrt(Math.max(0, term));
      const ff = Vdc !== 0 ? Math.abs(VrmsOut / Vdc) : 1;
      const rf = Math.sqrt(Math.max(0, ff * ff - 1));
      const Vripple = Math.sqrt(Math.max(0, VrmsOut * VrmsOut - Vdc * Vdc));
      return { Vdc, Vrms: VrmsOut, formFactor: ff, rippleFactor: rf, rippleVoltage: Vripple };
    },
  },

  // =========================================================================
  // 6. Three-Phase Full-Bridge Controlled Converter (6-Pulse)
  // =========================================================================
  {
    id: '3ph-fb-ctrl',
    name: '3-Phase Full-Bridge Controlled Converter (6-Pulse Rectifier)',
    category: '3-phase',
    subCategory: 'Full-Bridge',
    loadCondition: 'RL Continuous Conduction (Highly Inductive Load)',
    period: '\\pi/3',
    periodVal: Math.PI / 3,
    alphaSymbol: '\\alpha',
    waveformType: '3ph-fb-ctrl',
    summaryFormulaVdc: 'V_{dc} = \\frac{3V_{m,LL}}{\\pi}\\cos\\alpha = \\frac{3\\sqrt{3}V_{m,ph}}{\\pi}\\cos\\alpha',
    summaryFormulaVrms: 'V_{rms} = V_{m,LL}\\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{4\\pi}\\cos 2\\alpha}',
    description: 'Six thyristors fire sequentially every 60° (π/3). Commutation occurs naturally relative to 30° phase crossover. Conduction interval spans 60°, applying highest line-to-line voltage to the load.',
    vdcSteps: [
      {
        title: 'Step 1: Conduction Interval & Symmetry',
        description: 'The output repeats every T₀ = π/3 (60°). Symmetrical line-to-line peak voltage v_LL(θ) = V_{m,LL} cos(θ) is integrated over [-π/6 + α, π/6 + α]:',
        latex: 'V_{dc} = \\frac{1}{T_0} \\int_{-\\pi/6 + \\alpha}^{\\pi/6 + \\alpha} v_{LL}(\\theta) \\, d\\theta = \\frac{3}{\\pi} \\int_{-\\pi/6 + \\alpha}^{\\pi/6 + \\alpha} V_{m,LL} \\cos\\theta \\, d\\theta',
      },
      {
        title: 'Step 2: Integration of Line-to-Line Cosine',
        description: 'Carrying out the definite integration:',
        latex: 'V_{dc} = \\frac{3V_{m,LL}}{\\pi} [\\sin\\theta]_{-\\pi/6 + \\alpha}^{\\pi/6 + \\alpha} = \\frac{3V_{m,LL}}{\\pi} \\left( \\sin(\\pi/6 + \\alpha) - \\sin(-\\pi/6 + \\alpha) \\right)',
      },
      {
        title: 'Step 3: Sum-to-Product Identity',
        description: 'Using sin(A + B) - sin(B - A) = 2 sin(A) cos(B) where A = π/6 and B = α:',
        latex: 'V_{dc} = \\frac{3V_{m,LL}}{\\pi} \\left( 2 \\sin(\\pi/6) \\cos\\alpha \\right) = \\frac{3V_{m,LL}}{\\pi} \\left( 2 \\cdot \\frac{1}{2} \\cos\\alpha \\right) = \\frac{3V_{m,LL}}{\\pi} \\cos\\alpha',
      },
      {
        title: 'Step 4: Express in Phase & Line RMS Values',
        description: 'Since V_{m,LL} = √3 V_{m,ph} = √3 (√2 V_{ph,rms}) = √6 V_{ph,rms} = √2 V_{LL,rms}:',
        latex: 'V_{dc} = \\frac{3\\sqrt{3}V_{m,ph}}{\\pi}\\cos\\alpha = \\frac{3\\sqrt{6}}{\\pi}V_{ph,rms}\\cos\\alpha = \\frac{3\\sqrt{2}}{\\pi}V_{LL,rms}\\cos\\alpha \\approx 1.350 \\, V_{LL,rms} \\cos\\alpha',
      },
    ],
    vrmsSteps: [
      {
        title: 'Step 1: RMS Definition over 60° (π/3) Window',
        description: 'Applying root-mean-square formula:',
        latex: 'V_{rms} = \\left[ \\frac{3}{\\pi} \\int_{-\\pi/6 + \\alpha}^{\\pi/6 + \\alpha} V_{m,LL}^2 \\cos^2\\theta \\, d\\theta \\right]^{1/2} = V_{m,LL} \\left[ \\frac{3}{2\\pi} \\int_{-\\pi/6 + \\alpha}^{\\pi/6 + \\alpha} (1 + \\cos 2\\theta) \\, d\\theta \\right]^{1/2}',
      },
      {
        title: 'Step 2: Evaluate the Limits',
        description: 'Integrating (1 + cos 2θ):',
        latex: 'V_{rms} = V_{m,LL} \\left[ \\frac{3}{2\\pi} \\left( \\frac{\\pi}{3} + \\frac{\\sin(\\pi/3 + 2\\alpha) - \\sin(-\\pi/3 + 2\\alpha)}{2} \\right) \\right]^{1/2}',
      },
      {
        title: 'Step 3: Final 6-Pulse RMS Expression',
        description: 'Using sin(π/3 + 2α) - sin(2α - π/3) = 2 sin(π/3) cos(2α) = √3 cos(2α):',
        latex: 'V_{rms} = V_{m,LL} \\sqrt{ \\frac{1}{2} + \\frac{3\\sqrt{3}}{4\\pi}\\cos(2\\alpha) } = V_{LL,rms} \\sqrt{ 1 + \\frac{3\\sqrt{3}}{2\\pi}\\cos(2\\alpha) }',
      },
    ],
    calculateValues: ({ Vrms, alphaDeg }) => {
      const alphaRad = (alphaDeg * Math.PI) / 180;
      const Vm_ph = Math.sqrt(2) * Vrms;
      const Vm_LL = Math.sqrt(3) * Vm_ph;
      const VLL_rms = Math.sqrt(3) * Vrms;
      const Vdc = (3 * Vm_LL * Math.cos(alphaRad)) / Math.PI;
      const term = 0.5 + (3 * Math.sqrt(3) * Math.cos(2 * alphaRad)) / (4 * Math.PI);
      const VrmsOut = Vm_LL * Math.sqrt(Math.max(0, term));
      const ff = Vdc !== 0 ? Math.abs(VrmsOut / Vdc) : 1;
      const rf = Math.sqrt(Math.max(0, ff * ff - 1));
      const Vripple = Math.sqrt(Math.max(0, VrmsOut * VrmsOut - Vdc * Vdc));
      return { Vdc, Vrms: VrmsOut, formFactor: ff, rippleFactor: rf, rippleVoltage: Vripple };
    },
  },

  // =========================================================================
  // 7. Three-Phase Diode Bridge Rectifier (Uncontrolled 6-Pulse)
  // =========================================================================
  {
    id: '3ph-fb-diode',
    name: '3-Phase Diode Bridge Rectifier (Uncontrolled 6-Pulse)',
    category: '3-phase',
    subCategory: 'Full-Bridge',
    loadCondition: 'Natural Diode Commutation (α = 0°)',
    period: '\\pi/3',
    periodVal: Math.PI / 3,
    alphaSymbol: '0^\\circ',
    waveformType: '3ph-fb-diode',
    summaryFormulaVdc: 'V_{dc} = \\frac{3V_{m,LL}}{\\pi} \\approx 1.350 \\, V_{LL,rms}',
    summaryFormulaVrms: 'V_{rms} = V_{LL,rms}\\sqrt{1 + \\frac{3\\sqrt{3}}{2\\pi}} \\approx 1.3516 \\, V_{LL,rms}',
    description: 'Diodes commutate naturally at the 30° voltage envelope intersections without firing delay (α = 0°). DC output contains very low intrinsic 6-pulse ripple (4.2%).',
    vdcSteps: [
      {
        title: 'Step 1: Evaluate 6-Pulse Integral at α = 0',
        description: 'Substituting α = 0 into the general 6-pulse formula:',
        latex: 'V_{dc} = \\frac{3V_{m,LL}}{\\pi}\\cos(0^\\circ) = \\frac{3V_{m,LL}}{\\pi} = \\frac{3\\sqrt{3}V_{m,ph}}{\\pi}',
      },
      {
        title: 'Step 2: Numerical Coefficients',
        description: 'Expressed in Phase RMS (V_ph) and Line-to-Line RMS (V_LL):',
        latex: 'V_{dc} = \\frac{3\\sqrt{6}}{\\pi} V_{ph,rms} \\approx 2.339 \\, V_{ph,rms} = \\frac{3\\sqrt{2}}{\\pi} V_{LL,rms} \\approx 1.3504 \\, V_{LL,rms}',
      },
    ],
    vrmsSteps: [
      {
        title: 'Step 1: Evaluate RMS at α = 0',
        description: 'Substituting cos(2·0°) = 1:',
        latex: 'V_{rms} = V_{LL,rms} \\sqrt{1 + \\frac{3\\sqrt{3}}{2\\pi}} \\approx V_{LL,rms} \\sqrt{1 + 0.82699} \\approx 1.35166 \\, V_{LL,rms}',
      },
      {
        title: 'Step 2: Form Factor & Ripple Factor',
        description: 'Ripple factor is exceptionally low due to 6-pulse rectification:',
        latex: 'FF = \\frac{V_{rms}}{V_{dc}} = \\frac{1.35166}{1.35047} \\approx 1.00088 \\implies RF = \\sqrt{FF^2 - 1} \\approx 4.20\\%',
      },
    ],
    calculateValues: ({ Vrms }) => {
      const Vm_ph = Math.sqrt(2) * Vrms;
      const Vm_LL = Math.sqrt(3) * Vm_ph;
      const VLL_rms = Math.sqrt(3) * Vrms;
      const Vdc = (3 * Vm_LL) / Math.PI;
      const term = 0.5 + (3 * Math.sqrt(3)) / (4 * Math.PI);
      const VrmsOut = Vm_LL * Math.sqrt(term);
      const ff = VrmsOut / Vdc;
      const rf = Math.sqrt(Math.max(0, ff * ff - 1));
      const Vripple = Math.sqrt(Math.max(0, VrmsOut * VrmsOut - Vdc * Vdc));
      return { Vdc, Vrms: VrmsOut, formFactor: ff, rippleFactor: rf, rippleVoltage: Vripple };
    },
  },

  // =========================================================================
  // 8. Three-Phase Half-Wave Converter (3-Pulse)
  // =========================================================================
  {
    id: '3ph-hw',
    name: '3-Phase Half-Wave Controlled Converter (3-Pulse Rectifier)',
    category: '3-phase',
    subCategory: 'Half-Wave',
    loadCondition: '3-Phase Star Source with Neutral Return',
    period: '2\\pi/3',
    periodVal: (2 * Math.PI) / 3,
    alphaSymbol: '\\alpha',
    waveformType: '3ph-hw',
    summaryFormulaVdc: 'V_{dc} = \\frac{3\\sqrt{3}V_{m,ph}}{2\\pi}\\cos\\alpha',
    summaryFormulaVrms: 'V_{rms} = V_{m,ph}\\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{8\\pi}\\cos 2\\alpha}',
    description: 'Three switches connected to phases A, B, C conduct for 120° (2π/3) each. Natural commutation begins at 30° (π/6) where phases intersect.',
    vdcSteps: [
      {
        title: 'Step 1: Integration over 120° (2π/3) Period',
        description: 'Integrating phase voltage over [π/6 + α, 5π/6 + α]:',
        latex: 'V_{dc} = \\frac{1}{2\\pi/3} \\int_{\\pi/6 + \\alpha}^{5\\pi/6 + \\alpha} V_{m,ph} \\sin\\theta \\, d\\theta = \\frac{3}{2\\pi} V_{m,ph} [-\\cos\\theta]_{\\pi/6 + \\alpha}^{5\\pi/6 + \\alpha}',
      },
      {
        title: 'Step 2: Boundary Simplification',
        description: 'Using cos(5π/6+α) = -cos(π/6-α):',
        latex: 'V_{dc} = \\frac{3V_{m,ph}}{2\\pi} \\left( \\cos(\\pi/6 + \\alpha) - \\cos(5\\pi/6 + \\alpha) \\right) = \\frac{3\\sqrt{3}V_{m,ph}}{2\\pi} \\cos\\alpha = \\frac{3V_{m,LL}}{2\\pi} \\cos\\alpha',
      },
    ],
    vrmsSteps: [
      {
        title: 'Step 1: 3-Pulse RMS Integral',
        description: 'Integrating v_o² over 2π/3:',
        latex: 'V_{rms} = V_{m,ph} \\sqrt{ \\frac{3}{2\\pi} \\int_{\\pi/6 + \\alpha}^{5\\pi/6 + \\alpha} \\sin^2\\theta \\, d\\theta } = V_{m,ph} \\sqrt{ \\frac{1}{2} + \\frac{3\\sqrt{3}}{8\\pi}\\cos(2\\alpha) }',
      },
    ],
    calculateValues: ({ Vrms, alphaDeg }) => {
      const alphaRad = (alphaDeg * Math.PI) / 180;
      const Vm_ph = Math.sqrt(2) * Vrms;
      const Vdc = (3 * Math.sqrt(3) * Vm_ph * Math.cos(alphaRad)) / (2 * Math.PI);
      const term = 0.5 + (3 * Math.sqrt(3) * Math.cos(2 * alphaRad)) / (8 * Math.PI);
      const VrmsOut = Vm_ph * Math.sqrt(Math.max(0, term));
      const ff = Vdc !== 0 ? Math.abs(VrmsOut / Vdc) : 1;
      const rf = Math.sqrt(Math.max(0, ff * ff - 1));
      const Vripple = Math.sqrt(Math.max(0, VrmsOut * VrmsOut - Vdc * Vdc));
      return { Vdc, Vrms: VrmsOut, formFactor: ff, rippleFactor: rf, rippleVoltage: Vripple };
    },
  },
];

/**
 * Match active converter configuration to the most representative derivation case
 */
export function getMatchingDerivationCase(config: ConverterConfig): DerivationCase {
  const is1Ph = config.phaseMode === '1-phase';
  const isFullBridge = config.circuitType === 'full-bridge';
  const isAllDiode = Object.values(config.switches).every((s) => s === 'diode');
  const isSemi = isFullBridge && (
    (config.switches.S1 === 'thyristor' && config.switches.S4 === 'diode') ||
    (config.switches.S3 === 'thyristor' && config.switches.S2 === 'diode')
  );

  if (is1Ph) {
    if (!isFullBridge) {
      if (isAllDiode) {
        if (config.loadType === 'RL' || config.loadParams.L > 0) {
          return DERIVATION_CASES.find((c) => c.id === '1ph-hw-diode-rl') || DERIVATION_CASES[5];
        }
        return DERIVATION_CASES.find((c) => c.id === '1ph-hw-r') || DERIVATION_CASES[6];
      }
      if (config.loadType === 'RL' || config.loadParams.L > 0) {
        return DERIVATION_CASES.find((c) => c.id === '1ph-hw-rl') || DERIVATION_CASES[4];
      }
      return DERIVATION_CASES.find((c) => c.id === '1ph-hw-r') || DERIVATION_CASES[6];
    }
    if (isAllDiode) {
      return DERIVATION_CASES.find((c) => c.id === '1ph-fb-r') || DERIVATION_CASES[1];
    }
    if (isSemi) {
      return DERIVATION_CASES.find((c) => c.id === '1ph-semi') || DERIVATION_CASES[3];
    }
    if (config.hasFWD && config.isFWDActive) {
      return DERIVATION_CASES.find((c) => c.id === '1ph-fb-r') || DERIVATION_CASES[1];
    }
    if (config.loadType === 'R') {
      return DERIVATION_CASES.find((c) => c.id === '1ph-fb-r') || DERIVATION_CASES[1];
    }
    return DERIVATION_CASES.find((c) => c.id === '1ph-fb-cont') || DERIVATION_CASES[0];
  } else {
    // 3-Phase
    if (!isFullBridge) {
      return DERIVATION_CASES.find((c) => c.id === '3ph-hw') || DERIVATION_CASES[9];
    }
    if (isAllDiode) {
      return DERIVATION_CASES.find((c) => c.id === '3ph-fb-diode') || DERIVATION_CASES[8];
    }
    return DERIVATION_CASES.find((c) => c.id === '3ph-fb-ctrl') || DERIVATION_CASES[7];
  }
}
