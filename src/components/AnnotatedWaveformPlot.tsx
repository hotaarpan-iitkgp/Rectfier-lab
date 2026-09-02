import React, { useState, useMemo } from 'react';
import { DerivationCase } from '../utils/waveformDerivations';
import { useTheme } from '../context/ThemeContext';

interface AnnotatedWaveformPlotProps {
  derivationCase: DerivationCase;
  Vrms: number;
  alphaDeg: number;
  R: number;
  L: number;
  freq: number;
}

export const AnnotatedWaveformPlot: React.FC<AnnotatedWaveformPlotProps> = ({
  derivationCase,
  Vrms,
  alphaDeg,
  R,
  L,
  freq,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [hoveredX, setHoveredX] = useState<number | null>(null);

  const Vm = Math.sqrt(2) * Vrms;
  const Vm_LL = Math.sqrt(3) * Vm;


  // Compute values
  const calcResult = useMemo(() => {
    return derivationCase.calculateValues({
      Vrms,
      alphaDeg,
      R,
      L,
      freq,
    });
  }, [derivationCase, Vrms, alphaDeg, R, L, freq]);

  const betaDeg = calcResult.betaCalc ?? 180;
  const gammaDeg = calcResult.gammaCalc ?? Math.max(0, betaDeg - alphaDeg);

  // SVG Geometry Config
  const width = 840;
  const height = 360;
  const padLeft = 60;
  const padRight = 40;
  const padTop = 40;
  const padBottom = 60;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const zeroY = padTop + plotH * 0.55;

  // Maximum scale peak voltage for vertical normalization
  const maxVoltage = derivationCase.category === '3-phase' ? Vm_LL * 1.25 : Vm * 1.35;
  const scaleY = (v: number) => zeroY - (v / maxVoltage) * (plotH * 0.45);
  const scaleX = (deg: number) => padLeft + (deg / 360) * (plotW * 0.5); // show 2 full cycles (720 deg)

  // Generate continuous coordinate points for 0 to 720 degrees
  const { pathVo, pathVs, pointsVo } = useMemo(() => {
    const totalDeg = 720;
    const numSteps = 720;
    const alphaRad = (alphaDeg * Math.PI) / 180;
    const betaRad = (betaDeg * Math.PI) / 180;

    const vsPts: [number, number][] = [];
    const voPts: [number, number, number][] = []; // [deg, voVal, vsVal]

    for (let i = 0; i <= numSteps; i++) {
      const deg = (i / numSteps) * totalDeg;
      const rad = (deg * Math.PI) / 180;
      const vs = Vm * Math.sin(rad);
      vsPts.push([scaleX(deg), scaleY(vs)]);

      // Calculate instantaneous Vo based on derivation case
      let vo = 0;
      const degMod360 = deg % 360;
      const radMod360 = (degMod360 * Math.PI) / 180;

      switch (derivationCase.waveformType) {
        case '1ph-hw-r':
        case '1ph-hw-fwd': {
          const modCycle = deg % 360;
          if (modCycle >= alphaDeg && modCycle < 180) {
            vo = Vm * Math.sin(rad);
          } else {
            vo = 0;
          }
          break;
        }

        case '1ph-hw-rl': {
          const effBetaHW = Math.min(360 + alphaDeg, betaDeg);
          const modCycle = deg % 360;
          if (modCycle >= alphaDeg && modCycle < effBetaHW) {
            vo = Vm * Math.sin(rad);
          } else if (effBetaHW > 360 && modCycle < effBetaHW - 360) {
            vo = Vm * Math.sin(rad);
          } else {
            vo = 0;
          }
          break;
        }

        case '1ph-fb-cont': {
          const mod360 = deg % 360;
          if (mod360 >= alphaDeg && mod360 < 180 + alphaDeg) {
            vo = Vm * Math.sin(rad);
          } else {
            vo = -Vm * Math.sin(rad);
          }
          break;
        }

        case '1ph-fb-r':
        case '1ph-semi': {
          const mod180 = deg % 180;
          if (mod180 >= alphaDeg && mod180 < 180) {
            vo = Math.abs(Vm * Math.sin(rad));
          } else {
            vo = 0;
          }
          break;
        }

        case '1ph-fb-disc': {
          const effBeta = Math.min(180 + alphaDeg, betaDeg);
          const mod360 = deg % 360;
          if (mod360 >= alphaDeg && mod360 < effBeta) {
            // S1+S2 conducting: tracks v_s(wt) from alpha to beta (including negative region pi < wt < beta)
            vo = Vm * Math.sin(rad);
          } else if (mod360 >= 180 + alphaDeg && mod360 < 180 + effBeta) {
            // S3+S4 conducting: tracks -v_s(wt) from pi+alpha to pi+beta (including negative region 2pi < wt < pi+beta)
            vo = -Vm * Math.sin(rad);
          } else if (effBeta > 180 && mod360 < effBeta - 180) {
            // Tail of previous S3+S4 conduction from prior negative half-cycle
            vo = -Vm * Math.sin(rad);
          } else {
            // Discontinuous gap: all thyristors OFF
            vo = 0;
          }
          break;
        }

        case '3ph-fb-ctrl': {
          // 6-pulse controlled
          const theta = (deg - alphaDeg - 30) % 60;
          const localRad = ((theta - 30) * Math.PI) / 180;
          vo = Vm_LL * Math.cos(localRad);
          break;
        }

        case '3ph-fb-diode': {
          // 6-pulse diode natural commutation
          const theta = (deg - 30) % 60;
          const localRad = ((theta - 30) * Math.PI) / 180;
          vo = Vm_LL * Math.cos(localRad);
          break;
        }

        case '3ph-hw': {
          // 3-pulse
          const theta = (deg - alphaDeg - 30) % 120;
          const localRad = ((theta - 60 + 30) * Math.PI) / 180;
          vo = Vm * Math.sin(localRad + Math.PI / 2);
          break;
        }

        default:
          vo = Math.abs(vs);
      }

      voPts.push([deg, vo, vs]);
    }

    const pathVoD = voPts.reduce((acc, [deg, vo], idx) => {
      const x = scaleX(deg);
      const y = scaleY(vo);
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');

    const pathVsD = vsPts.reduce((acc, [x, y], idx) => {
      return idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');

    return { pathVo: pathVoD, pathVs: pathVsD, pointsVo: voPts };
  }, [derivationCase, Vm, Vm_LL, alphaDeg, betaDeg]);

  // Key visual marker angles
  const markers = [
    { deg: 0, label: '0' },
    { deg: alphaDeg, label: 'α', isAlpha: true },
    { deg: 180, label: 'π (180°)' },
    { deg: 180 + alphaDeg, label: 'π+α', isAlpha: true },
    { deg: 360, label: '2π (360°)' },
    { deg: 360 + alphaDeg, label: '2π+α', isAlpha: true },
    { deg: 540, label: '3π' },
    { deg: 720, label: '4π' },
  ];

  if (derivationCase.betaSymbol && betaDeg > 0 && betaDeg !== 180) {
    markers.push({ deg: betaDeg, label: 'β', isAlpha: false });
  }

  // Hover point info
  const hoveredInfo = useMemo(() => {
    if (hoveredX === null) return null;
    const relX = Math.max(0, Math.min(plotW, hoveredX - padLeft));
    const deg = (relX / (plotW * 0.5)) * 360;
    const closest = pointsVo.reduce((prev, curr) =>
      Math.abs(curr[0] - deg) < Math.abs(prev[0] - deg) ? curr : prev
    );
    return {
      deg: Math.round(closest[0]),
      vo: closest[1],
      vs: closest[2],
    };
  }, [hoveredX, pointsVo, plotW]);

  const vdcY = scaleY(calcResult.Vdc);
  const vrmsY = scaleY(calcResult.Vrms);

  return (
    <div className={`flex flex-col border rounded-xl overflow-hidden shadow-xl transition-colors duration-200 ${
      isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-slate-950 border-slate-800'
    }`}>
      {/* Top Banner with Quick Metrics */}
      <div className={`flex flex-wrap items-center justify-between px-4 py-2.5 border-b gap-2 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/90 border-slate-800'
      }`}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
            Annotated Rectified Waveform: <span className={`font-mono ${isLight ? 'text-amber-600' : 'text-amber-300'}`}>v_o(ωt)</span>
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${
            isLight
              ? 'bg-sky-50 text-sky-700 border border-sky-200'
              : 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
          }`}>
            Repetition T₀ = {derivationCase.period.replace('\\', '')}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${
            isLight
              ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
          }`}>
            <span className="font-bold">V_dc:</span>
            <span>{calcResult.Vdc.toFixed(1)} V</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${
            isLight
              ? 'bg-cyan-50 text-cyan-800 border-cyan-200 font-semibold'
              : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
          }`}>
            <span className="font-bold">V_rms:</span>
            <span>{calcResult.Vrms.toFixed(1)} V</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${
            isLight
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Form Factor (FF):</span>
            <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>{calcResult.formFactor.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Main SVG Canvas */}
      <div className={`relative w-full overflow-x-auto p-2 flex justify-center ${isLight ? 'bg-slate-50/50' : 'bg-slate-950'}`}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[880px] select-none"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const svgX = ((e.clientX - rect.left) / rect.width) * width;
            setHoveredX(svgX);
          }}
          onMouseLeave={() => setHoveredX(null)}
        >
          <defs>
            {/* Gradient under Output Voltage Waveform */}
            <linearGradient id="voGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={isLight ? '0.25' : '0.35'} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
            </linearGradient>

            {/* Shaded Integration Period Interval Marker */}
            <pattern id="hatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="8"
                stroke={isLight ? '#0284c7' : '#38bdf8'}
                strokeWidth="1.5"
                strokeOpacity={isLight ? '0.15' : '0.2'}
              />
            </pattern>
          </defs>

          {/* Background Grid Lines */}
          {[-1, -0.5, 0, 0.5, 1].map((frac, idx) => {
            const y = scaleY(frac * Vm);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke={
                    frac === 0
                      ? isLight
                        ? '#94a3b8'
                        : '#475569'
                      : isLight
                      ? '#e2e8f0'
                      : '#1e293b'
                  }
                  strokeWidth={frac === 0 ? 1.5 : 1}
                  strokeDasharray={frac === 0 ? undefined : '3,3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9.5"
                  fill={
                    frac === 0
                      ? isLight
                        ? '#475569'
                        : '#94a3b8'
                      : isLight
                      ? '#94a3b8'
                      : '#475569'
                  }
                  fontFamily="monospace"
                >
                  {frac === 0 ? '0V' : `${(frac * Vm).toFixed(0)}V`}
                </text>
              </g>
            );
          })}

          {/* Shaded Integration Bracket Interval [α, β] or [α, π] or [α, π+α] */}
          {(() => {
            const hatchStartDeg = alphaDeg;
            let hatchEndDeg = alphaDeg + (derivationCase.periodVal * 180) / Math.PI;
            if (derivationCase.betaSymbol && betaDeg > 0) {
              hatchEndDeg = betaDeg;
            } else if (derivationCase.waveformType === '1ph-hw-r' || derivationCase.waveformType === '1ph-fb-r' || derivationCase.waveformType === '1ph-semi') {
              hatchEndDeg = 180;
            }
            const hatchW = Math.max(0, scaleX(hatchEndDeg) - scaleX(hatchStartDeg));
            if (hatchW <= 0) return null;
            return (
              <rect
                x={scaleX(hatchStartDeg)}
                y={padTop}
                width={hatchW}
                height={plotH}
                fill="url(#hatch)"
                className="pointer-events-none"
              />
            );
          })()}

          {/* Reference Line: Input AC Source v_s(t) */}
          <path
            d={pathVs}
            fill="none"
            stroke={isLight ? '#0284c7' : '#38bdf8'}
            strokeWidth={1.5}
            strokeDasharray="4,4"
            opacity={isLight ? 0.35 : 0.4}
          />

          {/* Rectified Output Voltage v_o(t) with glow */}
          <path
            d={pathVo}
            fill="none"
            stroke={isLight ? '#d97706' : '#f59e0b'}
            strokeWidth={2.75}
            filter={isLight ? 'drop-shadow(0 0 3px rgba(217, 119, 6, 0.4))' : 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.5))'}
          />

          {/* Average Voltage V_dc Horizontal Reference Line */}
          <line
            x1={padLeft}
            y1={vdcY}
            x2={width - padRight}
            y2={vdcY}
            stroke={isLight ? '#059669' : '#10b981'}
            strokeWidth={1.75}
            strokeDasharray="6,3"
          />
          <g transform={`translate(${width - padRight - 68}, ${vdcY - 9})`}>
            <rect
              x={0}
              y={0}
              width={68}
              height={18}
              rx={4}
              fill={isLight ? '#ecfdf5' : '#064e3b'}
              stroke={isLight ? '#10b981' : '#10b981'}
              strokeWidth={1}
            />
            <text
              x={34}
              y={12}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="bold"
              fill={isLight ? '#047857' : '#6ee7b7'}
              fontFamily="monospace"
            >
              V_dc = {calcResult.Vdc.toFixed(1)}V
            </text>
          </g>

          {/* RMS Voltage V_rms Horizontal Reference Line */}
          <line
            x1={padLeft}
            y1={vrmsY}
            x2={width - padRight}
            y2={vrmsY}
            stroke={isLight ? '#0891b2' : '#06b6d4'}
            strokeWidth={1.5}
            strokeDasharray="4,4"
          />
          <g transform={`translate(${padLeft + 10}, ${vrmsY - 9})`}>
            <rect
              x={0}
              y={0}
              width={76}
              height={18}
              rx={4}
              fill={isLight ? '#ecfeff' : '#083344'}
              stroke={isLight ? '#06b6d4' : '#06b6d4'}
              strokeWidth={1}
            />
            <text
              x={38}
              y={12}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="bold"
              fill={isLight ? '#0e7490' : '#67e8f9'}
              fontFamily="monospace"
            >
              V_rms = {calcResult.Vrms.toFixed(1)}V
            </text>
          </g>

          {/* Angle Markers and Vertical Trigger Lines */}
          {markers.map((m, i) => {
            const x = scaleX(m.deg);
            if (x < padLeft || x > width - padRight) return null;
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + plotH}
                  stroke={m.isAlpha ? (isLight ? '#d97706' : '#f59e0b') : isLight ? '#cbd5e1' : '#334155'}
                  strokeWidth={m.isAlpha ? 1.75 : 1}
                  strokeDasharray={m.isAlpha ? '3,3' : '2,2'}
                />
                {/* Marker Badge on X-Axis */}
                <g transform={`translate(${x}, ${padTop + plotH + 16})`}>
                  {m.isAlpha ? (
                    <g transform="translate(-16, -10)">
                      <rect
                        x={0}
                        y={0}
                        width={32}
                        height={18}
                        rx={4}
                        fill={isLight ? '#fef3c7' : '#78350f'}
                        stroke={isLight ? '#d97706' : '#f59e0b'}
                        strokeWidth={1}
                      />
                      <text
                        x={16}
                        y={12}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="bold"
                        fill={isLight ? '#92400e' : '#fde68a'}
                        fontFamily="monospace"
                      >
                        α={m.deg % 360}°
                      </text>
                    </g>
                  ) : (
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      fontSize="9.5"
                      fill={isLight ? '#64748b' : '#94a3b8'}
                      fontFamily="monospace"
                    >
                      {m.label}
                    </text>
                  )}
                </g>
              </g>
            );
          })}

          {/* Extinction Angle Beta Marker (if present) */}
          {derivationCase.betaSymbol && betaDeg > 0 && betaDeg !== 180 && (
            <g>
              {/* Primary Beta Marker */}
              <line
                x1={scaleX(betaDeg)}
                y1={padTop}
                x2={scaleX(betaDeg)}
                y2={padTop + plotH}
                stroke={isLight ? '#db2777' : '#ec4899'}
                strokeWidth={1.75}
                strokeDasharray="4,2"
              />
              <g transform={`translate(${scaleX(betaDeg) - 18}, ${padTop + plotH + 6})`}>
                <rect
                  x={0}
                  y={0}
                  width={36}
                  height={18}
                  rx={4}
                  fill={isLight ? '#fdf2f8' : '#831843'}
                  stroke={isLight ? '#db2777' : '#ec4899'}
                  strokeWidth={1}
                />
                <text
                  x={18}
                  y={12}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="bold"
                  fill={isLight ? '#9d174d' : '#fbcfe8'}
                  fontFamily="monospace"
                >
                  β={betaDeg}°
                </text>
              </g>

              {/* Second half-cycle beta marker for full-bridge */}
              {derivationCase.periodVal === Math.PI && 180 + betaDeg <= 720 && (
                <g>
                  <line
                    x1={scaleX(180 + betaDeg)}
                    y1={padTop}
                    x2={scaleX(180 + betaDeg)}
                    y2={padTop + plotH}
                    stroke={isLight ? '#db2777' : '#ec4899'}
                    strokeWidth={1.5}
                    strokeDasharray="4,2"
                    opacity={0.8}
                  />
                  <g transform={`translate(${scaleX(180 + betaDeg) - 22}, ${padTop + plotH + 6})`}>
                    <rect
                      x={0}
                      y={0}
                      width={44}
                      height={18}
                      rx={4}
                      fill={isLight ? '#fdf2f8' : '#831843'}
                      stroke={isLight ? '#db2777' : '#ec4899'}
                      strokeWidth={1}
                    />
                    <text
                      x={22}
                      y={12}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill={isLight ? '#9d174d' : '#fbcfe8'}
                      fontFamily="monospace"
                    >
                      π+β={180 + betaDeg}°
                    </text>
                  </g>
                </g>
              )}

              {/* Second cycle beta marker for half-wave (2π + β) */}
              {derivationCase.periodVal === 2 * Math.PI && 360 + betaDeg <= 720 && (
                <g>
                  <line
                    x1={scaleX(360 + betaDeg)}
                    y1={padTop}
                    x2={scaleX(360 + betaDeg)}
                    y2={padTop + plotH}
                    stroke={isLight ? '#db2777' : '#ec4899'}
                    strokeWidth={1.5}
                    strokeDasharray="4,2"
                    opacity={0.8}
                  />
                  <g transform={`translate(${scaleX(360 + betaDeg) - 24}, ${padTop + plotH + 6})`}>
                    <rect
                      x={0}
                      y={0}
                      width={48}
                      height={18}
                      rx={4}
                      fill={isLight ? '#fdf2f8' : '#831843'}
                      stroke={isLight ? '#db2777' : '#ec4899'}
                      strokeWidth={1}
                    />
                    <text
                      x={24}
                      y={12}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill={isLight ? '#9d174d' : '#fbcfe8'}
                      fontFamily="monospace"
                    >
                      2π+β={360 + betaDeg}°
                    </text>
                  </g>
                </g>
              )}
            </g>
          )}

          {/* Shaded Conduction Bracket & Label (α to β or α to π) */}
          {(alphaDeg > 0 || (derivationCase.betaSymbol && betaDeg > 0)) && (
            <g transform={`translate(${scaleX(alphaDeg)}, ${padTop + 14})`}>
              <line
                x1={0}
                y1={0}
                x2={scaleX(Math.min(360, derivationCase.betaSymbol ? betaDeg : (derivationCase.waveformType === '1ph-hw-r' || derivationCase.waveformType === '1ph-fb-r' || derivationCase.waveformType === '1ph-semi') ? 180 : alphaDeg + 180)) - scaleX(alphaDeg)}
                y2={0}
                stroke={isLight ? '#d97706' : '#f59e0b'}
                strokeWidth={2}
              />
              <circle cx={0} cy={0} r={3} fill={isLight ? '#d97706' : '#f59e0b'} />
              <circle
                cx={scaleX(Math.min(360, derivationCase.betaSymbol ? betaDeg : (derivationCase.waveformType === '1ph-hw-r' || derivationCase.waveformType === '1ph-fb-r' || derivationCase.waveformType === '1ph-semi') ? 180 : alphaDeg + 180)) - scaleX(alphaDeg)}
                cy={0}
                r={3}
                fill={isLight ? '#d97706' : '#f59e0b'}
              />
              <text
                x={(scaleX(Math.min(360, derivationCase.betaSymbol ? betaDeg : (derivationCase.waveformType === '1ph-hw-r' || derivationCase.waveformType === '1ph-fb-r' || derivationCase.waveformType === '1ph-semi') ? 180 : alphaDeg + 180)) - scaleX(alphaDeg)) / 2}
                y={-6}
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="bold"
                fill={isLight ? '#92400e' : '#fde68a'}
              >
                Conduction Interval (γ = {(derivationCase.betaSymbol ? gammaDeg : (180 - alphaDeg)).toFixed(0)}°)
              </text>
            </g>
          )}

          {/* Interactive Inspection Cursor */}
          {hoveredInfo && (
            <g>
              <line
                x1={scaleX(hoveredInfo.deg)}
                y1={padTop}
                x2={scaleX(hoveredInfo.deg)}
                y2={padTop + plotH}
                stroke={isLight ? '#0284c7' : '#ffffff'}
                strokeWidth={1}
                strokeDasharray="2,2"
                opacity={0.8}
              />
              <circle
                cx={scaleX(hoveredInfo.deg)}
                cy={scaleY(hoveredInfo.vo)}
                r={5}
                fill={isLight ? '#d97706' : '#f59e0b'}
                stroke={isLight ? '#ffffff' : '#ffffff'}
                strokeWidth={1.5}
              />
            </g>
          )}
        </svg>
      </div>

      {/* Waveform Legend & Interactive Readout Footer */}
      <div className={`flex flex-wrap items-center justify-between px-4 py-2.5 border-t text-xs gap-3 ${
        isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/90 border-slate-800 text-slate-300'
      }`}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium">
            <span className={`w-3.5 h-1 rounded-sm ${isLight ? 'bg-amber-600' : 'bg-amber-400'}`}></span>
            v_o(ωt) Output Voltage
          </span>
          <span className={`flex items-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            <span className={`w-3.5 h-0.5 rounded-sm border-dashed ${isLight ? 'bg-sky-600' : 'bg-sky-400'}`}></span>
            v_s(ωt) AC Input Reference
          </span>
          <span className={`flex items-center gap-1.5 font-medium ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
            <span className={`w-3.5 h-0.5 rounded-sm ${isLight ? 'bg-emerald-600' : 'bg-emerald-400'}`}></span>
            V_dc (Average DC)
          </span>
          <span className={`flex items-center gap-1.5 font-medium ${isLight ? 'text-cyan-700' : 'text-cyan-400'}`}>
            <span className={`w-3.5 h-0.5 rounded-sm ${isLight ? 'bg-cyan-600' : 'bg-cyan-400'}`}></span>
            V_rms (RMS Total)
          </span>
        </div>

        {hoveredInfo && (
          <div className={`flex items-center gap-3 font-mono text-[11px] px-3 py-1 rounded border ${
            isLight
              ? 'bg-white border-slate-200 text-slate-800 shadow-xs'
              : 'bg-slate-950 border-slate-800 text-slate-200'
          }`}>
            <span>
              ωt: <strong className={isLight ? 'text-amber-700' : 'text-amber-300'}>{hoveredInfo.deg}°</strong>
            </span>
            <span>
              v_o: <strong className={isLight ? 'text-amber-700' : 'text-amber-400'}>{hoveredInfo.vo.toFixed(1)} V</strong>
            </span>
            <span>
              v_s: <strong className={isLight ? 'text-sky-700' : 'text-sky-400'}>{hoveredInfo.vs.toFixed(1)} V</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
