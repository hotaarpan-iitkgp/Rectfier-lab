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
      // 2 Sub-plots: Top = Voltages (Vs & Vo Superimposed), Bottom = Currents (Io & Is) + Gate Pulses
      const hTop = plotH * 0.58;
      const hBot = plotH * 0.38;
      const yTopStart = padT;
      const yBotStart = padT + hTop + 14;

      // --- Top Plot: Voltages (Vs, Vo, E) ---
      const topTitle = config.phaseMode === '3-phase' && config.circuitType === 'full-bridge'
        ? 'Voltage Waveforms (v_line & v_o Superimposed)'
        : 'Voltage Waveforms (v_s & v_o Superimposed)';
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
      } else if (config.circuitType === 'full-bridge') {
        // 3-Phase Full-Bridge: Draw 6 Line-to-Line Voltages (vAB, vBC, vCA and -vAB, -vBC, -vCA)
        const drawLineV = (accessor: (p: SimulationPoint) => number, color: string) => {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.1;
          ctx.setLineDash([3, 3]);
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
        // Line voltages
        const alphaLine = isLight ? 0.65 : 0.55;
        const alphaInv = isLight ? 0.45 : 0.35;
        drawLineV((p) => p.vSourceLineAB, `rgba(239, 68, 68, ${alphaLine})`);   // Red: vAB
        drawLineV((p) => p.vSourceLineBC, `rgba(245, 158, 11, ${alphaLine})`);  // Amber: vBC
        drawLineV((p) => p.vSourceLineCA, `rgba(59, 130, 246, ${alphaLine})`);  // Blue: vCA
        drawLineV((p) => -p.vSourceLineAB, `rgba(239, 68, 68, ${alphaInv})`);  // vBA
        drawLineV((p) => -p.vSourceLineBC, `rgba(245, 158, 11, ${alphaInv})`); // vCB
        drawLineV((p) => -p.vSourceLineCA, `rgba(59, 130, 246, ${alphaInv})`); // vAC
      } else {
        // 3-Phase Half-Wave: Draw Phase voltages: vA (red), vB (amber), vC (blue)
        const drawPhaseLine = (accessor: (p: SimulationPoint) => number, color: string) => {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 3]);
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
        drawPhaseLine((p) => p.vSourceA, isLight ? 'rgba(220, 38, 38, 0.8)' : 'rgba(239, 68, 68, 0.7)'); // Red Ph A
        drawPhaseLine((p) => p.vSourceB, isLight ? 'rgba(217, 119, 6, 0.8)' : 'rgba(245, 158, 11, 0.7)'); // Amber Ph B
        drawPhaseLine((p) => p.vSourceC, isLight ? 'rgba(37, 99, 235, 0.8)' : 'rgba(59, 130, 246, 0.7)'); // Blue Ph C
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
      drawPlotBackground(ctx, padL, yBotStart, plotW, hBot, 'Current Waveforms (i_o & i_s)', 'A');
      drawCurrentGrid(ctx, padL, yBotStart, plotW, hBot, -maxI, maxI);

      // Draw Source Current i_s(t)
      ctx.beginPath();
      ctx.strokeStyle = colors.iSource;
      ctx.lineWidth = 1.5;
      for (let s = 0; s < totalSteps; s++) {
        const pt = points[s % totalPoints];
        const x = getX(s);
        const y = valToY(pt.iSource, -maxI, maxI, yBotStart, hBot);
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Output Load Current i_o(t) in Amber/Gold
      ctx.beginPath();
      ctx.strokeStyle = colors.iLoad;
      ctx.lineWidth = 2.2;
      for (let s = 0; s < totalSteps; s++) {
        const pt = points[s % totalPoints];
        const x = getX(s);
        const y = valToY(pt.iLoad, -maxI, maxI, yBotStart, hBot);
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Gate Pulses at Bottom of the Lower Plot
      drawGatePulseTrack(ctx, padL, yBotStart + hBot - 14, plotW, 10, totalSteps, totalPoints);

      // Scrubber Cursor Line
      drawScrubber(ctx, padL, padT, plotW, plotH, currentIndex, totalPoints, cyclesCount);

    } else if (viewMode === 'stacked') {
      // 4 Separate Stacked oscilloscope tracks: Vo, Io, Vs, Is
      const numTracks = 4;
      const trackH = (plotH - (numTracks - 1) * 8) / numTracks;

      // Track 1: Output Voltage v_o
      const y1 = padT;
      drawPlotBackground(ctx, padL, y1, plotW, trackH, 'Load Voltage v_o(t)', 'V');
      drawVoltageGrid(ctx, padL, y1, plotW, trackH, minV, maxV);
      drawSingleWave(ctx, (p) => p.vLoad, minV, maxV, y1, trackH, colors.vLoad, 2.2, totalSteps, totalPoints, padL, plotW);

      // Track 2: Load Current i_o
      const y2 = y1 + trackH + 8;
      drawPlotBackground(ctx, padL, y2, plotW, trackH, 'Load Current i_o(t)', 'A');
      drawCurrentGrid(ctx, padL, y2, plotW, trackH, 0, maxI);
      drawSingleWave(ctx, (p) => p.iLoad, 0, maxI, y2, trackH, colors.iLoad, 2.2, totalSteps, totalPoints, padL, plotW);

      // Track 3: Source Voltage v_s
      const y3 = y2 + trackH + 8;
      drawPlotBackground(ctx, padL, y3, plotW, trackH, 'Source AC Voltage v_s(t)', 'V');
      drawVoltageGrid(ctx, padL, y3, plotW, trackH, -maxV, maxV);
      drawSingleWave(ctx, (p) => p.vSourceA, -maxV, maxV, y3, trackH, colors.vSourceA, 1.8, totalSteps, totalPoints, padL, plotW);

      // Track 4: Source Current i_s
      const y4 = y3 + trackH + 8;
      drawPlotBackground(ctx, padL, y4, plotW, trackH, 'Source AC Current i_s(t)', 'A');
      drawCurrentGrid(ctx, padL, y4, plotW, trackH, -maxI, maxI);
      drawSingleWave(ctx, (p) => p.iSource, -maxI, maxI, y4, trackH, colors.iSource, 1.8, totalSteps, totalPoints, padL, plotW);

      // Scrubber
      drawScrubber(ctx, padL, padT, plotW, plotH, currentIndex, totalPoints, cyclesCount);
    }
  }, [viewMode, cyclesCount, showGrid, showRmsAvg, currentIndex, points, simResult, config, isLight]);

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

      {/* Legend Indicator Pills */}
      {viewMode === 'superimposed' && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 border-b text-[11px] transition-colors duration-200 ${
            isLight ? 'bg-slate-50/80 border-slate-200 text-slate-700' : 'bg-slate-950/40 border-slate-800/40 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 font-medium ${
                isLight ? 'text-emerald-700' : 'text-emerald-400'
              }`}
            >
              <span className="w-3 h-1 bg-emerald-500 rounded"></span>
              v_o(t) Load Voltage
            </span>
            <span
              className={`flex items-center gap-1.5 font-medium ${
                isLight ? 'text-sky-700' : 'text-sky-400'
              }`}
            >
              <span className="w-3 h-0.5 border-t border-dashed border-sky-500"></span>
              v_s(t) Source AC
            </span>
            <span
              className={`flex items-center gap-1.5 font-medium ${
                isLight ? 'text-amber-700' : 'text-amber-400'
              }`}
            >
              <span className="w-3 h-1 bg-amber-500 rounded"></span>
              i_o(t) Load Current
            </span>
            <span
              className={`flex items-center gap-1.5 font-medium ${
                isLight ? 'text-indigo-700' : 'text-sky-300'
              }`}
            >
              <span className="w-3 h-0.5 bg-indigo-500"></span>
              i_s(t) Source Current
            </span>
            {Object.values(config.switches).some((s) => s === 'thyristor') && (
              <span
                className={`flex items-center gap-1.5 font-medium ${
                  isLight ? 'text-amber-800' : 'text-yellow-300'
                }`}
              >
                <span className="w-1.5 h-3 bg-amber-500 rounded-sm"></span>
                Gate Pulses (α = {config.alpha}°)
              </span>
            )}
          </div>

          {/* Instant Cursor Values readout */}
          {currentPt && (
            <div
              className={`flex items-center gap-2 font-mono text-[11px] px-2 py-0.5 rounded border ${
                isLight
                  ? 'text-slate-800 bg-white border-slate-200 shadow-xs'
                  : 'text-slate-300 bg-slate-900 border-slate-800'
              }`}
            >
              <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
                θ = <b className={isLight ? 'text-sky-700' : 'text-sky-300'}>{currentPt.thetaDeg.toFixed(0)}°</b>
              </span>
              <span className={isLight ? 'text-slate-300' : 'text-slate-500'}>|</span>
              <span>
                vo = <b className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>{currentPt.vLoad.toFixed(1)}V</b>
              </span>
              <span className={isLight ? 'text-slate-300' : 'text-slate-500'}>|</span>
              <span>
                io = <b className={isLight ? 'text-amber-700' : 'text-amber-400'}>{currentPt.iLoad.toFixed(2)}A</b>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Waveform Canvas */}
      <div
        className={`relative flex-1 min-h-[300px] w-full cursor-crosshair transition-colors duration-200 ${
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

