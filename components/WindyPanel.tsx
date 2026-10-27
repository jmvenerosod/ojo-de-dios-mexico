'use client';

import React, { useState } from 'react';
import {
  Wind,
  Thermometer,
  CloudRain,
  Cloud,
  Waves,
  Zap,
  Gauge,
  Flame,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';

interface WindyPanelProps {
  isOpen: boolean;
  isSplit: boolean;
  onToggleSplit: () => void;
  onClose: () => void;
  center: { lat: number; lng: number };
  zoom: number;
}

const WINDY_OVERLAYS = [
  { id: 'wind', label: 'Viento', icon: Wind, color: 'text-teal-400' },
  { id: 'gust', label: 'Rachas', icon: Wind, color: 'text-rose-400' },
  { id: 'rain', label: 'Lluvia / Truenos', icon: CloudRain, color: 'text-blue-400' },
  { id: 'temp', label: 'Temperatura', icon: Thermometer, color: 'text-orange-400' },
  { id: 'clouds', label: 'Nubes', icon: Cloud, color: 'text-slate-300' },
  { id: 'waves', label: 'Olas / Mar', icon: Waves, color: 'text-cyan-400' },
  { id: 'cape', label: 'Tormentas CAPE', icon: Zap, color: 'text-amber-400' },
  { id: 'pm2p5', label: 'Calidad Aire PM2.5', icon: Flame, color: 'text-emerald-400' },
  { id: 'cosc', label: 'Humo / CO', icon: Flame, color: 'text-red-400' },
  { id: 'pressure', label: 'Presión (Isobaras)', icon: Gauge, color: 'text-purple-400' },
] as const;

export default function WindyPanel({
  isOpen,
  isSplit,
  onToggleSplit,
  onClose,
  center,
  zoom,
}: WindyPanelProps) {
  const [overlay, setOverlay] = useState<string>('wind');
  const [level, setLevel] = useState<string>('surface');

  if (!isOpen) return null;

  const windyZoom = Math.max(4, Math.min(11, Math.round(zoom)));
  const embedSrc = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km/h&zoom=${windyZoom}&overlay=${overlay}&product=ecmwf&level=${level}&lat=${center.lat.toFixed(
    3
  )}&lon=${center.lng.toFixed(3)}&detailLat=${center.lat.toFixed(
    3
  )}&detailLon=${center.lng.toFixed(3)}&marker=true&pressure=true&message=true`;

  return (
    <section
      className={`fixed z-40 bg-[#030711]/95 backdrop-blur-xl border border-teal-400/50 shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col transition-all duration-300 ${
        isSplit
          ? 'top-20 bottom-4 right-4 w-[52vw] rounded-2xl'
          : 'inset-3 rounded-2xl'
      }`}
    >
      {/* Cabecera del Motor Windy WebGL */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-950 border-b border-teal-500/30 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-400/50 flex items-center justify-center">
            <Wind className="w-4 h-4 text-teal-400 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs md:text-sm font-bold tracking-wider uppercase text-teal-300">
                SIMULADOR ATMOSFÉRICO WINDY // ECMWF + GFS + CAMS
              </h2>
              <span className="text-[10px] font-mono bg-teal-500/20 text-teal-200 border border-teal-500/40 px-2 py-0.5 rounded">
                ISOBARAS ACTIVAS
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              Sincronizado con coordenadas de México ({center.lat.toFixed(2)}°N, {center.lng.toFixed(2)}°W)
            </p>
          </div>
        </div>

        {/* Selector de Altitud / Nivel Atmosférico + Pantalla Dividida */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-teal-200 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-teal-400 cursor-pointer"
            title="Altitud / Nivel de Presión Atmosférica"
          >
            <option value="surface">Superficie (10m)</option>
            <option value="850h">850 hPa (~1,500m)</option>
            <option value="500h">500 hPa (~5,500m Vórtices)</option>
            <option value="250h">250 hPa (~10,500m Jet Stream)</option>
          </select>

          <button
            onClick={onToggleSplit}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
          >
            {isSplit ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden sm:inline">PANTALLA COMPLETA</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">DIVIDIR CON GOOGLE MAPS HD</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selector rápido de capas estilo Windy */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-950/90 border-b border-slate-800 overflow-x-auto font-mono text-[11px]">
        {WINDY_OVERLAYS.map((item) => {
          const Icon = item.icon;
          const active = overlay === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setOverlay(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border whitespace-nowrap transition cursor-pointer ${
                active
                  ? 'bg-teal-500/25 border-teal-400 text-white font-bold shadow-[0_0_12px_rgba(20,184,166,0.4)]'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${item.color}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenedor del Motor WebGL */}
      <div className="flex-1 w-full bg-slate-950 rounded-b-2xl overflow-hidden relative">
        <iframe
          key={`${overlay}-${level}`}
          src={embedSrc}
          title="Simulador Atmosférico Windy México"
          className="w-full h-full border-0"
          allowFullScreen
        />
      </div>
    </section>
  );
}
