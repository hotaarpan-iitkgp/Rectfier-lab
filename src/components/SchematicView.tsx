import React, { useState, useRef, useEffect } from 'react';
import { ConverterConfig, DeviceType, SimulationPoint } from '../types';
import { useTheme } from '../context/ThemeContext';
import { Activity, ArrowRight, Zap, CheckCircle2, ShieldAlert, Maximize2 } from 'lucide-react';

interface SchematicViewProps {
  config: ConverterConfig;
  currentPoint: SimulationPoint | null;
  isPlaying?: boolean;
  onToggleSwitch: (switchId: string) => void;
  onToggleFWD: () => void;
  onToggleFWDActive: () => void;
  onSelectLoad: () => void;
  onOpenFullScreen?: () => void;
}

export const SchematicView: React.FC<SchematicViewProps> = ({
  config,
  currentPoint,
  isPlaying = false,
  onToggleSwitch,
  onToggleFWD,
  onToggleFWDActive,
  onSelectLoad,
  onOpenFullScreen,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { phaseMode, circuitType, switches, hasFWD, isFWDActive, loadType, loadParams, alpha } = config;
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Synchronize SVG SMIL particle animations with play/pause state
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      if (isPlaying) {
        if (typeof svg.unpauseAnimations === 'function' && typeof svg.animationsPaused === 'function') {
          if (svg.animationsPaused()) {
            svg.unpauseAnimations();
          }
        }
      } else {
        if (typeof svg.pauseAnimations === 'function' && typeof svg.animationsPaused === 'function') {
          if (!svg.animationsPaused()) {
            svg.pauseAnimations();
          }
        }
      }
    } catch (e) {
      console.warn('SVG animations play/pause control error:', e);
    }
  }, [isPlaying, currentPoint]);

  const switchStates = currentPoint?.switchStates || {};
  const gatePulses = currentPoint?.gatePulses || {};
  const isFWDConducting = currentPoint ? currentPoint.iFWD > 0.001 : false;
  const iLoadVal = currentPoint ? currentPoint.iLoad : 0;
  const vLoadVal = currentPoint ? currentPoint.vLoad : 0;
  const vSourceVal = currentPoint ? currentPoint.vSourceA : 0;

  /**
   * Render Semiconductor Device (Diode or Thyristor)
   * In a rectifier bridge, all devices point UPWARDS towards the positive DC rail.
   * direction = 'up': Anode is at bottom, Cathode bar is at top (for bridge legs).
   * direction = 'right': Anode is at left, Cathode bar is at right (for series half-wave top rail).
   */
  const renderDeviceSymbol = (
    id: string,
    cx: number,
    cy: number,
    type: DeviceType,
    isConducting: boolean,
    isGateFiring: boolean,
    label: string,
    subLabel?: string,
    direction: 'up' | 'down' | 'right' = 'up'
  ) => {
    const isHovered = hoveredDevice === id;
    const isThyristor = type === 'thyristor';
    const isRight = direction === 'right';

    // Geometry parameters
    const triWidth = 14;
    const anodeY = cy + 12;
    const cathodeY = cy - 10;

    // Color logic
    let strokeColor = isLight ? '#94a3b8' : '#64748b'; // slate-400 / slate-500
    let fillColor = isLight ? '#ffffff' : '#1e293b'; // white / slate-800
    let glowFilter = '';

    if (isConducting) {
      strokeColor = isLight ? '#059669' : '#10b981'; // emerald-600 / emerald-500
      fillColor = isLight ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.3)';
      glowFilter = isLight ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))' : 'drop-shadow(0 0 8px #10b981)';
    } else if (isGateFiring) {
      strokeColor = isLight ? '#d97706' : '#f59e0b'; // amber-600 / amber-500
      fillColor = isLight ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.35)';
      glowFilter = isLight ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.4))' : 'drop-shadow(0 0 10px #f59e0b)';
    } else if (isHovered) {
      strokeColor = isLight ? '#0284c7' : '#38bdf8'; // sky-600 / sky-400
      fillColor = isLight ? '#f0f9ff' : '#0f172a';
    }

    return (
      <g
        key={id}
        id={`device-${id}`}
        className="cursor-pointer group select-none transition-all duration-200"
        onClick={() => onToggleSwitch(id)}
        onMouseEnter={() => setHoveredDevice(id)}
        onMouseLeave={() => setHoveredDevice(null)}
        style={{ filter: glowFilter }}
      >
        {/* Switch Card Container Frame */}
        <rect
          x={cx - 30}
          y={isRight ? cy - 30 : cy - 34}
          width={60}
          height={isRight ? 60 : 68}
          rx={10}
          fill={
            isConducting
              ? isLight
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(16, 185, 129, 0.15)'
              : isHovered
              ? isLight
                ? 'rgba(2, 132, 199, 0.08)'
                : 'rgba(56, 189, 248, 0.12)'
              : isLight
              ? '#ffffff'
              : 'rgba(15, 23, 42, 0.65)'
          }
          stroke={
            isConducting
              ? isLight
                ? '#059669'
                : '#10b981'
              : isGateFiring
              ? isLight
                ? '#d97706'
                : '#f59e0b'
              : isHovered
              ? isLight
                ? '#0284c7'
                : '#38bdf8'
              : isLight
              ? '#cbd5e1'
              : '#334155'
          }
          strokeWidth={isConducting ? 1.75 : 1}
          style={{
            filter: isConducting
              ? isLight
                ? 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.25))'
                : 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.45))'
              : undefined,
          }}
        />

        {/* Switch State Indicator inside Card (ON / OFF) */}
        <text
          x={isRight ? cx - 18 : cx - 16}
          y={cy + 22}
          fontSize="9.5"
          fontWeight="bold"
          fill={isConducting ? (isLight ? '#059669' : '#34d399') : isLight ? '#64748b' : '#64748b'}
          fontFamily="monospace"
        >
          {isConducting ? 'ON' : 'OFF'}
        </text>

        {/* Switch Identifier Label inside Card */}
        <text
          x={isRight ? cx - 18 : cx - 16}
          y={isRight ? cy - 16 : cy - 20}
          fontSize="10"
          fontWeight="bold"
          fill={isConducting ? (isLight ? '#065f46' : '#a7f3d0') : isLight ? '#1e293b' : '#cbd5e1'}
          fontFamily="monospace"
        >
          {label}
        </text>

        {/* Sub-label inside card */}
        {subLabel && (
          <text
            x={isRight ? cx - 18 : cx - 16}
            y={isRight ? cy - 6 : cy - 9}
            fontSize="8"
            fill={isConducting ? (isLight ? '#047857' : '#6ee7b7') : isLight ? '#64748b' : '#94a3b8'}
          >
            {subLabel}
          </text>
        )}

        {/* HORIZONTAL ORIENTATION (direction === 'right') */}
        {isRight ? (
          <g>
            {/* Left Lead (Anode in) */}
            <line
              x1={cx - 28}
              y1={cy}
              x2={cx - 10}
              y2={cy}
              stroke={isConducting ? '#10b981' : '#475569'}
              strokeWidth={isConducting ? 2.5 : 2}
            />
            {/* Right Lead (Cathode out) */}
            <line
              x1={cx + 10}
              y1={cy}
              x2={cx + 28}
              y2={cy}
              stroke={isConducting ? '#10b981' : '#475569'}
              strokeWidth={isConducting ? 2.5 : 2}
            />

            {/* Anode to Cathode Triangle (Pointing RIGHT) */}
            <polygon
              points={`${cx - 10},${cy - 12} ${cx - 10},${cy + 12} ${cx + 10},${cy}`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isConducting ? 2.5 : 2}
              strokeLinejoin="round"
            />

            {/* Cathode Vertical Line Bar */}
            <line
              x1={cx + 10}
              y1={cy - 14}
              x2={cx + 10}
              y2={cy + 14}
              stroke={strokeColor}
              strokeWidth={isConducting ? 2.5 : 2}
              strokeLinecap="round"
            />

            {/* Thyristor Gate Terminal */}
            {isThyristor && (
              <g>
                <path
                  d={`M ${cx + 6} ${cy - 8} L ${cx - 2} ${cy - 20} L ${cx - 12} ${cy - 20}`}
                  fill="none"
                  stroke={isGateFiring ? '#f59e0b' : strokeColor}
                  strokeWidth={isGateFiring ? 2.5 : 1.5}
                />
                <circle
                  cx={cx - 12}
                  cy={cy - 20}
                  r={2.5}
                  fill={isGateFiring ? '#f59e0b' : strokeColor}
                />
                <text
                  x={cx - 16}
                  y={cy - 17}
                  textAnchor="end"
                  fontSize="9"
                  fill={isGateFiring ? '#fbbf24' : '#94a3b8'}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  G
                </text>
                {isGateFiring && (
                  <circle
                    cx={cx - 2}
                    cy={cy - 20}
                    r={4}
                    fill="#fbbf24"
                    className="animate-ping"
                  />
                )}
              </g>
            )}
          </g>
        ) : (
          /* VERTICAL ORIENTATION (direction === 'up') */
          <g>
            {/* Top Lead (Cathode out to + rail) */}
            <line
              x1={cx}
              y1={cy - 22}
              x2={cx}
              y2={cathodeY}
              stroke={isConducting ? '#10b981' : '#475569'}
              strokeWidth={isConducting ? 2.5 : 2}
            />
            {/* Bottom Lead (Anode in from leg) */}
            <line
              x1={cx}
              y1={anodeY}
              x2={cx}
              y2={cy + 22}
              stroke={isConducting ? '#10b981' : '#475569'}
              strokeWidth={isConducting ? 2.5 : 2}
            />

            {/* Anode to Cathode Triangle (Pointing UP) */}
            <polygon
              points={`${cx - triWidth},${anodeY} ${cx + triWidth},${anodeY} ${cx},${cathodeY}`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isConducting ? 2.5 : 2}
              strokeLinejoin="round"
            />

            {/* Cathode Line Bar */}
            <line
              x1={cx - triWidth - 2}
              y1={cathodeY}
              x2={cx + triWidth + 2}
              y2={cathodeY}
              stroke={strokeColor}
              strokeWidth={isConducting ? 2.5 : 2}
              strokeLinecap="round"
            />

            {/* Thyristor Gate Terminal & Trigger Spark */}
            {isThyristor && (
              <g>
                <path
                  d={`M ${cx - 8} ${cathodeY} L ${cx - 16} ${cathodeY - 8} L ${cx - 24} ${cathodeY - 8}`}
                  fill="none"
                  stroke={isGateFiring ? '#f59e0b' : strokeColor}
                  strokeWidth={isGateFiring ? 2.5 : 1.5}
                />
                <circle
                  cx={cx - 24}
                  cy={cathodeY - 8}
                  r={2.5}
                  fill={isGateFiring ? '#f59e0b' : strokeColor}
                />
                <text
                  x={cx - 28}
                  y={cathodeY - 5}
                  textAnchor="end"
                  fontSize="9"
                  fill={isGateFiring ? '#fbbf24' : '#94a3b8'}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  G
                </text>
                {isGateFiring && (
                  <circle
                    cx={cx - 16}
                    cy={cathodeY - 8}
                    r={4}
                    fill="#fbbf24"
                    className="animate-ping"
                  />
                )}
              </g>
            )}
          </g>
        )}
      </g>
    );
  };

  /**
   * Render Freewheeling Diode (FWD) Branch
   * Points UPWARDS: Cathode connected to Top + bus, Anode connected to Bottom - bus.
   */
  const renderFreewheelingDiode = (cx: number, cy: number, topY: number, botY: number) => {
    const isConducting = isFWDConducting;
    const isConnected = hasFWD && isFWDActive;

    const anodeY = cy + 12;
    const cathodeY = cy - 10;

    if (!isConnected) {
      // Disconnected / Inactive state: Faded, very low visibility with dotted lines and NO red
      return (
        <g
          id="fwd-branch"
          className="cursor-pointer select-none transition-opacity duration-200 opacity-40 hover:opacity-85"
          onClick={hasFWD ? onToggleFWDActive : onToggleFWD}
          onMouseEnter={() => setHoveredDevice('fwd')}
          onMouseLeave={() => setHoveredDevice(null)}
        >
          {/* Dotted connecting wire from top rail */}
          <line
            x1={cx}
            y1={topY}
            x2={cx}
            y2={cathodeY}
            stroke="#475569"
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />
          <circle cx={cx} cy={topY} r={2.5} fill="#334155" />

          {/* Dotted connecting wire to bottom rail */}
          <line
            x1={cx}
            y1={anodeY}
            x2={cx}
            y2={botY}
            stroke="#475569"
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />
          <circle cx={cx} cy={botY} r={2.5} fill="#334155" />

          {/* Faded Dotted Diode Triangle */}
          <polygon
            points={`${cx - 13},${anodeY} ${cx + 13},${anodeY} ${cx},${cathodeY}`}
            fill="none"
            stroke="#475569"
            strokeWidth={1.5}
            strokeDasharray="3,3"
            strokeLinejoin="round"
          />
          {/* Faded Dotted Cathode Line */}
          <line
            x1={cx - 15}
            y1={cathodeY}
            x2={cx + 15}
            y2={cathodeY}
            stroke="#475569"
            strokeWidth={1.5}
            strokeDasharray="3,3"
            strokeLinecap="round"
          />

          {/* Faded D_FW Badge */}
          <g transform={`translate(${cx + 18}, ${cy - 12})`}>
            <rect
              x={0}
              y={0}
              width={42}
              height={20}
              rx={4}
              fill="#0f172a"
              stroke="#334155"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <text
              x={21}
              y={14}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="bold"
              fill="#64748b"
              fontFamily="monospace"
            >
              D_FW
            </text>
          </g>

          {/* Faded Status Text */}
          <text
            x={cx}
            y={cy + 30}
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="600"
            fill="#64748b"
            letterSpacing="0.05em"
          >
            DISCONNECTED
          </text>
        </g>
      );
    }

    // Connected & Active State
    const stroke = isConducting ? '#10b981' : '#64748b';
    const fill = isConducting ? 'rgba(16, 185, 129, 0.3)' : '#1e293b';
    const filter = isConducting ? 'drop-shadow(0 0 8px #10b981)' : '';

    return (
      <g
        id="fwd-branch"
        className="cursor-pointer select-none group"
        onClick={onToggleFWDActive}
        onMouseEnter={() => setHoveredDevice('fwd')}
        onMouseLeave={() => setHoveredDevice(null)}
        style={{ filter }}
      >
        {/* Full Connecting Wire from Top DC Rail to FWD Cathode */}
        <line
          x1={cx}
          y1={topY}
          x2={cx}
          y2={cathodeY}
          stroke={isConducting ? '#10b981' : '#64748b'}
          strokeWidth={isConducting ? 2.5 : 2}
        />
        {/* Junction Dot at Top Bus */}
        <circle cx={cx} cy={topY} r={3.5} fill={isConducting ? '#10b981' : '#64748b'} />

        {/* Full Connecting Wire from FWD Anode to Bottom DC Rail */}
        <line
          x1={cx}
          y1={anodeY}
          x2={cx}
          y2={botY}
          stroke={isConducting ? '#10b981' : '#64748b'}
          strokeWidth={isConducting ? 2.5 : 2}
        />
        {/* Junction Dot at Bottom Bus */}
        <circle cx={cx} cy={botY} r={3.5} fill={isConducting ? '#10b981' : '#64748b'} />

        {/* FWD Diode Symbol pointing UPWARDS */}
        <polygon
          points={`${cx - 13},${anodeY} ${cx + 13},${anodeY} ${cx},${cathodeY}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={isConducting ? 2.5 : 2}
          strokeLinejoin="round"
        />
        {/* Cathode horizontal bar */}
        <line
          x1={cx - 15}
          y1={cathodeY}
          x2={cx + 15}
          y2={cathodeY}
          stroke={stroke}
          strokeWidth={isConducting ? 2.5 : 2}
          strokeLinecap="round"
        />

        {/* FWD Label Badge */}
        <g transform={`translate(${cx + 18}, ${cy - 12})`}>
          <rect
            x={0}
            y={0}
            width={42}
            height={20}
            rx={4}
            fill={isConducting ? (isLight ? '#dcfce7' : '#064e3b') : isLight ? '#ffffff' : '#1e293b'}
            stroke={isConducting ? (isLight ? '#059669' : '#10b981') : isLight ? '#cbd5e1' : '#475569'}
            strokeWidth={1}
          />
          <text
            x={21}
            y={14}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill={isConducting ? (isLight ? '#065f46' : '#a7f3d0') : isLight ? '#334155' : '#cbd5e1'}
            fontFamily="monospace"
          >
            D_FW
          </text>
        </g>

        {/* Status Text below FWD */}
        <text
          x={cx}
          y={cy + 30}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill={isConducting ? (isLight ? '#059669' : '#34d399') : isLight ? '#64748b' : '#94a3b8'}
        >
          {isConducting ? 'FREEWHEELING' : 'CONNECTED'}
        </text>
      </g>
    );
  };

  /**
   * Render Load Block (R, RL, or RLE) with full top-to-bottom connecting wires
   */
  const renderLoad = (cx: number, cy: number, topY: number, botY: number) => {
    const isCurrentFlowing = iLoadVal > 0.001;
    const boxTop = cy - 50;
    const boxBot = cy + 50;

    return (
      <g id="load-block" className="select-none cursor-pointer" onClick={onSelectLoad}>
        {/* Full Connecting Wire from Top DC Rail directly into Load Box */}
        <line
          x1={cx}
          y1={topY}
          x2={cx}
          y2={boxTop}
          stroke={isCurrentFlowing ? (isLight ? '#059669' : '#10b981') : isLight ? '#94a3b8' : '#475569'}
          strokeWidth={isCurrentFlowing ? 3 : 2}
        />
        {/* Top Bus Junction Dot */}
        <circle cx={cx} cy={topY} r={3.5} fill={isCurrentFlowing ? (isLight ? '#059669' : '#10b981') : isLight ? '#94a3b8' : '#64748b'} />

        {/* Full Connecting Wire from Load Box directly into Bottom DC Rail */}
        <line
          x1={cx}
          y1={boxBot}
          x2={cx}
          y2={botY}
          stroke={isCurrentFlowing ? (isLight ? '#059669' : '#10b981') : isLight ? '#94a3b8' : '#475569'}
          strokeWidth={isCurrentFlowing ? 3 : 2}
        />
        {/* Bottom Bus Junction Dot */}
        <circle cx={cx} cy={botY} r={3.5} fill={isCurrentFlowing ? (isLight ? '#059669' : '#10b981') : isLight ? '#94a3b8' : '#64748b'} />

        {/* Load Box Outer Frame */}
        <rect
          x={cx - 38}
          y={boxTop}
          width={76}
          height={100}
          rx={8}
          fill={isLight ? '#ffffff' : '#0f172a'}
          stroke={isCurrentFlowing ? (isLight ? '#0284c7' : '#38bdf8') : isLight ? '#cbd5e1' : '#334155'}
          strokeWidth={1.75}
          className="transition-colors duration-200 shadow-xs"
        />

        {/* Load Title */}
        <text
          x={cx}
          y={cy - 34}
          textAnchor="middle"
          fontSize="11"
          fontWeight="bold"
          fill={isLight ? '#0284c7' : '#38bdf8'}
          fontFamily="sans-serif"
        >
          {loadType} Load
        </text>

        {/* Resistor zig-zag */}
        <path
          d={`M ${cx - 16} ${cy - 20} l 6 -4 l 6 8 l 6 -8 l 6 8 l 6 -8 l 2 4`}
          fill="none"
          stroke={isLight ? '#64748b' : '#94a3b8'}
          strokeWidth={2}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize="9.5" fill={isLight ? '#334155' : '#cbd5e1'} fontFamily="monospace">
          R = {loadParams.R} Ω
        </text>

        {/* Inductor Coils (RL / RLE) */}
        {(loadType === 'RL' || loadType === 'RLE') && (
          <g>
            <path
              d={`M ${cx - 18} ${cy + 6} q 6 -8 12 0 q 6 -8 12 0 q 6 -8 12 0`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={2}
            />
            <text x={cx} y={cy + 18} textAnchor="middle" fontSize="9.5" fill="#fde68a" fontFamily="monospace">
              L = {loadParams.L} mH
            </text>
          </g>
        )}

        {/* Back EMF Battery (RLE) */}
        {loadType === 'RLE' && (
          <g>
            <line x1={cx - 14} y1={cy + 28} x2={cx + 14} y2={cy + 28} stroke="#ef4444" strokeWidth={2.5} />
            <line x1={cx - 8} y1={cy + 34} x2={cx + 8} y2={cy + 34} stroke="#ef4444" strokeWidth={1.5} />
            <text x={cx} y={cy + 44} textAnchor="middle" fontSize="9" fill="#fca5a5" fontFamily="monospace">
              E = {loadParams.E} V
            </text>
          </g>
        )}

        {/* Polarity Markers */}
        <text x={cx - 26} y={cy - 34} fontSize="12" fontWeight="bold" fill="#ef4444">+</text>
        <text x={cx - 26} y={cy + 44} fontSize="14" fontWeight="bold" fill="#3b82f6">-</text>

        {/* Instantaneous Load Current Badge (matching reference image) */}
        <g transform={`translate(${cx - 52}, ${cy + 60})`}>
          <rect
            x={0}
            y={0}
            width={104}
            height={22}
            rx={6}
            fill={isLight ? '#ffffff' : '#0f172a'}
            stroke={isCurrentFlowing ? (isLight ? '#0284c7' : '#38bdf8') : isLight ? '#cbd5e1' : '#334155'}
            strokeWidth={1.5}
            style={{ filter: isCurrentFlowing ? (isLight ? 'drop-shadow(0 2px 4px rgba(2, 132, 199, 0.2))' : 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.4))') : undefined }}
          />
          <text
            x={52}
            y={15}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill={isCurrentFlowing ? (isLight ? '#0284c7' : '#38bdf8') : isLight ? '#64748b' : '#64748b'}
            fontFamily="monospace"
          >
            i = {iLoadVal >= 0 ? '+' : ''}{iLoadVal.toFixed(2)}A {isCurrentFlowing ? '►' : ''}
          </text>
        </g>
      </g>
    );
  };

  /**
   * Helper to render dynamic moving electron/current particles along active loops
   * Configured with a smooth, gentle velocity (5-6s cycle) and doubled dot density so current flow is clearly visible
   */
  const renderCurrentParticles = (pathD: string, id: string, speedSec = 6.0, numDots = 24) => {
    return (
      <g id={`particles-${id}`}>
        {Array.from({ length: numDots }).map((_, i) => {
          const offset = (i / numDots) * speedSec;
          return (
            <circle
              key={i}
              r={3.2}
              fill={isLight ? '#0284c7' : '#38bdf8'}
              filter={isLight ? 'drop-shadow(0 0 3px #0284c7)' : 'drop-shadow(0 0 4px #0284c7) drop-shadow(0 0 2px #38bdf8)'}
            >
              <animateMotion
                path={pathD}
                dur={`${speedSec}s`}
                begin={`-${offset.toFixed(3)}s`}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}
      </g>
    );
  };

  return (
    <div
      id="schematic-view-container"
      className={`flex flex-col h-full rounded-xl overflow-hidden transition-colors duration-200 border shadow-md ${
        isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-900 border-slate-800 shadow-2xl'
      }`}
    >
      {/* Header Bar with Live Info */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b transition-colors duration-200 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800/80'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg border ${
              isLight ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            }`}
          >
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3
              className={`text-sm font-semibold flex items-center gap-2 ${
                isLight ? 'text-slate-800' : 'text-slate-100'
              }`}
            >
              Circuit Schematic Diagram
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {phaseMode.toUpperCase()} {circuitType.toUpperCase()}
              </span>
            </h3>
            <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Switches point upwards to + rail. Click switch to toggle{' '}
              <span className={`font-medium ${isLight ? 'text-sky-600' : 'text-sky-300'}`}>Diode ↔ Thyristor</span>.
            </p>
          </div>
        </div>

        {/* Real-time State Badge & Fullscreen Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col items-end">
            <span
              className={`text-[10px] uppercase tracking-wider font-semibold ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Active Current Loop
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                isLight
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
                  : 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50'
              }`}
            >
              {currentPoint?.conductingPathName || 'Off / DCM'}
            </span>
          </div>

          {onOpenFullScreen && (
            <button
              id="btn-schematic-open-fullscreen"
              onClick={onOpenFullScreen}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition shadow-xs ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Open Schematic Diagram in Full Screen Mode"
            >
              <Maximize2 className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden sm:inline">Full Screen</span>
            </button>
          )}
        </div>
      </div>

      {/* Main SVG Schematic Canvas */}
      <div
        className={`relative flex-1 p-2 flex items-center justify-center overflow-auto min-h-[360px] transition-colors duration-200 ${
          isLight
            ? 'bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100'
            : 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950'
        }`}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 820 480"
          className="w-full h-full max-h-[85vh] select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.75" fill={isLight ? '#94a3b8' : '#334155'} opacity={isLight ? 0.35 : 0.4} />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width="820" height="480" fill="url(#grid)" />

          {/* ========================================================= */}
          {/* === 1-PHASE FULL-BRIDGE RECTIFIER (ALL SWITCHES POINT UP) === */}
          {/* ========================================================= */}
          {phaseMode === '1-phase' && circuitType === 'full-bridge' && (() => {
            const is1PhSourceActive = (!!switchStates.S1 && !!switchStates.S2) || (!!switchStates.S3 && !!switchStates.S4);
            const isLeg1Active = !!switchStates.S1 || !!switchStates.S4;
            const isLeg2Active = !!switchStates.S3 || !!switchStates.S2;

            return (
              <g id="circuit-1ph-bridge">
                {/* Positive Top DC Bus (+ Vo) */}
                <line
                  x1={240}
                  y1={90}
                  x2={660}
                  y2={90}
                  stroke={iLoadVal > 0.001 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                  strokeWidth={iLoadVal > 0.001 ? 3 : 2}
                />
                <text x={680} y={94} fontSize="11" fontWeight="bold" fill="#ef4444" fontFamily="monospace">
                  + Vo ({vLoadVal.toFixed(1)} V)
                </text>

                {/* Negative Bottom DC Bus (- Vo) */}
                <line
                  x1={240}
                  y1={390}
                  x2={660}
                  y2={390}
                  stroke={iLoadVal > 0.001 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                  strokeWidth={iLoadVal > 0.001 ? 3 : 2}
                />
                <text x={680} y={394} fontSize="11" fontWeight="bold" fill="#3b82f6" fontFamily="monospace">
                  - Vo (GND)
                </text>

                {/* AC Source Left */}
                <g id="ac-source-1ph">
                  <circle
                    cx={90}
                    cy={240}
                    r={28}
                    fill={isLight ? '#ffffff' : '#0f172a'}
                    stroke={isLight ? '#0284c7' : '#38bdf8'}
                    strokeWidth={2}
                  />
                  <path
                    d="M 74 240 Q 82 226, 90 240 T 106 240"
                    fill="none"
                    stroke={isLight ? '#0284c7' : '#38bdf8'}
                    strokeWidth={2.5}
                  />
                  <text
                    x={90}
                    y={285}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="bold"
                    fill={isLight ? '#0f172a' : '#e2e8f0'}
                  >
                    AC Source
                  </text>
                  <text
                    x={90}
                    y={300}
                    textAnchor="middle"
                    fontSize="10"
                    fill={isLight ? '#64748b' : '#94a3b8'}
                    fontFamily="monospace"
                  >
                    vs = {vSourceVal.toFixed(1)} V
                  </text>

                  {/* Phase A Line from Source Top to Leg 1 Midpoint (x=240, y=190) */}
                  <line
                    x1={90}
                    y1={212}
                    x2={90}
                    y2={190}
                    stroke={is1PhSourceActive ? (isLight ? '#059669' : '#10b981') : (isLight ? '#0284c7' : '#38bdf8')}
                    strokeWidth={is1PhSourceActive ? 2.5 : 2}
                  />
                  <line
                    x1={90}
                    y1={190}
                    x2={240}
                    y2={190}
                    stroke={is1PhSourceActive ? (isLight ? '#059669' : '#10b981') : (isLight ? '#0284c7' : '#38bdf8')}
                    strokeWidth={is1PhSourceActive ? 2.5 : 2}
                  />
                  <text
                    x={140}
                    y={182}
                    fontSize="10"
                    fill={isLight ? '#0284c7' : '#38bdf8'}
                    fontWeight="600"
                  >
                    Phase A
                  </text>

                  {/* Neutral (N) Line from Source Bottom to Leg 2 Midpoint (x=380, y=290) */}
                  <line
                    x1={90}
                    y1={268}
                    x2={90}
                    y2={290}
                    stroke={is1PhSourceActive ? (isLight ? '#059669' : '#10b981') : (isLight ? '#64748b' : '#94a3b8')}
                    strokeWidth={is1PhSourceActive ? 2.5 : 2}
                  />
                  <line
                    x1={90}
                    y1={290}
                    x2={380}
                    y2={290}
                    stroke={is1PhSourceActive ? (isLight ? '#059669' : '#10b981') : (isLight ? '#64748b' : '#94a3b8')}
                    strokeWidth={is1PhSourceActive ? 2.5 : 2}
                  />
                  <text
                    x={140}
                    y={305}
                    fontSize="10"
                    fill={isLight ? '#64748b' : '#94a3b8'}
                    fontWeight="600"
                  >
                    Neutral (N)
                  </text>
                </g>

                {/* === LEG 1 (Phase A): S1 (Top) & S4 (Bottom) === */}
                {/* Wire from Top Bus (y=90) to S1 Cathode lead (y=118) */}
                <line
                  x1={240}
                  y1={90}
                  x2={240}
                  y2={118}
                  stroke={switchStates.S1 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                  strokeWidth={switchStates.S1 ? 2.5 : 2}
                />
                <circle
                  cx={240}
                  cy={90}
                  r={3.5}
                  fill={switchStates.S1 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#64748b')}
                />

                {/* S1 Switch (Top-Left, pointing UPWARDS) */}
                {renderDeviceSymbol('S1', 240, 140, switches.S1 || 'diode', !!switchStates.S1, !!gatePulses.S1, 'S1', 'Ph A (Top)', 'up')}

                {/* FULL CONTINUOUS CONNECTING LINE FROM S1 ANODE THROUGH MIDPOINT TO S4 CATHODE */}
                <line
                  x1={240}
                  y1={162}
                  x2={240}
                  y2={318}
                  stroke={isLeg1Active ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                  strokeWidth={isLeg1Active ? 2.5 : 2}
                />
                {/* Midpoint Junction Dot where Phase A wire connects */}
                <circle
                  cx={240}
                  cy={190}
                  r={4}
                  fill={isLeg1Active ? (isLight ? '#059669' : '#10b981') : (isLight ? '#0284c7' : '#38bdf8')}
                />

                {/* S4 Switch (Bottom-Left, pointing UPWARDS) */}
                {renderDeviceSymbol('S4', 240, 340, switches.S4 || 'diode', !!switchStates.S4, !!gatePulses.S4, 'S4', 'Ph A (Bot)', 'up')}

                {/* Wire from S4 Anode lead (y=362) to Bottom Bus (y=390) */}
                <line
                  x1={240}
                  y1={362}
                  x2={240}
                  y2={390}
                  stroke={switchStates.S4 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                  strokeWidth={switchStates.S4 ? 2.5 : 2}
                />
                <circle
                  cx={240}
                  cy={390}
                  r={3.5}
                  fill={switchStates.S4 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#64748b')}
                />

                {/* === LEG 2 (Neutral): S3 (Top) & S2 (Bottom) === */}
                {/* Wire from Top Bus (y=90) to S3 Cathode lead (y=118) */}
                <line
                  x1={380}
                  y1={90}
                  x2={380}
                  y2={118}
                  stroke={switchStates.S3 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                  strokeWidth={switchStates.S3 ? 2.5 : 2}
                />
                <circle
                  cx={380}
                  cy={90}
                  r={3.5}
                  fill={switchStates.S3 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#64748b')}
                />

                {/* S3 Switch (Top-Right, pointing UPWARDS) */}
                {renderDeviceSymbol('S3', 380, 140, switches.S3 || 'diode', !!switchStates.S3, !!gatePulses.S3, 'S3', 'Neut (Top)', 'up')}

                {/* FULL CONTINUOUS CONNECTING LINE FROM S3 ANODE THROUGH MIDPOINT TO S2 CATHODE */}
                <line
                  x1={380}
                  y1={162}
                  x2={380}
                  y2={318}
                  stroke={isLeg2Active ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                  strokeWidth={isLeg2Active ? 2.5 : 2}
                />
                {/* Midpoint Junction Dot where Neutral wire connects */}
                <circle
                  cx={380}
                  cy={290}
                  r={4}
                  fill={isLeg2Active ? (isLight ? '#059669' : '#10b981') : (isLight ? '#64748b' : '#94a3b8')}
                />

                {/* S2 Switch (Bottom-Right, pointing UPWARDS) */}
                {renderDeviceSymbol('S2', 380, 340, switches.S2 || 'diode', !!switchStates.S2, !!gatePulses.S2, 'S2', 'Neut (Bot)', 'up')}

                {/* Wire from S2 Anode lead (y=362) to Bottom Bus (y=390) */}
                <line
                  x1={380}
                  y1={362}
                  x2={380}
                  y2={390}
                  stroke={switchStates.S2 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                  strokeWidth={switchStates.S2 ? 2.5 : 2}
                />
                <circle
                  cx={380}
                  cy={390}
                  r={3.5}
                  fill={switchStates.S2 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#64748b')}
                />

                {/* === Freewheeling Diode (FWD) Branch (Pointing UP) === */}
                {renderFreewheelingDiode(520, 240, 90, 390)}

                {/* === Output Load (R, RL, RLE) with full top-to-bottom connections === */}
                {renderLoad(660, 240, 90, 390)}

                {/* ================================================= */}
                {/* === REAL-TIME ACCURATE CLOSED LOOP CURRENT PARTICLES === */}
                {/* ================================================= */}
                {/* Case 1: Positive half cycle conduction (S1 & S2) */}
                {/* Path: Source A -> S1 -> Top Rail -> Load -> Bottom Rail -> S2 -> Source Neutral */}
                {switchStates.S1 && switchStates.S2 && !isFWDConducting && (
                  renderCurrentParticles(
                    "M 90 212 L 90 190 L 240 190 L 240 90 L 660 90 L 660 390 L 380 390 L 380 290 L 90 290 L 90 268",
                    "loop-pos",
                    5.8,
                    24
                  )
                )}

                {/* Case 2: Negative half cycle conduction (S3 & S4) */}
                {/* Path: Source Neutral -> S3 -> Top Rail -> Load -> Bottom Rail -> S4 -> Source A */}
                {switchStates.S3 && switchStates.S4 && !isFWDConducting && (
                  renderCurrentParticles(
                    "M 90 268 L 90 290 L 380 290 L 380 90 L 660 90 L 660 390 L 240 390 L 240 190 L 90 190 L 90 212",
                    "loop-neg",
                    5.8,
                    24
                  )
                )}

                {/* Case 3: Freewheeling Diode Conduction (FWD loop) */}
                {/* Path: Load Bottom -> FWD Bottom -> FWD UP -> Top Rail -> Load Top -> Load Bottom */}
                {isFWDConducting && (
                  renderCurrentParticles(
                    "M 660 390 L 520 390 L 520 90 L 660 90 L 660 390",
                    "loop-fwd",
                    3.8,
                    16
                  )
                )}

                {/* Case 4: Semi-Converter Freewheeling (S1 + S4) */}
                {switchStates.S1 && switchStates.S4 && !isFWDConducting && (
                  renderCurrentParticles(
                    "M 660 390 L 240 390 L 240 90 L 660 90 L 660 390",
                    "loop-semi1",
                    3.8,
                    16
                  )
                )}

                {/* Case 5: Semi-Converter Freewheeling (S3 + S2) */}
                {switchStates.S3 && switchStates.S2 && !isFWDConducting && (
                  renderCurrentParticles(
                    "M 660 390 L 380 390 L 380 90 L 660 90 L 660 390",
                    "loop-semi2",
                    3.8,
                    16
                  )
                )}
              </g>
            );
          })()}

          {/* ========================================================= */}
          {/* === 1-PHASE HALF-WAVE RECTIFIER === */}
          {/* ========================================================= */}
          {phaseMode === '1-phase' && circuitType === 'half-wave' && (
            <g id="circuit-1ph-halfwave">
              {/* AC Source */}
              <circle
                cx={120}
                cy={240}
                r={28}
                fill={isLight ? '#ffffff' : '#0f172a'}
                stroke={isLight ? '#0284c7' : '#38bdf8'}
                strokeWidth={2}
              />
              <path
                d="M 104 240 Q 112 226, 120 240 T 136 240"
                fill="none"
                stroke={isLight ? '#0284c7' : '#38bdf8'}
                strokeWidth={2.5}
              />
              <text
                x={120}
                y={285}
                textAnchor="middle"
                fontSize="11"
                fontWeight="bold"
                fill={isLight ? '#0f172a' : '#e2e8f0'}
              >
                AC Source
              </text>
              <text
                x={120}
                y={300}
                textAnchor="middle"
                fontSize="10"
                fill={isLight ? '#64748b' : '#94a3b8'}
                fontFamily="monospace"
              >
                vs = {vSourceVal.toFixed(1)} V
              </text>

              {/* Top Rail Wire from AC Source to S1 Anode */}
              <line
                x1={120}
                y1={212}
                x2={120}
                y2={140}
                stroke={switchStates.S1 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#0284c7' : '#38bdf8')}
                strokeWidth={2}
              />
              <line
                x1={120}
                y1={140}
                x2={272}
                y2={140}
                stroke={switchStates.S1 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#0284c7' : '#38bdf8')}
                strokeWidth={2}
              />

              {/* S1 Switch (Horizontal series switch pointing RIGHT towards Load) */}
              {renderDeviceSymbol('S1', 300, 140, switches.S1 || 'diode', !!switchStates.S1, !!gatePulses.S1, 'S1', 'Phase Leg', 'right')}

              {/* Top Rail extending from S1 Cathode to Load */}
              <line
                x1={328}
                y1={140}
                x2={660}
                y2={140}
                stroke={iLoadVal > 0.001 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                strokeWidth={2.5}
              />

              {/* Return Neutral Line at Bottom */}
              <line
                x1={120}
                y1={268}
                x2={120}
                y2={360}
                stroke={isLight ? '#64748b' : '#94a3b8'}
                strokeWidth={2}
              />
              <line
                x1={120}
                y1={360}
                x2={660}
                y2={360}
                stroke={iLoadVal > 0.001 && !isFWDConducting ? (isLight ? '#059669' : '#10b981') : (isLight ? '#64748b' : '#94a3b8')}
                strokeWidth={2.5}
              />

              {/* FWD Branch */}
              {renderFreewheelingDiode(480, 250, 140, 360)}

              {/* Load */}
              {renderLoad(660, 250, 140, 360)}

              {/* Current particles */}
              {switchStates.S1 && !isFWDConducting && (
                renderCurrentParticles("M 120 212 L 120 140 L 660 140 L 660 360 L 120 360 L 120 268", "flow-hw", 5.2, 20)
              )}
              {isFWDConducting && (
                renderCurrentParticles("M 660 360 L 480 360 L 480 140 L 660 140 L 660 360", "flow-hw-fwd", 3.8, 16)
              )}
            </g>
          )}

          {/* ========================================================= */}
          {/* === 3-PHASE FULL-BRIDGE RECTIFIER (6-PULSE) === */}
          {/* ========================================================= */}
          {phaseMode === '3-phase' && circuitType === 'full-bridge' && (
            <g id="circuit-3ph-bridge">
              {/* Positive Top Rail */}
              <line
                x1={200}
                y1={80}
                x2={680}
                y2={80}
                stroke={iLoadVal > 0.001 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                strokeWidth={iLoadVal > 0.001 ? 3 : 2}
              />
              <text x={700} y={84} fontSize="11" fontWeight="bold" fill="#ef4444" fontFamily="monospace">
                + Vo ({vLoadVal.toFixed(1)} V)
              </text>

              {/* Negative Bottom Rail */}
              <line
                x1={200}
                y1={400}
                x2={680}
                y2={400}
                stroke={iLoadVal > 0.001 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                strokeWidth={iLoadVal > 0.001 ? 3 : 2}
              />
              <text x={700} y={404} fontSize="11" fontWeight="bold" fill="#3b82f6" fontFamily="monospace">
                - Vo (GND)
              </text>

              {/* 3-Phase Sources on Left */}
              <g id="sources-3ph">
                {/* Phase A (Red) */}
                <circle
                  cx={70}
                  cy={160}
                  r={18}
                  fill={isLight ? '#fee2e2' : '#0f172a'}
                  stroke="#ef4444"
                  strokeWidth={2}
                />
                <text x={70} y={164} textAnchor="middle" fontSize="10" fontWeight="bold" fill={isLight ? '#b91c1c' : '#fca5a5'}>
                  A
                </text>
                <line x1={88} y1={160} x2={220} y2={160} stroke="#ef4444" strokeWidth={2} />
                <circle cx={220} cy={160} r={3.5} fill="#ef4444" />

                {/* Phase B (Amber) */}
                <circle
                  cx={70}
                  cy={240}
                  r={18}
                  fill={isLight ? '#fef3c7' : '#0f172a'}
                  stroke="#f59e0b"
                  strokeWidth={2}
                />
                <text x={70} y={244} textAnchor="middle" fontSize="10" fontWeight="bold" fill={isLight ? '#b45309' : '#fde68a'}>
                  B
                </text>
                <line x1={88} y1={240} x2={330} y2={240} stroke="#f59e0b" strokeWidth={2} />
                <circle cx={330} cy={240} r={3.5} fill="#f59e0b" />

                {/* Phase C (Blue) */}
                <circle
                  cx={70}
                  cy={320}
                  r={18}
                  fill={isLight ? '#dbeafe' : '#0f172a'}
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
                <text x={70} y={324} textAnchor="middle" fontSize="10" fontWeight="bold" fill={isLight ? '#1d4ed8' : '#93c5fd'}>
                  C
                </text>
                <line x1={88} y1={320} x2={440} y2={320} stroke="#3b82f6" strokeWidth={2} />
                <circle cx={440} cy={320} r={3.5} fill="#3b82f6" />

                <text
                  x={70}
                  y={360}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill={isLight ? '#475569' : '#94a3b8'}
                  fontWeight="600"
                >
                  3-Phase Source
                </text>
              </g>

              {/* === Leg 1: Phase A (S1 Top, S4 Bottom) - Both Point UP === */}
              <line
                x1={220}
                y1={80}
                x2={220}
                y2={118}
                stroke={switchStates.S1 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                strokeWidth={2}
              />
              <circle
                cx={220}
                cy={80}
                r={3.5}
                fill={switchStates.S1 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#64748b')}
              />
              {renderDeviceSymbol('S1', 220, 140, switches.S1 || 'diode', !!switchStates.S1, !!gatePulses.S1, 'S1', 'Ph A', 'up')}

              {/* Connecting Line S1 to S4 through Phase A midpoint */}
              <line
                x1={220}
                y1={162}
                x2={220}
                y2={318}
                stroke={switchStates.S1 || switchStates.S4 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                strokeWidth={2}
              />
              <circle cx={220} cy={160} r={4} fill={switchStates.S1 || switchStates.S4 ? (isLight ? '#059669' : '#10b981') : '#ef4444'} />

              {renderDeviceSymbol('S4', 220, 340, switches.S4 || 'diode', !!switchStates.S4, !!gatePulses.S4, 'S4', 'Ph A', 'up')}
              <line
                x1={220}
                y1={362}
                x2={220}
                y2={400}
                stroke={switchStates.S4 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                strokeWidth={2}
              />
              <circle
                cx={220}
                cy={400}
                r={3.5}
                fill={switchStates.S4 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#64748b')}
              />

              {/* === Leg 2: Phase B (S3 Top, S6 Bottom) - Both Point UP === */}
              <line
                x1={330}
                y1={80}
                x2={330}
                y2={118}
                stroke={switchStates.S3 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                strokeWidth={2}
              />
              <circle
                cx={330}
                cy={80}
                r={3.5}
                fill={switchStates.S3 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#64748b')}
              />
              {renderDeviceSymbol('S3', 330, 140, switches.S3 || 'diode', !!switchStates.S3, !!gatePulses.S3, 'S3', 'Ph B', 'up')}

              {/* Connecting Line S3 to S6 through Phase B midpoint */}
              <line
                x1={330}
                y1={162}
                x2={330}
                y2={318}
                stroke={switchStates.S3 || switchStates.S6 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                strokeWidth={2}
              />
              <circle cx={330} cy={240} r={4} fill={switchStates.S3 || switchStates.S6 ? (isLight ? '#059669' : '#10b981') : '#f59e0b'} />

              {renderDeviceSymbol('S6', 330, 340, switches.S6 || 'diode', !!switchStates.S6, !!gatePulses.S6, 'S6', 'Ph B', 'up')}
              <line
                x1={330}
                y1={362}
                x2={330}
                y2={400}
                stroke={switchStates.S6 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                strokeWidth={2}
              />
              <circle
                cx={330}
                cy={400}
                r={3.5}
                fill={switchStates.S6 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#64748b')}
              />

              {/* === Leg 3: Phase C (S5 Top, S2 Bottom) - Both Point UP === */}
              <line
                x1={440}
                y1={80}
                x2={440}
                y2={118}
                stroke={switchStates.S5 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                strokeWidth={2}
              />
              <circle
                cx={440}
                cy={80}
                r={3.5}
                fill={switchStates.S5 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#64748b')}
              />
              {renderDeviceSymbol('S5', 440, 140, switches.S5 || 'diode', !!switchStates.S5, !!gatePulses.S5, 'S5', 'Ph C', 'up')}

              {/* Connecting Line S5 to S2 through Phase C midpoint */}
              <line
                x1={440}
                y1={162}
                x2={440}
                y2={318}
                stroke={switchStates.S5 || switchStates.S2 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                strokeWidth={2}
              />
              <circle cx={440} cy={320} r={4} fill={switchStates.S5 || switchStates.S2 ? (isLight ? '#059669' : '#10b981') : '#3b82f6'} />

              {renderDeviceSymbol('S2', 440, 340, switches.S2 || 'diode', !!switchStates.S2, !!gatePulses.S2, 'S2', 'Ph C', 'up')}
              <line
                x1={440}
                y1={362}
                x2={440}
                y2={400}
                stroke={switchStates.S2 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#475569')}
                strokeWidth={2}
              />
              <circle
                cx={440}
                cy={400}
                r={3.5}
                fill={switchStates.S2 ? (isLight ? '#059669' : '#10b981') : (isLight ? '#94a3b8' : '#64748b')}
              />

              {/* FWD Branch */}
              {renderFreewheelingDiode(560, 240, 80, 400)}

              {/* Load */}
              {renderLoad(680, 240, 80, 400)}

              {/* 3-Phase Conduction Loop Particles */}
              {switchStates.S1 && switchStates.S6 && !isFWDConducting && (
                renderCurrentParticles("M 88 160 L 220 160 L 220 80 L 680 80 L 680 400 L 330 400 L 330 240 L 88 240", "3p-s1-s6", 5.8, 24)
              )}
              {switchStates.S1 && switchStates.S2 && !isFWDConducting && (
                renderCurrentParticles("M 88 160 L 220 160 L 220 80 L 680 80 L 680 400 L 440 400 L 440 320 L 88 320", "3p-s1-s2", 5.8, 24)
              )}
              {switchStates.S3 && switchStates.S2 && !isFWDConducting && (
                renderCurrentParticles("M 88 240 L 330 240 L 330 80 L 680 80 L 680 400 L 440 400 L 440 320 L 88 320", "3p-s3-s2", 5.8, 24)
              )}
              {switchStates.S3 && switchStates.S4 && !isFWDConducting && (
                renderCurrentParticles("M 88 240 L 330 240 L 330 80 L 680 80 L 680 400 L 220 400 L 220 160 L 88 160", "3p-s3-s4", 5.8, 24)
              )}
              {switchStates.S5 && switchStates.S4 && !isFWDConducting && (
                renderCurrentParticles("M 88 320 L 440 320 L 440 80 L 680 80 L 680 400 L 220 400 L 220 160 L 88 160", "3p-s5-s4", 5.8, 24)
              )}
              {switchStates.S5 && switchStates.S6 && !isFWDConducting && (
                renderCurrentParticles("M 88 320 L 440 320 L 440 80 L 680 80 L 680 400 L 330 400 L 330 240 L 88 240", "3p-s5-s6", 5.8, 24)
              )}
              {switchStates.S1 && switchStates.S4 && !isFWDConducting && (
                renderCurrentParticles("M 680 400 L 220 400 L 220 80 L 680 80 L 680 400", "3p-semi-14", 4.2, 16)
              )}
              {switchStates.S3 && switchStates.S6 && !isFWDConducting && (
                renderCurrentParticles("M 680 400 L 330 400 L 330 80 L 680 80 L 680 400", "3p-semi-36", 4.2, 16)
              )}
              {switchStates.S5 && switchStates.S2 && !isFWDConducting && (
                renderCurrentParticles("M 680 400 L 440 400 L 440 80 L 680 80 L 680 400", "3p-semi-52", 4.2, 16)
              )}
              {isFWDConducting && (
                renderCurrentParticles("M 680 400 L 560 400 L 560 80 L 680 80 L 680 400", "3p-fwd", 3.8, 16)
              )}
            </g>
          )}

          {/* ========================================================= */}
          {/* === 3-PHASE HALF-WAVE RECTIFIER (3-PULSE) === */}
          {/* ========================================================= */}
          {phaseMode === '3-phase' && circuitType === 'half-wave' && (
            <g id="circuit-3ph-halfwave">
              {/* Star-connected source on left with Neutral */}
              <g id="star-source">
                {/* Phase A */}
                <circle cx={80} cy={140} r={16} fill="#0f172a" stroke="#ef4444" strokeWidth={2} />
                <text x={80} y={144} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fca5a5">A</text>
                <line x1={96} y1={140} x2={220} y2={140} stroke="#ef4444" strokeWidth={2} />

                {/* Phase B */}
                <circle cx={80} cy={220} r={16} fill="#0f172a" stroke="#f59e0b" strokeWidth={2} />
                <text x={80} y={224} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#fde68a">B</text>
                <line x1={96} y1={220} x2={330} y2={220} stroke="#f59e0b" strokeWidth={2} />

                {/* Phase C */}
                <circle cx={80} cy={300} r={16} fill="#0f172a" stroke="#3b82f6" strokeWidth={2} />
                <text x={80} y={304} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#93c5fd">C</text>
                <line x1={96} y1={300} x2={440} y2={300} stroke="#3b82f6" strokeWidth={2} />

                {/* Common Star Neutral */}
                <line x1={64} y1={140} x2={40} y2={220} stroke="#94a3b8" strokeWidth={2} />
                <line x1={64} y1={300} x2={40} y2={220} stroke="#94a3b8" strokeWidth={2} />
                <line x1={40} y1={220} x2={40} y2={400} stroke="#94a3b8" strokeWidth={2} />
                <line x1={40} y1={400} x2={680} y2={400} stroke="#94a3b8" strokeWidth={2} />
                <circle cx={40} cy={220} r={4} fill="#94a3b8" />
                <text x={28} y={215} fontSize="10" fill="#94a3b8" fontWeight="bold">N</text>
              </g>

              {/* 3 Switches S1, S3, S5 leading to Common Cathode Bus at Top */}
              <line x1={220} y1={140} x2={220} y2={118} stroke={switchStates.S1 ? '#10b981' : '#475569'} strokeWidth={2} />
              {renderDeviceSymbol('S1', 220, 140, switches.S1 || 'diode', !!switchStates.S1, !!gatePulses.S1, 'S1', 'Ph A', 'up')}

              <line x1={330} y1={220} x2={330} y2={118} stroke={switchStates.S3 ? '#10b981' : '#475569'} strokeWidth={2} />
              {renderDeviceSymbol('S3', 330, 140, switches.S3 || 'diode', !!switchStates.S3, !!gatePulses.S3, 'S3', 'Ph B', 'up')}

              <line x1={440} y1={300} x2={440} y2={118} stroke={switchStates.S5 ? '#10b981' : '#475569'} strokeWidth={2} />
              {renderDeviceSymbol('S5', 440, 140, switches.S5 || 'diode', !!switchStates.S5, !!gatePulses.S5, 'S5', 'Ph C', 'up')}

              {/* Common Cathode Top Bus */}
              <line x1={220} y1={80} x2={680} y2={80} stroke={iLoadVal > 0.001 ? '#10b981' : '#475569'} strokeWidth={2.5} />
              <line x1={220} y1={80} x2={220} y2={118} stroke={switchStates.S1 ? '#10b981' : '#475569'} strokeWidth={2} />
              <line x1={330} y1={80} x2={330} y2={118} stroke={switchStates.S3 ? '#10b981' : '#475569'} strokeWidth={2} />
              <line x1={440} y1={80} x2={440} y2={118} stroke={switchStates.S5 ? '#10b981' : '#475569'} strokeWidth={2} />

              {/* FWD */}
              {renderFreewheelingDiode(550, 240, 80, 400)}

              {/* Load */}
              {renderLoad(680, 240, 80, 400)}

              {/* 3-Phase Half-Wave Particles */}
              {switchStates.S1 && !isFWDConducting && (
                renderCurrentParticles("M 96 140 L 220 140 L 220 80 L 680 80 L 680 400 L 40 400 L 40 220 L 64 140", "3ph-hw-s1", 5.5, 22)
              )}
              {switchStates.S3 && !isFWDConducting && (
                renderCurrentParticles("M 96 220 L 330 220 L 330 80 L 680 80 L 680 400 L 40 400 L 40 220 L 64 220", "3ph-hw-s3", 5.5, 22)
              )}
              {switchStates.S5 && !isFWDConducting && (
                renderCurrentParticles("M 96 300 L 440 300 L 440 80 L 680 80 L 680 400 L 40 400 L 40 220 L 64 300", "3ph-hw-s5", 5.5, 22)
              )}
              {isFWDConducting && (
                renderCurrentParticles("M 680 400 L 550 400 L 550 80 L 680 80 L 680 400", "3ph-hw-fwd", 3.8, 16)
              )}
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
