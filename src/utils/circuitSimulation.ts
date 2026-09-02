import { ConverterConfig, SimulationPoint, SimulationResult, HarmonicComponent } from '../types';

export function runCircuitSimulation(config: ConverterConfig): SimulationResult {
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

  const f = Math.max(10, sourceParams.frequency || 50);
  const omega = 2 * Math.PI * f;
  const T = 1 / f;
  const Vrms = Math.max(1, sourceParams.Vrms || 230);
  const Vm = Math.sqrt(2) * Vrms;

  // Load parameters
  const R = Math.max(0.1, loadParams.R);
  const L = loadType === 'R' ? 0 : Math.max(0.0001, (loadParams.L || 10) / 1000); // in Henries
  const E = loadType === 'RLE' ? Math.max(0, loadParams.E || 0) : 0;

  const alphaRad = (alpha * Math.PI) / 180;
  const numStepsPerCycle = 720; // 0.5 degree precision
  const dt = T / numStepsPerCycle;
  const totalCycles = 6; // Settle into steady-state
  const totalSteps = numStepsPerCycle * totalCycles;

  // Simulation state variables
  let iLoad = 0;
  // Track switch states (active/conducting)
  const activeSwitches: Record<string, boolean> = {
    S1: false,
    S2: false,
    S3: false,
    S4: false,
    S5: false,
    S6: false,
  };
  let fwdConducting = false;

  // Store steady-state cycle
  const steadyStatePoints: SimulationPoint[] = [];

  // Helper to compute phase voltages at angle theta
  const getSourceVoltages = (theta: number) => {
    if (phaseMode === '1-phase') {
      const vA = Vm * Math.sin(theta);
      return {
        vA,
        vB: -vA,
        vC: 0,
        vAB: vA,
        vBC: 0,
        vCA: 0,
      };
    } else {
      // 3-Phase balanced
      const vA = Vm * Math.sin(theta);
      const vB = Vm * Math.sin(theta - (2 * Math.PI) / 3);
      const vC = Vm * Math.sin(theta + (2 * Math.PI) / 3);
      return {
        vA,
        vB,
        vC,
        vAB: vA - vB,
        vBC: vB - vC,
        vCA: vC - vA,
      };
    }
  };

  // Stateful tracking across simulation steps
  let state1HW: 'IDLE' | 'S1_ON' | 'FWD' = 'IDLE';
  let state1FB: 'IDLE' | 'PAIR_1' | 'PAIR_2' | 'FWD' | 'SEMI_1_4' | 'SEMI_3_2' = 'IDLE';
  let state3HW: 'IDLE' | 'PH_A' | 'PH_B' | 'PH_C' | 'FWD' = 'IDLE';
  let state3FB: 'IDLE' | 'INT_0' | 'INT_1' | 'INT_2' | 'INT_3' | 'INT_4' | 'INT_5' | 'FWD' = 'IDLE';

  // Run multi-cycle simulation to ensure periodic steady-state limit cycle
  for (let step = 0; step < totalSteps; step++) {
    const t = step * dt;
    const thetaTotal = omega * t;
    const theta = thetaTotal % (2 * Math.PI);
    const thetaDeg = (theta * 180) / Math.PI;
    const isRecordCycle = step >= (totalCycles - 1) * numStepsPerCycle;

    const { vA, vB, vC, vAB, vBC, vCA } = getSourceVoltages(theta);

    // Gate pulse generation (pulse window e.g. 15 degrees)
    const pulseWidth = (15 * Math.PI) / 180;
    const gatePulses: Record<string, boolean> = {
      S1: false,
      S2: false,
      S3: false,
      S4: false,
      S5: false,
      S6: false,
    };

    let vAppliedToBridge = 0;
    let pathName = 'Off';
    let currentCarryingS: string[] = [];

    let s1 = false;
    let s2 = false;
    let s3 = false;
    let s4 = false;
    let s5 = false;
    let s6 = false;
    let fwdOn = false;

    const fwdEnabled = hasFWD && isFWDActive;

    if (phaseMode === '1-phase' && circuitType === 'half-wave') {
      // 1-Phase Half-Wave Rectifier
      const isS1Thy = switches.S1 === 'thyristor';
      const triggerAngle = isS1Thy ? alphaRad : 0;
      const isPulse = isS1Thy && theta >= triggerAngle && theta <= triggerAngle + pulseWidth;
      gatePulses.S1 = isPulse;

      const canTriggerS1 = isS1Thy ? (isPulse && vA > E) : (vA > E && vA > 0);

      if (canTriggerS1) {
        state1HW = 'S1_ON';
      } else if (state1HW === 'S1_ON') {
        if (vA < 0) {
          if (fwdEnabled && iLoad > 0.0001 && loadType !== 'R') {
            state1HW = 'FWD';
          } else if (!fwdEnabled && !isS1Thy) {
            state1HW = 'IDLE'; // Diode naturally turns off when reverse biased
          } else if (!fwdEnabled && isS1Thy && iLoad > 0.0001 && loadType !== 'R') {
            state1HW = 'S1_ON'; // Inductor keeps SCR on into negative voltage
          } else {
            state1HW = 'IDLE';
          }
        } else if (vA <= E) {
          if (loadType === 'R' || iLoad <= 0.0001) {
            state1HW = 'IDLE';
          }
        }
      } else if (state1HW === 'FWD') {
        if (iLoad <= 0.0001 || loadType === 'R') {
          state1HW = 'IDLE';
        }
      }

      if (state1HW === 'S1_ON') {
        s1 = true;
        currentCarryingS.push('S1');
        vAppliedToBridge = vA;
        pathName = `${isS1Thy ? 'Thyristor' : 'Diode'} S1 (Phase A)`;
      } else if (state1HW === 'FWD') {
        fwdOn = true;
        vAppliedToBridge = 0;
        pathName = 'Freewheeling Diode (FWD)';
      } else {
        vAppliedToBridge = E;
        pathName = 'DCM (Discontinuous / Open)';
      }

    } else if (phaseMode === '1-phase' && circuitType === 'full-bridge') {
      // 1-Phase Full-Bridge Rectifier
      const isS1Thy = switches.S1 === 'thyristor';
      const isS2Thy = switches.S2 === 'thyristor';
      const isS3Thy = switches.S3 === 'thyristor';
      const isS4Thy = switches.S4 === 'thyristor';

      const isAllThyristor = isS1Thy && isS2Thy && isS3Thy && isS4Thy;
      const isAllDiode = !isS1Thy && !isS2Thy && !isS3Thy && !isS4Thy;

      // Pair 1: S1 (Leg 1 Top, Ph A) + S2 (Leg 2 Bot, Neutral) -> conducts in positive half (vA > 0)
      const pair1NeedsGate = isS1Thy || isS2Thy;
      const triggerPair1 = alphaRad;
      const pulse1 = theta >= triggerPair1 && theta <= triggerPair1 + pulseWidth;

      // Pair 2: S3 (Leg 2 Top, Neutral) + S4 (Leg 1 Bot, Ph A) -> conducts in negative half (-vA > 0)
      const pair2NeedsGate = isS3Thy || isS4Thy;
      const triggerPair2 = Math.PI + alphaRad;
      const pulse2 = theta >= triggerPair2 && theta <= triggerPair2 + pulseWidth;

      gatePulses.S1 = isS1Thy && pulse1;
      gatePulses.S2 = isS2Thy && pulse1;
      gatePulses.S3 = isS3Thy && pulse2;
      gatePulses.S4 = isS4Thy && pulse2;

      // Trigger condition for Pair 1 (Positive Half) and Pair 2 (Negative Half)
      const pair1CanTrigger = pair1NeedsGate ? (pulse1 && vA > E) : (vA > 0 && vA > E);
      const pair2CanTrigger = pair2NeedsGate ? (pulse2 && -vA > E) : (-vA > 0 && -vA > E);

      if (pair1CanTrigger) {
        state1FB = 'PAIR_1';
      } else if (pair2CanTrigger) {
        state1FB = 'PAIR_2';
      } else if (state1FB === 'PAIR_1') {
        if (vA < 0) {
          if (fwdEnabled && iLoad > 0.0001 && loadType !== 'R') {
            state1FB = 'FWD';
          } else if (loadType !== 'R' && iLoad > 0.0001) {
            // When vA goes negative, Pair 1 (S1 top + S2 bot) was conducting.
            // Current can commutate to Leg 1 (S4 + S1) ONLY IF S4 is a diode.
            // Current can commutate to Leg 2 (S3 + S2) ONLY IF S3 is a diode.
            if (!isS4Thy) {
              state1FB = 'SEMI_1_4';
            } else if (!isS3Thy) {
              state1FB = 'SEMI_3_2';
            } else {
              // Neither S4 nor S3 is a diode (both are SCRs without gate pulse at this angle).
              // No freewheeling path exists; S1 and S2 maintain conduction into negative voltage!
              state1FB = 'PAIR_1';
            }
          } else {
            state1FB = 'IDLE';
          }
        } else if (vA <= E) {
          if (loadType === 'R' || iLoad <= 0.0001) {
            state1FB = 'IDLE';
          }
        }
      } else if (state1FB === 'PAIR_2') {
        if (-vA < 0) {
          if (fwdEnabled && iLoad > 0.0001 && loadType !== 'R') {
            state1FB = 'FWD';
          } else if (loadType !== 'R' && iLoad > 0.0001) {
            // When -vA goes negative (vA > 0), Pair 2 (S3 top + S4 bot) was conducting.
            // Current can commutate to Leg 2 (S2 + S3) ONLY IF S2 is a diode.
            // Current can commutate to Leg 1 (S1 + S4) ONLY IF S1 is a diode.
            if (!isS2Thy) {
              state1FB = 'SEMI_3_2';
            } else if (!isS1Thy) {
              state1FB = 'SEMI_1_4';
            } else {
              // Neither S2 nor S1 is a diode (both are SCRs without gate pulse at this angle).
              // No freewheeling path exists; S3 and S4 maintain conduction into negative voltage!
              state1FB = 'PAIR_2';
            }
          } else {
            state1FB = 'IDLE';
          }
        } else if (-vA <= E) {
          if (loadType === 'R' || iLoad <= 0.0001) {
            state1FB = 'IDLE';
          }
        }
      } else if (state1FB === 'FWD' || state1FB === 'SEMI_1_4' || state1FB === 'SEMI_3_2') {
        if (iLoad <= 0.0001 || loadType === 'R') {
          state1FB = 'IDLE';
        }
      }

      if (state1FB === 'PAIR_1') {
        s1 = true;
        s2 = true;
        currentCarryingS.push('S1', 'S2');
        vAppliedToBridge = vA;
        pathName = `Bridge Pair ${isS1Thy ? 'S1' : 'D1'} + ${isS2Thy ? 'S2' : 'D2'} (Positive Half)`;
      } else if (state1FB === 'PAIR_2') {
        s3 = true;
        s4 = true;
        currentCarryingS.push('S3', 'S4');
        vAppliedToBridge = -vA;
        pathName = `Bridge Pair ${isS3Thy ? 'S3' : 'D3'} + ${isS4Thy ? 'S4' : 'D4'} (Negative Half)`;
      } else if (state1FB === 'FWD') {
        fwdOn = true;
        vAppliedToBridge = 0;
        pathName = 'Freewheeling Diode (FWD)';
      } else if (state1FB === 'SEMI_1_4') {
        s1 = true;
        s4 = true;
        currentCarryingS.push('S1', 'S4');
        vAppliedToBridge = 0;
        pathName = `Semi-Converter Freewheeling (${isS1Thy ? 'S1' : 'D1'} + ${isS4Thy ? 'S4' : 'D4'})`;
      } else if (state1FB === 'SEMI_3_2') {
        s3 = true;
        s2 = true;
        currentCarryingS.push('S3', 'S2');
        vAppliedToBridge = 0;
        pathName = `Semi-Converter Freewheeling (${isS3Thy ? 'S3' : 'D3'} + ${isS2Thy ? 'S2' : 'D2'})`;
      } else {
        vAppliedToBridge = E;
        pathName = 'DCM (Discontinuous / Open)';
      }

    } else if (phaseMode === '3-phase' && circuitType === 'half-wave') {
      // 3-Phase Half-Wave Rectifier (3-pulse)
      const isAllDiode = switches.S1 === 'diode' && switches.S3 === 'diode' && switches.S5 === 'diode';

      if (isAllDiode) {
        // Natural 3-phase diode commutation: top diode connected to max phase conducts
        let maxV = vA;
        let activeSwitch = 'S1';
        let phName = 'Phase A';

        if (vB > maxV) {
          maxV = vB;
          activeSwitch = 'S3';
          phName = 'Phase B';
        }
        if (vC > maxV) {
          maxV = vC;
          activeSwitch = 'S5';
          phName = 'Phase C';
        }

        if (maxV > E) {
          if (activeSwitch === 'S1') s1 = true;
          if (activeSwitch === 'S3') s3 = true;
          if (activeSwitch === 'S5') s5 = true;
          currentCarryingS.push(activeSwitch);
          vAppliedToBridge = maxV;
          pathName = `Diode ${activeSwitch} (${phName})`;
        } else {
          vAppliedToBridge = E;
          pathName = 'DCM (Discontinuous / Open)';
        }
      } else {
        // Controlled 3-Phase Half-Wave Converter
        const baseAngles = [
          { id: 'PH_A', switchId: 'S1', thetaNat: Math.PI / 6, v: vA, name: 'S1 (Phase A)' },
          { id: 'PH_B', switchId: 'S3', thetaNat: (5 * Math.PI) / 6, v: vB, name: 'S3 (Phase B)' },
          { id: 'PH_C', switchId: 'S5', thetaNat: (9 * Math.PI) / 6, v: vC, name: 'S5 (Phase C)' },
        ];

        // Pulse generation
        baseAngles.forEach((ph) => {
          const fireAngle = (ph.thetaNat + alphaRad) % (2 * Math.PI);
          if (theta >= fireAngle && theta <= fireAngle + pulseWidth) {
            if (switches[ph.switchId] === 'thyristor') gatePulses[ph.switchId] = true;
          }
        });

        const refTheta = (theta - (Math.PI / 6) - alphaRad + 4 * Math.PI) % (2 * Math.PI);
        let activeIdx = 0;
        if (refTheta >= 0 && refTheta < (2 * Math.PI) / 3) activeIdx = 0;
        else if (refTheta >= (2 * Math.PI) / 3 && refTheta < (4 * Math.PI) / 3) activeIdx = 1;
        else activeIdx = 2;

        const activePh = baseAngles[activeIdx];
        const selectedV = activePh.v;

        if (hasFWD && isFWDActive && selectedV < 0 && iLoad > 0.0001 && loadType !== 'R') {
          fwdOn = true;
          vAppliedToBridge = 0;
          pathName = 'Freewheeling Diode (FWD)';
        } else if (selectedV > E || (loadType !== 'R' && iLoad > 0.0001 && !fwdEnabled)) {
          if (activePh.switchId === 'S1') s1 = true;
          if (activePh.switchId === 'S3') s3 = true;
          if (activePh.switchId === 'S5') s5 = true;
          currentCarryingS.push(activePh.switchId);
          vAppliedToBridge = selectedV;
          pathName = `Thyristor ${activePh.name}`;
        } else {
          vAppliedToBridge = E;
          pathName = 'DCM (Discontinuous / Open)';
        }
      }

    } else {
      // 3-Phase Full-Bridge Rectifier (6-pulse)
      const isAllDiode = Object.values(switches).every((s) => s === 'diode');
      const vAC = vA - vC;
      const vBA = vB - vA;
      const vCB = vC - vB;

      if (isAllDiode) {
        // Natural 3-Phase Diode Bridge Rectification:
        // Top diode with highest positive potential conducts
        // Bottom diode with lowest (most negative) potential conducts
        let topV = vA;
        let topSwitch = 'S1';
        if (vB > topV) {
          topV = vB;
          topSwitch = 'S3';
        }
        if (vC > topV) {
          topV = vC;
          topSwitch = 'S5';
        }

        let botV = vA;
        let botSwitch = 'S4';
        if (vB < botV) {
          botV = vB;
          botSwitch = 'S6';
        }
        if (vC < botV) {
          botV = vC;
          botSwitch = 'S2';
        }

        const naturalLineV = topV - botV;

        if (naturalLineV > E) {
          if (topSwitch === 'S1') s1 = true;
          if (topSwitch === 'S3') s3 = true;
          if (topSwitch === 'S5') s5 = true;
          if (botSwitch === 'S4') s4 = true;
          if (botSwitch === 'S6') s6 = true;
          if (botSwitch === 'S2') s2 = true;

          currentCarryingS.push(topSwitch, botSwitch);
          vAppliedToBridge = naturalLineV;
          pathName = `Diode Pair ${topSwitch} + ${botSwitch}`;
        } else {
          vAppliedToBridge = E;
          pathName = 'DCM (Discontinuous / Open)';
        }
      } else {
        // 3-Phase Controlled Bridge / Semi-Converter
        const intervals = [
          { id: 'INT_0', natStart: Math.PI / 6, top: 'S1', bot: 'S6', v: vAB, name: 'S1 + S6 (vAB)', semiFwdTop: 'S1', semiFwdBot: 'S4' },
          { id: 'INT_1', natStart: Math.PI / 2, top: 'S1', bot: 'S2', v: vAC, name: 'S1 + S2 (vAC)', semiFwdTop: 'S1', semiFwdBot: 'S4' },
          { id: 'INT_2', natStart: (5 * Math.PI) / 6, top: 'S3', bot: 'S2', v: vBC, name: 'S3 + S2 (vBC)', semiFwdTop: 'S3', semiFwdBot: 'S6' },
          { id: 'INT_3', natStart: (7 * Math.PI) / 6, top: 'S3', bot: 'S4', v: vBA, name: 'S3 + S4 (vBA)', semiFwdTop: 'S3', semiFwdBot: 'S6' },
          { id: 'INT_4', natStart: (3 * Math.PI) / 2, top: 'S5', bot: 'S4', v: vCA, name: 'S5 + S4 (vCA)', semiFwdTop: 'S5', semiFwdBot: 'S2' },
          { id: 'INT_5', natStart: (11 * Math.PI) / 6, top: 'S5', bot: 'S6', v: vCB, name: 'S5 + S6 (vCB)', semiFwdTop: 'S5', semiFwdBot: 'S2' },
        ];

        // Shift relative to 30° natural commutation boundary
        const refTheta = (theta - (Math.PI / 6) - alphaRad + 4 * Math.PI) % (2 * Math.PI);
        const intervalIdx = Math.floor(refTheta / (Math.PI / 3)) % 6;
        const activeInterval = intervals[intervalIdx];

        // Gate pulses for thyristors
        intervals.forEach((inter) => {
          const fireAngle = (inter.natStart + alphaRad) % (2 * Math.PI);
          if (theta >= fireAngle && theta <= fireAngle + pulseWidth) {
            if (switches[inter.top] === 'thyristor') gatePulses[inter.top] = true;
            if (switches[inter.bot] === 'thyristor') gatePulses[inter.bot] = true;
          }
        });

        const lineV = activeInterval.v;

        // Bottom switch in top switch's leg: S1->S4, S3->S6, S5->S2
        const topLegBot = activeInterval.top === 'S1' ? 'S4' : activeInterval.top === 'S3' ? 'S6' : 'S2';
        // Top switch in bottom switch's leg: S4->S1, S6->S3, S2->S5
        const botLegTop = activeInterval.bot === 'S4' ? 'S1' : activeInterval.bot === 'S6' ? 'S3' : 'S5';

        const canFreewheelTopLeg = switches[topLegBot] === 'diode';
        const canFreewheelBotLeg = switches[botLegTop] === 'diode';
        const canFreewheel = canFreewheelTopLeg || canFreewheelBotLeg;

        if (hasFWD && isFWDActive && lineV < 0 && iLoad > 0.0001 && loadType !== 'R') {
          // External Freewheeling Diode clamps negative voltage
          fwdOn = true;
          vAppliedToBridge = 0;
          pathName = 'Freewheeling Diode (FWD)';
        } else if (canFreewheel && lineV < 0 && iLoad > 0.0001 && loadType !== 'R') {
          // Semi-converter intrinsic freewheeling pair in same leg
          const fwdTop = canFreewheelTopLeg ? activeInterval.top : botLegTop;
          const fwdBot = canFreewheelTopLeg ? topLegBot : activeInterval.bot;
          if (fwdTop === 'S1') s1 = true;
          if (fwdTop === 'S3') s3 = true;
          if (fwdTop === 'S5') s5 = true;
          if (fwdBot === 'S4') s4 = true;
          if (fwdBot === 'S6') s6 = true;
          if (fwdBot === 'S2') s2 = true;
          currentCarryingS.push(fwdTop, fwdBot);
          vAppliedToBridge = 0;
          pathName = `Semi-Converter Freewheeling (${fwdTop} + ${fwdBot})`;
        } else if (lineV > E || (loadType !== 'R' && iLoad > 0.0001 && !fwdEnabled && !canFreewheel)) {
          // Conducting line-to-line pair
          if (activeInterval.top === 'S1') s1 = true;
          if (activeInterval.top === 'S3') s3 = true;
          if (activeInterval.top === 'S5') s5 = true;
          if (activeInterval.bot === 'S4') s4 = true;
          if (activeInterval.bot === 'S6') s6 = true;
          if (activeInterval.bot === 'S2') s2 = true;

          currentCarryingS.push(activeInterval.top, activeInterval.bot);
          vAppliedToBridge = lineV;
          pathName = activeInterval.name;
        } else {
          vAppliedToBridge = E;
          pathName = 'DCM (Discontinuous / Open)';
        }
      }
    }

    // Solve Load Current & Voltage for next step
    let vLoadInstant = vAppliedToBridge;
    if (loadType === 'R') {
      // Pure resistive load: direct algebraic Ohm's Law solution
      if (currentCarryingS.length > 0 && vAppliedToBridge > E) {
        iLoad = (vAppliedToBridge - E) / R;
        vLoadInstant = vAppliedToBridge;
      } else {
        iLoad = 0;
        vLoadInstant = E;
        s1 = false;
        s2 = false;
        s3 = false;
        s4 = false;
        s5 = false;
        s6 = false;
        currentCarryingS = [];
      }
    } else {
      // Inductive Load (RL or RLE): Solve Differential Equation
      // vAppliedToBridge = R * iLoad + L * (di/dt) + E
      // di/dt = (vAppliedToBridge - R * iLoad - E) / L
      if (!fwdOn && currentCarryingS.length === 0) {
        // Discontinuous mode, no current flowing
        iLoad = 0;
        vLoadInstant = E;
      } else {
        // Runge-Kutta 4th order ODE integration for supreme precision & stability
        const f_ode = (iVal: number, vVal: number) => {
          return (vVal - R * iVal - E) / L;
        };

        const k1 = f_ode(iLoad, vAppliedToBridge);
        const k2 = f_ode(iLoad + 0.5 * dt * k1, vAppliedToBridge);
        const k3 = f_ode(iLoad + 0.5 * dt * k2, vAppliedToBridge);
        const k4 = f_ode(iLoad + dt * k3, vAppliedToBridge);

        let nextI = iLoad + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
        if (nextI < 0) {
          nextI = 0;
          if (!fwdOn) {
            s1 = false;
            s2 = false;
            s3 = false;
            s4 = false;
            s5 = false;
            s6 = false;
            vLoadInstant = E;
          }
        }
        iLoad = nextI;
      }
    }

    // Update active conduction state tracking
    activeSwitches.S1 = s1;
    activeSwitches.S2 = s2;
    activeSwitches.S3 = s3;
    activeSwitches.S4 = s4;
    activeSwitches.S5 = s5;
    activeSwitches.S6 = s6;
    fwdConducting = fwdOn;

    // Calculate source currents
    let iSourceA = 0;
    let iSourceB = 0;
    let iSourceC = 0;

    if (phaseMode === '1-phase') {
      if (circuitType === 'half-wave') {
        iSourceA = s1 ? iLoad : 0;
      } else {
        if (s1 && s2) iSourceA = iLoad;
        else if (s3 && s4) iSourceA = -iLoad;
        else iSourceA = 0;
      }
    } else {
      // 3-Phase
      if (circuitType === 'half-wave') {
        iSourceA = s1 ? iLoad : 0;
        iSourceB = s3 ? iLoad : 0;
        iSourceC = s5 ? iLoad : 0;
      } else {
        if (s1) iSourceA += iLoad;
        if (s4) iSourceA -= iLoad;
        if (s3) iSourceB += iLoad;
        if (s6) iSourceB -= iLoad;
        if (s5) iSourceC += iLoad;
        if (s2) iSourceC -= iLoad;
      }
    }

    const iFWD = fwdOn ? iLoad : 0;

    // Calculate individual switch voltages & currents
    const switchCurrents: Record<string, number> = {
      S1: s1 ? iLoad : 0,
      S2: s2 ? iLoad : 0,
      S3: s3 ? iLoad : 0,
      S4: s4 ? iLoad : 0,
      S5: s5 ? iLoad : 0,
      S6: s6 ? iLoad : 0,
    };

    const switchVoltages: Record<string, number> = {
      S1: s1 ? 0 : vA - vLoadInstant,
      S2: s2 ? 0 : -vLoadInstant,
      S3: s3 ? 0 : (phaseMode === '1-phase' ? -vA : vB) - vLoadInstant,
      S4: s4 ? 0 : -vLoadInstant,
      S5: s5 ? 0 : vC - vLoadInstant,
      S6: s6 ? 0 : -vLoadInstant,
    };

    if (isRecordCycle) {
      steadyStatePoints.push({
        time: t - (totalCycles - 1) * T,
        theta,
        thetaDeg,
        vSourceA: vA,
        vSourceB: vB,
        vSourceC: vC,
        vSourceLineAB: vAB,
        vSourceLineBC: vBC,
        vSourceLineCA: vCA,
        vLoad: vLoadInstant,
        iLoad: iLoad,
        iSource: iSourceA,
        iSourceB,
        iSourceC,
        iFWD,
        switchStates: {
          S1: s1,
          S2: s2,
          S3: s3,
          S4: s4,
          S5: s5,
          S6: s6,
        },
        switchCurrents,
        switchVoltages,
        gatePulses,
        conductingPathName: pathName,
      });
    }
  }

  // Calculate Metrics from steady-state points
  const N = steadyStatePoints.length;
  let sumVdc = 0;
  let sumVsq = 0;
  let sumIdc = 0;
  let sumIsq = 0;
  let sumPload = 0;
  let sumIsA_sq = 0;
  let isDiscontinuous = false;

  for (let i = 0; i < N; i++) {
    const pt = steadyStatePoints[i];
    sumVdc += pt.vLoad;
    sumVsq += pt.vLoad * pt.vLoad;
    sumIdc += pt.iLoad;
    sumIsq += pt.iLoad * pt.iLoad;
    sumPload += pt.vLoad * pt.iLoad;
    sumIsA_sq += pt.iSource * pt.iSource;
    if (pt.iLoad <= 0.0001 && pt.conductingPathName.includes('DCM')) {
      isDiscontinuous = true;
    }
  }

  const vDcAvg = sumVdc / N;
  const vRms = Math.sqrt(sumVsq / N);
  const iDcAvg = sumIdc / N;
  const iRms = Math.sqrt(sumIsq / N);
  const pLoad = sumPload / N;
  const isRms = Math.sqrt(sumIsA_sq / N);

  const sInput = phaseMode === '1-phase' ? Vrms * isRms : Math.sqrt(3) * (Math.sqrt(3) * Vrms) * isRms;
  const pf = sInput > 0.01 ? Math.min(1, Math.max(0, pLoad / sInput)) : 0;
  const formFactor = vDcAvg !== 0 ? Math.abs(vRms / vDcAvg) : 1;
  const rippleFactor = Math.sqrt(Math.max(0, formFactor * formFactor - 1));
  const rectificationEfficiency = (vDcAvg * iDcAvg) / Math.max(1, pLoad) * 100;

  // Fourier decomposition of Source Current i_s(t)
  const harmonics: HarmonicComponent[] = [];
  const maxHarmonic = 15;
  let fundMag = 0;

  for (let h = 1; h <= maxHarmonic; h += 2) {
    let an = 0;
    let bn = 0;
    for (let i = 0; i < N; i++) {
      const theta = steadyStatePoints[i].theta;
      const is = steadyStatePoints[i].iSource;
      an += (2 / N) * is * Math.cos(h * theta);
      bn += (2 / N) * is * Math.sin(h * theta);
    }
    const mag = Math.sqrt(an * an + bn * bn);
    const phase = Math.atan2(bn, an);
    if (h === 1) fundMag = mag;
    harmonics.push({
      harmonic: h,
      magnitude: mag,
      phase: (phase * 180) / Math.PI,
      percent: fundMag > 0.001 ? (mag / fundMag) * 100 : (h === 1 ? 100 : 0),
    });
  }

  let harmonicSumSq = 0;
  for (let h = 1; h < harmonics.length; h++) {
    harmonicSumSq += harmonics[h].magnitude * harmonics[h].magnitude;
  }
  const thd = fundMag > 0.001 ? (Math.sqrt(harmonicSumSq) / fundMag) * 100 : 0;
  const displacementFactor = Math.cos((alpha * Math.PI) / 180);

  // Theoretical formula description
  const theoretical = getTheoreticalFormula(config, Vm);

  return {
    points: steadyStatePoints,
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
    rectificationEfficiency: Math.min(100, Math.max(0, rectificationEfficiency)),
    harmonics,
    isDiscontinuous,
    theoreticalFormula: theoretical,
  };
}

function getTheoreticalFormula(config: ConverterConfig, Vm: number) {
  const { phaseMode, circuitType, switches, hasFWD, isFWDActive, alpha } = config;
  const cosA = Math.cos((alpha * Math.PI) / 180);
  const isAllDiode = Object.values(switches).every((s) => s === 'diode');
  const isAllThy = Object.values(switches).every((s) => s === 'thyristor');
  const fwdOn = hasFWD && isFWDActive;

  if (phaseMode === '1-phase') {
    if (circuitType === 'half-wave') {
      if (isAllDiode) {
        const val = Vm / Math.PI;
        return {
          title: '1-Phase Half-Wave Diode Rectifier',
          formulaVdc: 'V_{dc} = \\frac{V_m}{\\pi} \\approx 0.318 V_m',
          calculatedVdc: val,
          description: 'Single diode conducts during the positive half-cycle only.',
        };
      } else {
        const val = (Vm / (2 * Math.PI)) * (1 + cosA);
        return {
          title: '1-Phase Half-Wave Controlled Converter',
          formulaVdc: fwdOn
            ? 'V_{dc} = \\frac{V_m}{2\\pi} (1 + \\cos\\alpha)'
            : 'V_{dc} = \\frac{V_m}{2\\pi} (1 + \\cos\\alpha)',
          calculatedVdc: val,
          description: 'Thyristor fired at angle α, conducting until current extinction or freewheeling.',
        };
      }
    } else {
      // 1-Phase Full Bridge
      if (isAllDiode) {
        const val = (2 * Vm) / Math.PI;
        return {
          title: '1-Phase Full-Bridge Diode Rectifier',
          formulaVdc: 'V_{dc} = \\frac{2 V_m}{\\pi} \\approx 0.636 V_m',
          calculatedVdc: val,
          description: 'Uncontrolled full-wave bridge rectification across both half-cycles.',
        };
      } else if (isAllThy && !fwdOn) {
        const val = ((2 * Vm) / Math.PI) * cosA;
        return {
          title: '1-Phase Fully Controlled Converter (Full-Bridge)',
          formulaVdc: 'V_{dc} = \\frac{2 V_m}{\\pi} \\cos\\alpha',
          calculatedVdc: val,
          description: 'Two-quadrant converter capable of rectification (α < 90°) and inversion (α > 90°).',
        };
      } else {
        // Semi-converter or controlled with FWD
        const val = (Vm / Math.PI) * (1 + cosA);
        return {
          title: '1-Phase Semi-Converter (Half-Controlled Bridge / with FWD)',
          formulaVdc: 'V_{dc} = \\frac{V_m}{\\pi} (1 + \\cos\\alpha)',
          calculatedVdc: val,
          description: 'One quadrant operation with freewheeling action clamping negative voltage spikes.',
        };
      }
    }
  } else {
    // 3-Phase
    const VmL = Math.sqrt(3) * Vm;
    if (circuitType === 'half-wave') {
      if (isAllDiode) {
        const val = (3 * Math.sqrt(3) * Vm) / (2 * Math.PI);
        return {
          title: '3-Phase Half-Wave Diode Rectifier (3-Pulse)',
          formulaVdc: 'V_{dc} = \\frac{3\\sqrt{3} V_m}{2\\pi} \\approx 0.827 V_m',
          calculatedVdc: val,
          description: '3-pulse star rectifier with each diode conducting for 120°.',
        };
      } else {
        const val = ((3 * Math.sqrt(3) * Vm) / (2 * Math.PI)) * cosA;
        return {
          title: '3-Phase Half-Wave Controlled Converter',
          formulaVdc: 'V_{dc} = \\frac{3\\sqrt{3} V_m}{2\\pi} \\cos\\alpha',
          calculatedVdc: val,
          description: '3-pulse controlled converter with gate triggering shifted by α.',
        };
      }
    } else {
      // 3-Phase Full Bridge (6-Pulse)
      if (isAllDiode) {
        const val = (3 * VmL) / Math.PI;
        return {
          title: '3-Phase Full-Bridge Diode Rectifier (6-Pulse)',
          formulaVdc: 'V_{dc} = \\frac{3 V_{mL}}{\\pi} = \\frac{3\\sqrt{3} V_m}{\\pi} \\approx 1.654 V_{m,ph}',
          calculatedVdc: val,
          description: 'Standard 6-pulse bridge with ultra-low output ripple frequency (6f = 300Hz).',
        };
      } else if (isAllThy && !fwdOn) {
        const val = ((3 * VmL) / Math.PI) * cosA;
        return {
          title: '3-Phase Fully Controlled Bridge Converter (6-Pulse)',
          formulaVdc: 'V_{dc} = \\frac{3 V_{mL}}{\\pi} \\cos\\alpha = \\frac{3\\sqrt{3} V_m}{\\pi} \\cos\\alpha',
          calculatedVdc: val,
          description: 'Full 6-pulse controlled bridge providing high power DC output and regeneration.',
        };
      } else {
        const val = ((3 * VmL) / (2 * Math.PI)) * (1 + cosA);
        return {
          title: '3-Phase Semi-Converter (Half-Controlled)',
          formulaVdc: 'V_{dc} = \\frac{3 V_{mL}}{2\\pi} (1 + \\cos\\alpha)',
          calculatedVdc: val,
          description: 'Economical 3-phase converter with 3 thyristors and 3 diodes with intrinsic freewheeling.',
        };
      }
    }
  }
}
