export type PhaseMode = '1-phase' | '3-phase';
export type CircuitType = 'full-bridge' | 'half-wave';
export type DeviceType = 'diode' | 'thyristor';
export type LoadType = 'R' | 'RL' | 'RLE';

export interface LoadParams {
  R: number; // Ohms
  L: number; // mH
  E: number; // Volts (DC back-EMF)
}

export interface SourceParams {
  Vrms: number; // Volts RMS (e.g. 120V, 230V, 400V)
  frequency: number; // Hz (50 or 60)
}

export interface ConverterConfig {
  phaseMode: PhaseMode;
  circuitType: CircuitType;
  switches: Record<string, DeviceType>; // 'S1', 'S2', 'S3', 'S4', 'S5', 'S6' -> 'diode' | 'thyristor'
  hasFWD: boolean; // Is Freewheeling Diode present in schematic
  isFWDActive: boolean; // Is FWD enabled/conducting capability active
  alpha: number; // Firing angle in degrees (0 - 180)
  loadType: LoadType;
  loadParams: LoadParams;
  sourceParams: SourceParams;
}

export interface SimulationPoint {
  time: number; // seconds
  theta: number; // radians in cycle [0, 2*pi]
  thetaDeg: number; // degrees [0, 360]
  vSourceA: number; // V_an or V_s
  vSourceB: number; // V_bn (for 3-phase)
  vSourceC: number; // V_cn (for 3-phase)
  vSourceLineAB: number; // V_ab
  vSourceLineBC: number; // V_bc
  vSourceLineCA: number; // V_ca
  vLoad: number; // v_o(t)
  iLoad: number; // i_o(t)
  iSource: number; // i_s(t) for phase A
  iSourceB: number; // i_s(t) for phase B
  iSourceC: number; // i_s(t) for phase C
  iFWD: number; // Freewheeling diode current
  switchStates: Record<string, boolean>; // true = ON / conducting, false = OFF / blocking
  switchCurrents: Record<string, number>; // current through switch
  switchVoltages: Record<string, number>; // voltage across switch (anode to cathode)
  gatePulses: Record<string, boolean>; // gate pulse trigger active
  conductingPathName: string; // e.g. "S1 + S2 Conduction", "Freewheeling Diode", "DCM (Zero Current)"
}

export interface HarmonicComponent {
  harmonic: number;
  magnitude: number;
  phase: number;
  percent: number;
}

export interface SimulationResult {
  points: SimulationPoint[];
  vDcAvg: number;
  vRms: number;
  iDcAvg: number;
  iRms: number;
  pLoad: number; // Watts
  sInput: number; // VA
  pf: number; // Power factor
  displacementFactor: number; // cos(phi_1)
  thd: number; // THD % of source current
  rippleFactor: number; // sqrt((Vrms/Vdc)^2 - 1)
  formFactor: number; // Vrms / Vdc
  rectificationEfficiency: number; // (Pdc / Pac) * 100%
  harmonics: HarmonicComponent[];
  isDiscontinuous: boolean;
  theoreticalFormula: {
    title: string;
    formulaVdc: string;
    calculatedVdc: number;
    description: string;
  };
}

export interface CircuitPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  phaseMode: PhaseMode;
  circuitType: CircuitType;
  switches: Record<string, DeviceType>;
  hasFWD: boolean;
  isFWDActive: boolean;
  loadType: LoadType;
  loadParams: LoadParams;
  alpha: number;
}
