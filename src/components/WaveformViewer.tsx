import React, { useRef, useEffect, useState } from 'react';
import { SimulationPoint, SimulationResult, ConverterConfig } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Layers, BarChart2, Eye, EyeOff, ZoomIn, ZoomOut, Compass, Sparkles, Maximize2 } from 'lucide-react';

interface WaveformViewerProps {
  config: ConverterConfig;
  simResult: SimulationResult;
  currentIndex: number;
  onSeekIndex: (index: number) => void;
  onOpenFullScreen?: () => void;
}

type ViewMode = 'superimposed' | 'stacked' | 'harmonics';

export interface ActiveDeviceInfo {
  label: string;
  devices: string[];
  isDCM: boolean;
  isFreewheel: boolean;
  type: 'diode' | 'thyristor' | 'mixed' | 'fwd' | 'dcm';
}

export function getActiveDeviceAtPoint(pt: SimulationPoint, config: ConverterConfig): ActiveDeviceInfo {
  const hasSwitchOn =
    pt.switchStates &&
    (pt.switchStates.S1 ||
      pt.switchStates.S2 ||
      pt.switchStates.S3 ||
      pt.switchStates.S4 ||
      pt.switchStates.S5 ||
      pt.switchStates.S6);
  const hasFwdOn =
    (pt.iFWD && pt.iFWD > 0.001) ||
    (pt.conductingPathName && pt.conductingPathName.includes('Freewheeling Diode'));

  if (!hasSwitchOn && !hasFwdOn) {
    return {
      label: 'OFF',
      devices: [],
      isDCM: true,
      isFreewheel: false,
      type: 'dcm',
    };
  }

  if (hasFwdOn && !hasSwitchOn) {
    return {
      label: 'DFW',
      devices: ['DFW'],
      isDCM: false,
      isFreewheel: true,
      type: 'fwd',
    };
  }

  const devList: { num: number; label: string; isThy: boolean }[] = [];
  ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].forEach((key) => {
    if (pt.switchStates && pt.switchStates[key]) {
      const isThy = config.switches[key] === 'thyristor';
      const num = parseInt(key.replace(/\D/g, ''), 10);
      devList.push({
        num,
        label: `${isThy ? 'T' : 'D'}${num}`,
        isThy,
      });
    }
  });

  if (devList.length === 0) {
    return {
      label: 'OFF',
      devices: [],
      isDCM: true,
      isFreewheel: false,
      type: 'dcm',
    };
  }

  // Sort ascending by device number: 1, 2, 3, 4, 5, 6
  // Produces natural textbook pairs: D1 D6, D1 D2, D2 D3, D3 D4, D4 D5, D5 D6
  devList.sort((a, b) => a.num - b.num);
  const label = devList.map((d) => d.label).join(' ');
  const anyThy = devList.some((d) => d.isThy);
  const allThy = devList.every((d) => d.isThy);
  const type = allThy ? 'thyristor' : anyThy ? 'mixed' : 'diode';

  return {
    label,
    devices: devList.map((d) => d.label),
    isDCM: false,
    isFreewheel: false,
    type,
  };
}

export const WaveformViewer: React.FC<WaveformViewerProps> = ({
  config,
  simResult,
  currentIndex,
  onSeekIndex,
  onOpenFullScreen,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [viewMode, setViewMode] = useState<ViewMode>('superimposed');
  const [cyclesCount, setCyclesCount] = useState<number>(1); // Default to 1 clean cycle (0° - 360°)
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showRmsAvg, setShowRmsAvg] = useState<boolean>(true);
  const [showPhaseVoltages, setShowPhaseVoltages] = useState<boolean>(false);
  const [showLineVoltages, setShowLineVoltages] = useState<boolean>(true);
  const [showAllPhaseCurrents, setShowAllPhaseCurrents] = useState<boolean>(false);

  // Set sensible initial toggles when 3-phase topology changes
  useEffect(() => {
    if (config.phaseMode === '3-phase') {
      if (config.circuitType === 'half-wave') {
        setShowPhaseVoltages(true);
        setShowLineVoltages(false);
      } else {
        setShowLineVoltages(true);
      }
    }
  }, [config.phaseMode, config.circuitType]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const points = simResult.points;
  const totalPoints = points.length;
  const currentPt = points[currentIndex] || points[0];

  // Helper to handle mouse drag scrubbing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    updateSeekFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      updateSeekFromEvent(e);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const updateSeekFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || totalPoints === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const paddingLeft = 55;
    const paddingRight = 20;
    const plotWidth = rect.width - paddingLeft - paddingRight;
    const normX = Math.max(0, Math.min(1, (x - paddingLeft) / plotWidth));

    // Map normalized canvas X to active cycle index
    const targetFraction = Math.max(0, Math.min(0.9999, (normX * cyclesCount) % 1));
    const targetIdx = Math.floor(targetFraction * (totalPoints - 1));
    onSeekIndex(targetIdx);
  };

  // Color tokens based on theme
  const colors = {
    bg: isLight ? '#ffffff' : '#090d16',
    boxBg: isLight ? '#f8fafc' : '#090d16',
    boxBorder: isLight ? '#e2e8f0' : '#1e293b',
    titleText: isLight ? '#334155' : '#94a3b8',
    unitText: isLight ? '#64748b' : '#475569',
    gridLine: isLight ? '#e2e8f0' : '#1e293b',
    zeroLine: isLight ? '#94a3b8' : '#334155',
    axisText: isLight ? '#64748b' : '#64748b',
    vLoad: isLight ? '#059669' : '#10b981', // emerald
    vSourceA: isLight ? '#0284c7' : '#38bdf8', // sky
    iLoad: isLight ? '#d97706' : '#f59e0b', // amber
    iSource: isLight ? '#4f46e5' : '#818cf8', // indigo / violet
    vAvg: isLight ? '#7c3aed' : '#a78bfa',
    vBackEmf: isLight ? '#e11d48' : '#f43f5e',
    scrubberLine: isLight ? '#0284c7' : '#38bdf8',
    scrubberHandle: isLight ? '#0369a1' : '#0284c7',
    gatePulse: isLight ? '#d97706' : '#fbbf24',
  };

  // Render on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || totalPoints === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const padL = 55;
    const padR = 20;
    const padT = 15;
    const padB = 25;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);

    if (viewMode === 'harmonics') {
      drawHarmonics(ctx, W, H, padL, padR, padT, padB);
      return;
    }

    // Determine min/max scales
    let maxV = 10;
    let minV = 0;
    let maxI = 5;

    points.forEach((p) => {
      maxV = Math.max(
        maxV,
        Math.abs(p.vSourceA),
        Math.abs(p.vLoad),
        Math.abs(p.vSourceLineAB),
        Math.abs(p.vSourceLineBC),
        Math.abs(p.vSourceLineCA)
      );
      minV = Math.min(
        minV,
        p.vSourceA,
        p.vLoad,
        -Math.abs(p.vSourceLineAB),
        -Math.abs(p.vSourceLineBC),
        -Math.abs(p.vSourceLineCA)
      );
      maxI = Math.max(maxI, Math.abs(p.iLoad), Math.abs(p.iSource));
    });

    maxV = Math.ceil(maxV * 1.15);
    minV = Math.floor(minV * 1.15);
    maxI = Math.ceil(maxI * 1.25);

    const totalSteps = totalPoints * cyclesCount;

    // X-coord mapping
    const getX = (step: number) => padL + (step / (totalSteps - 1)) * plotW;

    if (viewMode === 'superimposed') {
      // 2 Sub-plots: Top = Voltages (Vs & Vo Superimposed), Bottom = Currents (Io & Is) + Gate Pulses + Conduction Strip
      const hStrip = 24;
      const gapStrip = 10;
      const gapPlots = 14;
      const availablePlotH = Math.max(100, plotH - hStrip - gapStrip);
      const hTop = availablePlotH * 0.58;
      const hBot = availablePlotH * 0.42;
      const yTopStart = padT;
      const yBotStart = yTopStart + hTop + gapPlots;
      const yStripStart = yBotStart + hBot + gapStrip;

      // --- Top Plot: Voltages (Vs, Vo, E) ---
      let topTitle = 'Voltage Waveforms (v_s & v_o Superimposed)';
      if (config.phaseMode === '3-phase') {
        if (showLineVoltages && showPhaseVoltages) {
          topTitle = 'Voltage Waveforms (Line v_LL & Phase v_ph & v_o Superimposed)';
        } else if (showPhaseVoltages) {
          topTitle = 'Voltage Waveforms (Phase Voltages v_an, v_bn, v_cn & v_o)';
        } else {
          topTitle = 'Voltage Waveforms (Line-to-Line Voltages v_LL & v_o)';
        }
      }
      drawPlotBackground(ctx, padL, yTopStart, plotW, hTop, topTitle, 'V');
      drawVoltageGrid(ctx, padL, yTopStart, plotW, hTop, minV, maxV);

      // Draw Source Voltages
      if (config.phaseMode === '1-phase') {
        // v_s (Phase A)
        ctx.beginPath();
        ctx.strokeStyle = colors.vSourceA;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        for (let s = 0; s < totalSteps; s++) {
          const pt = points[s % totalPoints];
          const x = getX(s);
          const y = valToY(pt.vSourceA, minV, maxV, yTopStart, hTop);
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // 3-Phase: Can draw Line Voltages and/or Star Phase Voltages!

        // 1. Line-to-Line Voltages
        if (showLineVoltages) {
          const drawLineV = (accessor: (p: SimulationPoint) => number, color: string, isInv = false) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = isInv ? 1.0 : 1.2;
            ctx.setLineDash(isInv ? [2, 3] : [4, 3]);
            for (let s = 0; s < totalSteps; s++) {
              const pt = points[s % totalPoints];
              const x = getX(s);
              const y = valToY(accessor(pt), minV, maxV, yTopStart, hTop);
              if (s === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          };
          const alphaLine = isLight ? 0.7 : 0.6;
          const alphaInv = isLight ? 0.4 : 0.3;
          drawLineV((p) => p.vSourceLineAB, `rgba(239, 68, 68, ${alphaLine})`, false);   // Red: vAB
          drawLineV((p) => p.vSourceLineBC, `rgba(245, 158, 11, ${alphaLine})`, false);  // Amber: vBC
          drawLineV((p) => p.vSourceLineCA, `rgba(59, 130, 246, ${alphaLine})`, false);  // Blue: vCA
          if (config.circuitType === 'full-bridge') {
            drawLineV((p) => -p.vSourceLineAB, `rgba(239, 68, 68, ${alphaInv})`, true);  // vBA
            drawLineV((p) => -p.vSourceLineBC, `rgba(245, 158, 11, ${alphaInv})`, true); // vCB
            drawLineV((p) => -p.vSourceLineCA, `rgba(59, 130, 246, ${alphaInv})`, true); // vAC
          }
        }

        // 2. Star Phase Voltages (van, vbn, vcn)
        if (showPhaseVoltages) {
          const drawPhaseLine = (accessor: (p: SimulationPoint) => number, color: string) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.6;
            ctx.setLineDash([5, 3]);
            for (let s = 0; s < totalSteps; s++) {
              const pt = points[s % totalPoints];
              const x = getX(s);
              const y = valToY(accessor(pt), minV, maxV, yTopStart, hTop);
              if (s === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          };
          drawPhaseLine((p) => p.vSourceA, isLight ? 'rgba(220, 38, 38, 0.9)' : 'rgba(248, 113, 113, 0.85)'); // Red: v_an
          drawPhaseLine((p) => p.vSourceB, isLight ? 'rgba(217, 119, 6, 0.9)' : 'rgba(251, 191, 36, 0.85)');  // Amber: v_bn
          drawPhaseLine((p) => p.vSourceC, isLight ? 'rgba(37, 99, 235, 0.9)' : 'rgba(96, 165, 250, 0.85)');  // Blue: v_cn
        }
      }

      // Draw Back-EMF E line if RLE
      if (config.loadType === 'RLE' && config.loadParams.E > 0) {
        ctx.beginPath();
        ctx.strokeStyle = colors.vBackEmf;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 4]);
        const yE = valToY(config.loadParams.E, minV, maxV, yTopStart, hTop);
        ctx.moveTo(padL, yE);
        ctx.lineTo(padL + plotW, yE);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Vdc Average Line
      if (showRmsAvg && simResult.vDcAvg > 0) {
        ctx.beginPath();
        ctx.strokeStyle = colors.vAvg;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 3]);
        const yVdc = valToY(simResult.vDcAvg, minV, maxV, yTopStart, hTop);
        ctx.moveTo(padL, yVdc);
        ctx.lineTo(padL + plotW, yVdc);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Output Rectified Voltage v_o(t) in Bold Emerald
      ctx.beginPath();
      ctx.strokeStyle = colors.vLoad;
      ctx.lineWidth = 2.5;
      for (let s = 0; s < totalSteps; s++) {
        const pt = points[s % totalPoints];
        const x = getX(s);
        const y = valToY(pt.vLoad, minV, maxV, yTopStart, hTop);
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // --- Bottom Plot: Currents (Io, Is, Gate) ---
      let botTitle = 'Current Waveforms (i_o & i_s)';
      if (config.phaseMode === '3-phase') {
        botTitle = showAllPhaseCurrents
          ? 'Current Waveforms [Load i_o(t) & Line Currents i_a, i_b, i_c]'
          : 'Current Waveforms [Load i_o(t) & Phase A Line Current i_a(t)]';
      }
      drawPlotBackground(ctx, padL, yBotStart, plotW, hBot, botTitle, 'A');
      drawCurrentGrid(ctx, padL, yBotStart, plotW, hBot, -maxI, maxI);

      // Draw Supply / Line Currents
      if (config.phaseMode === '3-phase' && showAllPhaseCurrents) {
        // Draw all 3 phase currents: i_a (Indigo), i_b (Amber), i_c (Sky)
        const drawPhaseCurrent = (accessor: (p: SimulationPoint) => number, color: string, dash: number[] = []) => {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.4;
          ctx.setLineDash(dash);
          for (let s = 0; s < totalSteps; s++) {
            const pt = points[s % totalPoints];
            const x = getX(s);
            const y = valToY(accessor(pt), -maxI, maxI, yBotStart, hBot);
            if (s === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        };
        drawPhaseCurrent((p) => p.iSource, isLight ? '#4f46e5' : '#818cf8', []); // i_a Phase A
        drawPhaseCurrent((p) => p.iSourceB, isLight ? '#d97706' : '#fbbf24', [4, 2]); // i_b Phase B
        drawPhaseCurrent((p) => p.iSourceC, isLight ? '#0284c7' : '#38bdf8', [4, 2]); // i_c Phase C
      } else {
        // Draw Source / Phase A Current i_s(t) / i_a(t)
        ctx.beginPath();
        ctx.strokeStyle = colors.iSource;
        ctx.lineWidth = 1.6;
        for (let s = 0; s < totalSteps; s++) {
          const pt = points[s % totalPoints];
          const x = getX(s);
          const y = valToY(pt.iSource, -maxI, maxI, yBotStart, hBot);
          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Draw Output Load Current i_o(t) in Amber/Gold
      ctx.beginPath();
      ctx.strokeStyle = colors.iLoad;
      ctx.lineWidth = 2.4;
      for (let s = 0; s < totalSteps; s++) {
        const pt = points[s % totalPoints];
        const x = getX(s);
        const y = valToY(pt.iLoad, -maxI, maxI, yBotStart, hBot);
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Gate Pulses at Bottom of the Lower Plot
      drawGatePulseTrack(ctx, padL, yBotStart + hBot - 12, plotW, 8, totalSteps, totalPoints);

      // Draw Conduction Device Segments Strip directly below current waveform
      drawConductionStrip(ctx, padL, yStripStart, plotW, hStrip, totalSteps, totalPoints, currentIndex, cyclesCount);

      // Scrubber Cursor Line spanning through to bottom of conduction strip
      drawScrubber(ctx, padL, padT, plotW, yStripStart + hStrip - padT, currentIndex, totalPoints, cyclesCount);

    } else if (viewMode === 'stacked') {
      // 4 Separate Stacked oscilloscope tracks: Vo, Io, Vs, Is + Conduction Strip
      const numTracks = 4;
      const hStrip = 24;
      const gapStrip = 10;
      const gapTracks = 8;
      const availablePlotH = Math.max(120, plotH - hStrip - gapStrip);
      const trackH = (availablePlotH - (numTracks - 1) * gapTracks) / numTracks;

      // Track 1: Output Voltage v_o
      const y1 = padT;
      drawPlotBackground(ctx, padL, y1, plotW, trackH, 'Load Voltage v_o(t)', 'V');
      drawVoltageGrid(ctx, padL, y1, plotW, trackH, minV, maxV);
      drawSingleWave(ctx, (p) => p.vLoad, minV, maxV, y1, trackH, colors.vLoad, 2.2, totalSteps, totalPoints, padL, plotW);

      // Track 2: Load Current i_o
      const y2 = y1 + trackH + gapTracks;
      drawPlotBackground(ctx, padL, y2, plotW, trackH, 'Load Current i_o(t)', 'A');
      drawCurrentGrid(ctx, padL, y2, plotW, trackH, 0, maxI);
      drawSingleWave(ctx, (p) => p.iLoad, 0, maxI, y2, trackH, colors.iLoad, 2.2, totalSteps, totalPoints, padL, plotW);

      // Track 3: Source Voltage v_s
      const y3 = y2 + trackH + gapTracks;
      const v3Title = config.phaseMode === '3-phase'
        ? (showPhaseVoltages && !showLineVoltages)
          ? 'Star Phase Voltage v_an(t)'
          : 'Line-to-Line AC Voltage v_ab(t)'
        : 'Source AC Voltage v_s(t)';
      drawPlotBackground(ctx, padL, y3, plotW, trackH, v3Title, 'V');
      drawVoltageGrid(ctx, padL, y3, plotW, trackH, -maxV, maxV);
      const v3Accessor = config.phaseMode === '3-phase' && (!showPhaseVoltages || showLineVoltages)
        ? (p: SimulationPoint) => p.vSourceLineAB
        : (p: SimulationPoint) => p.vSourceA;
      drawSingleWave(ctx, v3Accessor, -maxV, maxV, y3, trackH, colors.vSourceA, 1.8, totalSteps, totalPoints, padL, plotW);

      // Track 4: Source Current i_s
      const y4 = y3 + trackH + gapTracks;
      const i4Title = config.phaseMode === '3-phase'
        ? showAllPhaseCurrents
          ? '3-Phase Line Currents i_a, i_b, i_c'
          : 'Phase A Line Current i_a(t)'
        : 'Source AC Current i_s(t)';
      drawPlotBackground(ctx, padL, y4, plotW, trackH, i4Title, 'A');
      drawCurrentGrid(ctx, padL, y4, plotW, trackH, -maxI, maxI);
      if (config.phaseMode === '3-phase' && showAllPhaseCurrents) {
        drawSingleWave(ctx, (p) => p.iSource, -maxI, maxI, y4, trackH, colors.iSource, 1.6, totalSteps, totalPoints, padL, plotW);
        drawSingleWave(ctx, (p) => p.iSourceB, -maxI, maxI, y4, trackH, isLight ? '#d97706' : '#fbbf24', 1.4, totalSteps, totalPoints, padL, plotW);
        drawSingleWave(ctx, (p) => p.iSourceC, -maxI, maxI, y4, trackH, isLight ? '#0284c7' : '#38bdf8', 1.4, totalSteps, totalPoints, padL, plotW);
      } else {
        drawSingleWave(ctx, (p) => p.iSource, -maxI, maxI, y4, trackH, colors.iSource, 1.8, totalSteps, totalPoints, padL, plotW);
      }

      // Draw Conduction Device Segments Strip below track 4
      const yStripStart = y4 + trackH + gapStrip;
      drawConductionStrip(ctx, padL, yStripStart, plotW, hStrip, totalSteps, totalPoints, currentIndex, cyclesCount);

      // Scrubber
      drawScrubber(ctx, padL, padT, plotW, yStripStart + hStrip - padT, currentIndex, totalPoints, cyclesCount);
    }
  }, [viewMode, cyclesCount, showGrid, showRmsAvg, showPhaseVoltages, showLineVoltages, showAllPhaseCurrents, currentIndex, points, simResult, config, isLight]);

  // Helpers for canvas drawing
  const valToY = (val: number, minVal: number, maxVal: number, top: number, height: number) => {
    const range = maxVal - minVal || 1;
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return top + height - ((clamped - minVal) / range) * height;
  };

  const drawPlotBackground = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    unit: string
  ) => {
    // Fill box
    ctx.fillStyle = colors.boxBg;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = colors.boxBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Title & Unit badge
    ctx.fillStyle = colors.titleText;
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText(title, x + 8, y + 14);

    ctx.fillStyle = colors.unitText;
    ctx.font = '500 10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`[${unit}]`, x + w - 8, y + 14);
    ctx.textAlign = 'left';
  };

  const drawVoltageGrid = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    minV: number,
    maxV: number
  ) => {
    if (!showGrid) return;
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 0.75;
    ctx.setLineDash([2, 2]);

    // Zero line
    const y0 = valToY(0, minV, maxV, y, h);
    if (y0 >= y && y0 <= y + h) {
      ctx.strokeStyle = colors.zeroLine;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x + w, y0);
      ctx.stroke();

      // Zero Label
      ctx.fillStyle = colors.axisText;
      ctx.font = '9px monospace';
      ctx.fillText('0V', x - 28, y0 + 3);
    }

    // Max V Label
    ctx.fillStyle = colors.axisText;
    ctx.font = '9px monospace';
    ctx.fillText(`${maxV}V`, x - 38, y + 10);
    if (minV < 0) {
      ctx.fillText(`${minV}V`, x - 38, y + h - 2);
    }

    // Vertical angle markers (0°, 90°, 180°, 270°, 360°)
    ctx.strokeStyle = colors.gridLine;
    const numCycles = cyclesCount;
    for (let c = 0; c < numCycles; c++) {
      const angles = [0, 90, 180, 270, 360];
      angles.forEach((deg) => {
        if (c > 0 && deg === 0) return;
        const totalDeg = c * 360 + deg;
        const frac = totalDeg / (numCycles * 360);
        const gx = x + frac * w;
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx, y + h);
        ctx.stroke();

        ctx.fillStyle = colors.axisText;
        ctx.fillText(`${deg}°`, gx - 8, y + h + 12);
      });
    }
    ctx.setLineDash([]);
  };

  const drawCurrentGrid = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    minI: number,
    maxI: number
  ) => {
    if (!showGrid) return;
    ctx.strokeStyle = colors.gridLine;
    ctx.lineWidth = 0.75;
    ctx.setLineDash([2, 2]);

    const y0 = valToY(0, minI, maxI, y, h);
    if (y0 >= y && y0 <= y + h) {
      ctx.strokeStyle = colors.zeroLine;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x + w, y0);
      ctx.stroke();

      ctx.fillStyle = colors.axisText;
      ctx.font = '9px monospace';
      ctx.fillText('0A', x - 26, y0 + 3);
    }

    ctx.fillStyle = colors.axisText;
    ctx.font = '9px monospace';
    ctx.fillText(`${maxI}A`, x - 32, y + 10);
    if (minI < 0) {
      ctx.fillText(`${minI}A`, x - 32, y + h - 2);
    }
    ctx.setLineDash([]);
  };

  const drawSingleWave = (
    ctx: CanvasRenderingContext2D,
    accessor: (p: SimulationPoint) => number,
    minVal: number,
    maxVal: number,
    top: number,
    h: number,
    color: string,
    width: number,
    totalSteps: number,
    totalPoints: number,
    padL: number,
    plotW: number
  ) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    for (let s = 0; s < totalSteps; s++) {
      const pt = points[s % totalPoints];
      const x = padL + (s / (totalSteps - 1)) * plotW;
      const y = valToY(accessor(pt), minVal, maxVal, top, h);
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const drawGatePulseTrack = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    totalSteps: number,
    totalPoints: number
  ) => {
    for (let s = 0; s < totalSteps; s++) {
      const pt = points[s % totalPoints];
      const hasAnyGate = Object.values(pt.gatePulses).some(Boolean);
      if (hasAnyGate) {
        const gx = x + (s / (totalSteps - 1)) * w;
        ctx.fillStyle = colors.gatePulse;
        ctx.fillRect(gx - 1.5, y - 4, 3, h + 4);
      }
    }
  };

  interface ConductionSegment {
    label: string;
    startStep: number;
    endStep: number;
    devices: string[];
    isDCM: boolean;
    isFreewheel: boolean;
    type: 'diode' | 'thyristor' | 'mixed' | 'fwd' | 'dcm';
  }

  const drawConductionStrip = (
    ctx: CanvasRenderingContext2D,
    padL: number,
    yStrip: number,
    plotW: number,
    hStrip: number,
    totalSteps: number,
    totalPoints: number,
    currentIndex: number,
    cyclesCount: number
  ) => {
    // 1. Text badge on the left margin
    ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
    ctx.font = 'bold 8.5px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('ACTIVE', padL - 8, yStrip + hStrip / 2 - 5);
    ctx.fillText('PAIR', padL - 8, yStrip + hStrip / 2 + 5);

    // 2. Base container background
    ctx.fillStyle = isLight ? 'rgba(248, 250, 252, 0.95)' : 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(padL, yStrip, plotW, hStrip, 4);
    } else {
      ctx.rect(padL, yStrip, plotW, hStrip);
    }
    ctx.fill();
    ctx.strokeStyle = isLight ? 'rgba(203, 213, 225, 0.9)' : 'rgba(51, 65, 85, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. Current active scrubber position
    const cycleFrac = (currentIndex / (totalPoints - 1)) / cyclesCount;
    const currentX = padL + cycleFrac * plotW;

    // Build contiguous segments
    const segments: ConductionSegment[] = [];
    for (let s = 0; s < totalSteps; s++) {
      const pt = points[s % totalPoints];
      const dev = getActiveDeviceAtPoint(pt, config);
      if (segments.length === 0) {
        segments.push({
          label: dev.label,
          startStep: s,
          endStep: s,
          devices: dev.devices,
          isDCM: dev.isDCM,
          isFreewheel: dev.isFreewheel,
          type: dev.type,
        });
      } else {
        const last = segments[segments.length - 1];
        if (last.label === dev.label) {
          last.endStep = s;
        } else {
          segments.push({
            label: dev.label,
            startStep: s,
            endStep: s,
            devices: dev.devices,
            isDCM: dev.isDCM,
            isFreewheel: dev.isFreewheel,
            type: dev.type,
          });
        }
      }
    }

    // Clean up micro-glitches of 1 step between same labels
    for (let i = 1; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (seg.endStep - seg.startStep <= 1) {
        if (segments[i - 1].label === segments[i + 1].label) {
          segments[i - 1].endStep = segments[i + 1].endStep;
          segments.splice(i, 2);
          i--;
        }
      }
    }

    // 4. Render each segment
    segments.forEach((seg) => {
      const x1 = padL + (seg.startStep / (totalSteps - 1)) * plotW;
      const x2 = padL + (seg.endStep / (totalSteps - 1)) * plotW;
      const segW = Math.max(1, x2 - x1);

      const isCurrent = currentX >= x1 - 0.5 && currentX <= x2 + 0.5;

      let fillBg = '';
      let borderStroke = '';
      let textColor = '';

      if (seg.isDCM) {
        fillBg = isCurrent
          ? (isLight ? 'rgba(203, 213, 225, 0.95)' : 'rgba(51, 65, 85, 0.85)')
          : (isLight ? 'rgba(241, 245, 249, 0.6)' : 'rgba(30, 41, 59, 0.45)');
        borderStroke = isCurrent ? (isLight ? '#475569' : '#94a3b8') : (isLight ? '#cbd5e1' : '#334155');
        textColor = isLight ? '#64748b' : '#94a3b8';
      } else if (seg.isFreewheel) {
        fillBg = isCurrent
          ? (isLight ? 'rgba(253, 230, 138, 0.95)' : 'rgba(180, 83, 9, 0.65)')
          : (isLight ? 'rgba(254, 243, 199, 0.75)' : 'rgba(120, 53, 15, 0.35)');
        borderStroke = isCurrent ? '#d97706' : (isLight ? '#fcd34d' : '#92400e');
        textColor = isLight ? '#92400e' : '#fde68a';
      } else if (seg.type === 'thyristor') {
        fillBg = isCurrent
          ? (isLight ? 'rgba(167, 243, 208, 0.95)' : 'rgba(6, 95, 70, 0.75)')
          : (isLight ? 'rgba(209, 250, 229, 0.75)' : 'rgba(6, 78, 59, 0.35)');
        borderStroke = isCurrent ? (isLight ? '#059669' : '#10b981') : (isLight ? '#6ee7b7' : '#047857');
        textColor = isLight ? '#065f46' : '#a7f3d0';
      } else if (seg.type === 'diode') {
        fillBg = isCurrent
          ? (isLight ? 'rgba(186, 230, 253, 0.95)' : 'rgba(3, 105, 161, 0.75)')
          : (isLight ? 'rgba(224, 242, 254, 0.75)' : 'rgba(12, 74, 110, 0.35)');
        borderStroke = isCurrent ? (isLight ? '#0284c7' : '#38bdf8') : (isLight ? '#7dd3fc' : '#0369a1');
        textColor = isLight ? '#0369a1' : '#bae6fd';
      } else {
        // Mixed
        fillBg = isCurrent
          ? (isLight ? 'rgba(221, 214, 254, 0.95)' : 'rgba(91, 33, 182, 0.75)')
          : (isLight ? 'rgba(237, 233, 254, 0.75)' : 'rgba(76, 29, 149, 0.35)');
        borderStroke = isCurrent ? '#8b5cf6' : (isLight ? '#c4b5fd' : '#6d28d9');
        textColor = isLight ? '#5b21b6' : '#ddd6fe';
      }

      // Draw segment fill
      ctx.fillStyle = fillBg;
      ctx.fillRect(x1, yStrip + 1, segW, hStrip - 2);

      // Left vertical divider line
      ctx.beginPath();
      ctx.strokeStyle = isCurrent ? borderStroke : (isLight ? 'rgba(148, 163, 184, 0.75)' : 'rgba(71, 85, 105, 0.75)');
      ctx.lineWidth = isCurrent ? 1.8 : 1;
      ctx.moveTo(x1, yStrip);
      ctx.lineTo(x1, yStrip + hStrip);
      ctx.stroke();

      // Commutation tick above strip
      ctx.beginPath();
      ctx.strokeStyle = isLight ? 'rgba(100, 116, 139, 0.6)' : 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 1;
      ctx.moveTo(x1, yStrip - 3);
      ctx.lineTo(x1, yStrip);
      ctx.stroke();

      // Active segment highlight frame & indicator
      if (isCurrent) {
        ctx.strokeStyle = borderStroke;
        ctx.lineWidth = 1.8;
        ctx.strokeRect(x1, yStrip + 1, segW, hStrip - 2);

        // Indicator dot at top of active segment
        ctx.fillStyle = borderStroke;
        ctx.beginPath();
        ctx.arc(x1 + segW / 2, yStrip + 3.5, 2, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Label text
      const cx = x1 + segW / 2;
      const cy = yStrip + hStrip / 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textColor;

      if (segW >= 30) {
        ctx.font = isCurrent ? 'bold 11px monospace' : '600 10.5px monospace';
        ctx.fillText(seg.label, cx, cy);
      } else if (segW >= 18) {
        ctx.font = isCurrent ? 'bold 9.5px monospace' : '600 9px monospace';
        ctx.fillText(seg.label, cx, cy);
      } else if (segW >= 12) {
        ctx.font = 'bold 7.5px monospace';
        ctx.fillText(seg.label.replace(/\s+/g, ''), cx, cy);
      }
    });

    // Right closing boundary
    ctx.beginPath();
    ctx.strokeStyle = isLight ? 'rgba(203, 213, 225, 0.9)' : 'rgba(51, 65, 85, 0.8)';
    ctx.lineWidth = 1;
    ctx.moveTo(padL + plotW, yStrip);
    ctx.lineTo(padL + plotW, yStrip + hStrip);
    ctx.stroke();
  };

  const drawScrubber = (
    ctx: CanvasRenderingContext2D,
    padL: number,
    padT: number,
    plotW: number,
    plotH: number,
    idx: number,
    totalPoints: number,
    cyclesCount: number
  ) => {
    const fraction = idx / (totalPoints - 1);
    // Draw exactly ONE single vertical cursor line at the current time/angle
    const cycleFrac = fraction / cyclesCount;
    const sx = padL + cycleFrac * plotW;

    // Glowing vertical line
    ctx.beginPath();
    ctx.strokeStyle = colors.scrubberLine;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.moveTo(sx, padT);
    ctx.lineTo(sx, padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Top Scrubber Handle Badge
    ctx.fillStyle = colors.scrubberHandle;
    ctx.beginPath();
    ctx.arc(sx, padT, 4, 0, 2 * Math.PI);
    ctx.fill();

    // Bottom Scrubber indicator
    ctx.fillStyle = colors.scrubberLine;
    ctx.beginPath();
    ctx.arc(sx, padT + plotH, 3, 0, 2 * Math.PI);
    ctx.fill();
  };

  const drawHarmonics = (
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    padL: number,
    padR: number,
    padT: number,
    padB: number
  ) => {
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    drawPlotBackground(ctx, padL, padT, plotW, plotH, 'Harmonic Spectrum of AC Source Current i_s (FFT Decomposition)', '% of Fundamental');

    const harmonics = simResult.harmonics || [];
    if (harmonics.length === 0) return;

    const barW = Math.min(36, (plotW / harmonics.length) * 0.6);
    const spacing = plotW / harmonics.length;

    harmonics.forEach((h, i) => {
      const bx = padL + i * spacing + spacing / 2 - barW / 2;
      const barH = (h.percent / 100) * (plotH - 50);
      const by = padT + plotH - 30 - barH;

      // Color gradient
      const isFund = h.harmonic === 1;
      ctx.fillStyle = isFund ? (isLight ? '#059669' : '#10b981') : (isLight ? '#0284c7' : '#38bdf8');
      ctx.fillRect(bx, by, barW, barH);
      ctx.strokeStyle = isFund ? (isLight ? '#047857' : '#059669') : (isLight ? '#0369a1' : '#0284c7');
      ctx.strokeRect(bx, by, barW, barH);

      // Percentage label on top of bar
      ctx.fillStyle = isLight ? '#334155' : '#cbd5e1';
      ctx.font = '600 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${h.percent.toFixed(1)}%`, bx + barW / 2, by - 4);

      // Harmonic order label below
      ctx.fillStyle = isFund ? (isLight ? '#065f46' : '#34d399') : (isLight ? '#64748b' : '#94a3b8');
      ctx.font = isFund ? 'bold 10px sans-serif' : '10px sans-serif';
      ctx.fillText(`h=${h.harmonic}`, bx + barW / 2, padT + plotH - 12);
      ctx.textAlign = 'left';
    });
  };

  return (
    <div
      id="waveform-viewer-container"
      className={`flex flex-col h-full rounded-xl overflow-hidden transition-colors duration-200 border shadow-md ${
        isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 shadow-2xl'
      }`}
    >
      {/* Top Waveform Controls & Legend */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b transition-colors duration-200 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800/80'
        }`}
      >
        {/* Mode Selector Tabs */}
        <div
          className={`flex items-center gap-1 p-1 rounded-lg border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <button
            id="btn-tab-superimposed"
            onClick={() => setViewMode('superimposed')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              viewMode === 'superimposed'
                ? isLight
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-500 text-slate-950 shadow-sm'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Superimposed
          </button>
          <button
            id="btn-tab-stacked"
            onClick={() => setViewMode('stacked')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              viewMode === 'stacked'
                ? isLight
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-500 text-slate-950 shadow-sm'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Oscilloscope Channels
          </button>
          <button
            id="btn-tab-harmonics"
            onClick={() => setViewMode('harmonics')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              viewMode === 'harmonics'
                ? isLight
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-500 text-slate-950 shadow-sm'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Harmonics (FFT)
          </button>
        </div>

        {/* View Options & Cycle Toggle */}
        <div className="flex items-center gap-2">
          {config.phaseMode === '3-phase' && viewMode !== 'harmonics' && (
            <div
              id="three-phase-waveform-controls"
              className={`flex items-center gap-1 p-0.5 rounded-lg border ${
                isLight ? 'bg-slate-100 border-slate-300 shadow-xs' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <button
                id="btn-toggle-line-voltages"
                onClick={() => {
                  if (showLineVoltages && !showPhaseVoltages) {
                    setShowPhaseVoltages(true);
                  }
                  setShowLineVoltages((prev) => !prev);
                }}
                className={`px-2 py-1 text-xs font-semibold rounded transition flex items-center gap-1.5 ${
                  showLineVoltages
                    ? isLight
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-500 text-slate-950 font-bold shadow-xs'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Toggle 3-Phase Line-to-Line AC Voltages (v_ab, v_bc, v_ca)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
                Line (V_LL)
              </button>
              <button
                id="btn-toggle-phase-voltages"
                onClick={() => {
                  if (showPhaseVoltages && !showLineVoltages) {
                    setShowLineVoltages(true);
                  }
                  setShowPhaseVoltages((prev) => !prev);
                }}
                className={`px-2 py-1 text-xs font-semibold rounded transition flex items-center gap-1.5 ${
                  showPhaseVoltages
                    ? isLight
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-500 text-slate-950 font-bold shadow-xs'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Toggle 3-Phase Star Phase Voltages (v_an, v_bn, v_cn)"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${showPhaseVoltages ? 'bg-current' : 'bg-rose-500'}`}></span>
                Phase (V_ph)
              </button>
              <button
                id="btn-toggle-all-currents"
                onClick={() => setShowAllPhaseCurrents((prev) => !prev)}
                className={`px-2 py-1 text-xs font-semibold rounded transition flex items-center gap-1.5 ${
                  showAllPhaseCurrents
                    ? isLight
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-500 text-slate-950 font-bold shadow-xs'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Toggle All 3-Phase Line Currents (i_a, i_b, i_c) vs Phase A (i_a)"
              >
                {showAllPhaseCurrents ? 'Currents (ia,ib,ic)' : 'i_a (Line A)'}
              </button>
            </div>
          )}

          {viewMode !== 'harmonics' && (
            <>
              <button
                onClick={() => setCyclesCount((prev) => (prev === 1 ? 2 : 1))}
                className={`px-2 py-1 text-xs font-mono rounded border flex items-center gap-1 transition ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Toggle 1 or 2 AC line cycles"
              >
                {cyclesCount === 1 ? '1 Cycle (360°)' : '2 Cycles (720°)'}
              </button>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-1.5 rounded border text-xs font-medium transition ${
                  showGrid
                    ? isLight
                      ? 'bg-sky-50 text-sky-700 border-sky-300'
                      : 'bg-slate-800 text-sky-400 border-slate-700'
                    : isLight
                    ? 'bg-white text-slate-400 border-slate-200'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
                title="Toggle Grid Lines"
              >
                # Grid
              </button>

              <button
                onClick={() => setShowRmsAvg(!showRmsAvg)}
                className={`p-1.5 rounded border text-xs font-medium transition ${
                  showRmsAvg
                    ? isLight
                      ? 'bg-purple-50 text-purple-700 border-purple-300'
                      : 'bg-slate-800 text-violet-400 border-slate-700'
                    : isLight
                    ? 'bg-white text-slate-400 border-slate-200'
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
                title="Toggle Vdc Average Reference Line"
              >
                V_avg
              </button>
            </>
          )}

          {onOpenFullScreen && (
            <button
              id="btn-waveform-open-fullscreen"
              onClick={onOpenFullScreen}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition shadow-xs ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Open Waveforms in Full Screen Mode"
            >
              <Maximize2 className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden sm:inline">Full Screen</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Waveform Canvas */}
      <div
        className={`relative flex-1 min-h-[350px] w-full cursor-crosshair transition-colors duration-200 ${
          isLight ? 'bg-white' : 'bg-slate-950'
        }`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      {/* Interactive Time Scrubber Slider Bar below canvas */}
      <div
        className={`flex items-center gap-3 px-4 py-2 border-t transition-colors duration-200 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}
      >
        <Compass className={`w-4 h-4 shrink-0 ${isLight ? 'text-sky-600' : 'text-sky-400'}`} />
        <span className={`text-xs font-mono shrink-0 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Angle ωt:</span>
        <input
          id="waveform-angle-scrubber"
          type="range"
          min={0}
          max={totalPoints - 1}
          value={currentIndex}
          onChange={(e) => onSeekIndex(parseInt(e.target.value, 10))}
          className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
            isLight ? 'bg-slate-200 accent-sky-600' : 'bg-slate-800 accent-sky-400'
          }`}
        />
        <span
          className={`text-xs font-mono font-bold min-w-[48px] text-right ${
            isLight ? 'text-sky-700' : 'text-sky-400'
          }`}
        >
          {currentPt ? currentPt.thetaDeg.toFixed(1) : '0.0'}°
        </span>
      </div>
    </div>
  );
};

