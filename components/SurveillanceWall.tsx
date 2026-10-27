'use client';

import React, { useState, useEffect } from 'react';
import {
  Video,
  Grid,
  LayoutGrid,
  Maximize2,
  Minimize2,
  MapPin,
  Radio,
  RefreshCw,
  Plus,
  X,
  Eye,
  Satellite,
  Filter,
  Search,
} from 'lucide-react';

export interface LiveCamera {
  id: string;
  code: string;
  title: string;
  city: string;
  state: string;
  regionGroup?: string;
  category: string;
  coordinates: [number, number];
  elevation: string;
  searchQuery: string;
  videoId: string;
  embedUrl: string;
  liveImageFeed?: string;
  previewUrl: string;
}

interface SurveillanceWallProps {
  cameras: LiveCamera[];
  isOpen: boolean;
  isSplitMode: boolean;
  onToggleSplitMode: () => void;
  onClose: () => void;
  onLocateCamera: (cam: LiveCamera) => void;
  onRefreshCameras: () => void;
  loading: boolean;
}

const REGION_FILTERS = [
  'TODAS',
  'CDMX',
  'VOLCANES',
  'QUINTANA ROO',
  'YUCATÁN',
  'GUERRERO',
  'BAJA CALIFORNIA SUR',
  'JALISCO',
  'QUERÉTARO',
  'OTROS',
] as const;

export default function SurveillanceWall({
  cameras,
  isOpen,
  isSplitMode,
  onToggleSplitMode,
  onClose,
  onLocateCamera,
  onRefreshCameras,
  loading,
}: SurveillanceWallProps) {
  const [gridLayout, setGridLayout] = useState<'all' | '3x3' | '2x2' | 'focus'>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('TODAS');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [visibleLimit, setVisibleLimit] = useState<number>(12);
  const [focusedCamId, setFocusedCamId] = useState<string | null>(null);
  const [opticalModeIds, setOpticalModeIds] = useState<Record<string, boolean>>({});
  const [clock, setClock] = useState<string>('');
  const [customCameras, setCustomCameras] = useState<LiveCamera[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCamTitle, setNewCamTitle] = useState('');
  const [newCamUrl, setNewCamUrl] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString('es-MX', { hour12: false }) +
          '.' +
          String(now.getMilliseconds()).padStart(3, '0').slice(0, 2)
      );
    }, 100);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const allCameras = [...customCameras, ...cameras];
  const normalizedQuery = searchFilter.trim().toLowerCase();

  const filteredCameras = allCameras.filter((c) => {
    const matchesRegion = selectedRegion === 'TODAS' || c.regionGroup === selectedRegion;
    if (!matchesRegion) return false;
    if (!normalizedQuery) return true;
    return (
      c.title.toLowerCase().includes(normalizedQuery) ||
      c.city.toLowerCase().includes(normalizedQuery) ||
      c.state.toLowerCase().includes(normalizedQuery) ||
      c.code.toLowerCase().includes(normalizedQuery) ||
      c.category.toLowerCase().includes(normalizedQuery)
    );
  });

  const activeFocusedCam = focusedCamId
    ? filteredCameras.find((c) => c.id === focusedCamId) || filteredCameras[0]
    : filteredCameras[0];

  const displayedCameras =
    gridLayout === '2x2'
      ? filteredCameras.slice(0, 4)
      : gridLayout === '3x3'
      ? filteredCameras.slice(0, 9)
      : filteredCameras.slice(0, visibleLimit);

  const toggleOpticalMode = (id: string) => {
    setOpticalModeIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddCustomCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamTitle.trim() || !newCamUrl.trim()) return;

    let extractedId = 'LtvUi_SoTJE';
    const ytMatch = newCamUrl.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch && ytMatch[1]) {
      extractedId = ytMatch[1];
    } else if (/^[a-zA-Z0-9_-]{11}$/.test(newCamUrl.trim())) {
      extractedId = newCamUrl.trim();
    }

    const customCam: LiveCamera = {
      id: `custom-${Date.now()}`,
      code: `CAM-EXT-${customCameras.length + 1}`,
      title: newCamTitle.trim(),
      city: 'Nodo Externo',
      state: 'México',
      regionGroup: 'OTROS',
      category: 'CANAL PERSONALIZADO C5',
      coordinates: [-99.1332, 19.4326],
      elevation: 'N/A',
      searchQuery: newCamTitle.trim(),
      videoId: extractedId,
      embedUrl: `https://www.youtube.com/embed/${extractedId}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1`,
      previewUrl:
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=80',
    };

    setCustomCameras((prev) => [customCam, ...prev]);
    setNewCamTitle('');
    setNewCamUrl('');
    setShowAddModal(false);
  };

  return (
    <section
      className={`fixed z-40 bg-[#03060c]/95 backdrop-blur-xl border border-emerald-500/40 shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col transition-all duration-300 ${
        isSplitMode
          ? 'top-20 bottom-4 right-4 w-[56vw] rounded-2xl'
          : 'inset-3 rounded-2xl'
      }`}
    >
      {/* Cabecera del Muro de Vigilancia C5 */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-950/90 border-b border-emerald-500/30 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/50">
            <Video className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-bold tracking-widest uppercase text-emerald-300">
                RED NACIONAL DE CÁMARAS PÚBLICAS // WINDY + WEBCAMS DE MÉXICO
              </h2>
              <span className="flex items-center gap-1 text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                EN VIVO • {filteredCameras.length} / {allCameras.length} CÁMARAS
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              CDMX • Volcanes • Quintana Roo • Yucatán • Guerrero • BCS y BC • Jalisco • Querétaro • Oaxaca • Veracruz • Sonora •{' '}
              <span className="text-emerald-400">{clock} CST</span>
            </p>
          </div>
        </div>

        {/* Controles de Matriz, Buscador y Vista */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Buscador instantáneo de cámaras por ciudad o estado */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setVisibleLimit(12);
              }}
              placeholder="Buscar ciudad, playa, volcán..."
              className="bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-lg pl-8 pr-6 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none w-48 md:w-56"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Selector de Cuadrícula */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => {
                setFocusedCamId(null);
                setGridLayout('all');
              }}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
                gridLayout === 'all' && !focusedCamId
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mostrar cuadrícula completa del sector seleccionado"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>TODAS ({filteredCameras.length})</span>
            </button>

            <button
              onClick={() => {
                setFocusedCamId(null);
                setGridLayout('3x3');
              }}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
                gridLayout === '3x3' && !focusedCamId
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Matriz 3x3 (9 Cámaras)"
            >
              <span>3x3</span>
            </button>

            <button
              onClick={() => {
                setFocusedCamId(null);
                setGridLayout('2x2');
              }}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
                gridLayout === '2x2' && !focusedCamId
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Matriz 2x2 (4 Cámaras)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>2x2</span>
            </button>

            <button
              onClick={() => setGridLayout('focus')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
                gridLayout === 'focus' || focusedCamId
                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/50'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Modo Foco Principal + Secundarias"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>FOCO</span>
            </button>
          </div>

          {/* Botón Agregar Cámara */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+ CÁMARA</span>
          </button>

          {/* Modo Pantalla Dividida (Mapa + Muro C5) */}
          <button
            onClick={onToggleSplitMode}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            title={isSplitMode ? 'Expandir Muro a Pantalla Completa' : 'Dividir Pantalla con el Mapa 3D'}
          >
            {isSplitMode ? (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">EXPANDIR MURO</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden md:inline">VISTA DIVIDIDA (MAPA + C5)</span>
              </>
            )}
          </button>

          {/* Recargar Streams */}
          <button
            onClick={onRefreshCameras}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 cursor-pointer"
            title="Re-sincronizar IDs de transmisiones en vivo"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Cerrar Muro */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-200 cursor-pointer"
            title="Cerrar Muro C5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barra de Filtro por Regiones / Estados de México */}
      <div className="flex items-center gap-1.5 px-5 py-2 bg-slate-950/75 border-b border-slate-800 overflow-x-auto font-mono text-[11px]">
        <Filter className="w-3.5 h-3.5 text-emerald-400 shrink-0 mr-1" />
        {REGION_FILTERS.map((region) => {
          const count =
            region === 'TODAS'
              ? allCameras.length
              : allCameras.filter((c) => c.regionGroup === region).length;
          const active = selectedRegion === region;
          return (
            <button
              key={region}
              onClick={() => {
                setSelectedRegion(region);
                setFocusedCamId(null);
                setVisibleLimit(12);
              }}
              className={`px-2.5 py-1 rounded-md border whitespace-nowrap transition cursor-pointer ${
                active
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-bold'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {region} ({count})
            </button>
          );
        })}
      </div>

      {/* Cuerpo del Muro de Vigilancia */}
      <div className="flex-1 p-3 overflow-y-auto">
        {gridLayout === 'focus' || focusedCamId ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 h-full">
            <div className="lg:col-span-3 h-[55vh] lg:h-full">
              {activeFocusedCam && (
                <CameraCell
                  cam={activeFocusedCam}
                  isOptical={Boolean(opticalModeIds[activeFocusedCam.id])}
                  onToggleOptical={() => toggleOpticalMode(activeFocusedCam.id)}
                  onFocusToggle={() => setFocusedCamId(null)}
                  onLocate={() => onLocateCamera(activeFocusedCam)}
                  isExpanded
                />
              )}
            </div>
            <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 max-h-full">
              {filteredCameras
                .filter((c) => c.id !== activeFocusedCam?.id)
                .slice(0, 24)
                .map((cam) => (
                  <div key={cam.id} className="h-44 shrink-0">
                    <CameraCell
                      cam={cam}
                      isOptical={Boolean(opticalModeIds[cam.id])}
                      onToggleOptical={() => toggleOpticalMode(cam.id)}
                      onFocusToggle={() => setFocusedCamId(cam.id)}
                      onLocate={() => onLocateCamera(cam)}
                      isExpanded={false}
                    />
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <>
            <div
              className={`grid gap-3 ${
                gridLayout === '2x2'
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
              }`}
            >
              {displayedCameras.map((cam) => (
                <div key={cam.id} className="h-64">
                  <CameraCell
                    cam={cam}
                    isOptical={Boolean(opticalModeIds[cam.id])}
                    onToggleOptical={() => toggleOpticalMode(cam.id)}
                    onFocusToggle={() => {
                      setFocusedCamId(cam.id);
                      setGridLayout('focus');
                    }}
                    onLocate={() => onLocateCamera(cam)}
                    isExpanded={false}
                  />
                </div>
              ))}
            </div>

            {gridLayout === 'all' && visibleLimit < filteredCameras.length && (
              <div className="mt-4 mb-2 flex items-center justify-center gap-3 font-mono text-xs">
                <button
                  onClick={() => setVisibleLimit((prev) => prev + 12)}
                  className="px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/60 text-emerald-200 font-bold transition cursor-pointer"
                >
                  CARGAR +12 CÁMARAS ({displayedCameras.length} DE {filteredCameras.length})
                </button>
                <button
                  onClick={() => setVisibleLimit(filteredCameras.length)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition cursor-pointer"
                >
                  DESPLEGAR TODAS ({filteredCameras.length})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal para añadir una cámara personalizada */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleAddCustomCamera}
            className="w-full max-w-md bg-slate-950 border border-cyan-500/50 rounded-xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                Conectar Nuevo Canal de Video al Muro C5
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-mono">
                  NOMBRE UBICACIÓN / SECTOR:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Volcán de Colima / Reforma CDMX"
                  value={newCamTitle}
                  onChange={(e) => setNewCamTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono">
                  URL DE YOUTUBE LIVE O ID DEL VIDEO:
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={newCamUrl}
                  onChange={(e) => setNewCamUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white text-xs font-mono cursor-pointer"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-500/25 border border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/40 text-xs font-mono font-bold cursor-pointer"
              >
                INTEGRAR AL MURO
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

interface CameraCellProps {
  cam: LiveCamera;
  isOptical: boolean;
  onToggleOptical: () => void;
  onFocusToggle: () => void;
  onLocate: () => void;
  isExpanded: boolean;
}

function CameraCell({
  cam,
  isOptical,
  onToggleOptical,
  onFocusToggle,
  onLocate,
  isExpanded,
}: CameraCellProps) {
  const [activeEmbedUrl, setActiveEmbedUrl] = useState<string>(cam.embedUrl);
  const [activeVideoId, setActiveVideoId] = useState<string>(cam.videoId);
  const [healing, setHealing] = useState<boolean>(false);
  const sensorFeedUrl = cam.liveImageFeed || cam.previewUrl;

  useEffect(() => {
    setActiveEmbedUrl(cam.embedUrl);
    setActiveVideoId(cam.videoId);
  }, [cam.embedUrl, cam.videoId]);

  const handleHealStream = async () => {
    setHealing(true);
    try {
      const res = await fetch(
        `/api/webcams?healId=${encodeURIComponent(cam.id)}&exclude=${encodeURIComponent(activeVideoId)}`
      );
      const data = await res.json();
      if (data.embedUrl) {
        setActiveEmbedUrl(data.embedUrl);
        setActiveVideoId(data.videoId);
      }
    } catch {
      // Sin cambios
    } finally {
      setHealing(false);
    }
  };

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-black border border-slate-800 hover:border-emerald-500/60 transition group flex flex-col">
      {/* Barra superior interna de cada celda */}
      <div className="z-10 flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-950/90 border-b border-slate-800/80 text-[11px] font-mono">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-emerald-400 font-bold shrink-0">{cam.code}</span>
          <span className="text-slate-200 truncate font-sans font-medium">{cam.title}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleHealStream}
            disabled={healing}
            className="px-1.5 py-0.5 rounded text-[10px] border bg-cyan-950/60 hover:bg-cyan-900/70 border-cyan-500/40 text-cyan-200 transition cursor-pointer flex items-center gap-1"
            title="Reconectar / Buscar señal en vivo alternativa si el stream de YouTube finalizó"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${healing ? 'animate-spin' : ''}`} />
            <span>SEÑAL</span>
          </button>

          <button
            onClick={onToggleOptical}
            className={`px-1.5 py-0.5 rounded text-[10px] border transition cursor-pointer flex items-center gap-1 ${
              isOptical
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Alternar entre Stream de Video YouTube y Sensor Satelital/Óptico Directo"
          >
            <Satellite className="w-3 h-3" />
            <span>{isOptical ? 'STREAM' : 'ÓPTICO'}</span>
          </button>

          <button
            onClick={onLocate}
            className="p-1 rounded bg-slate-900 hover:bg-cyan-950 text-cyan-400 border border-slate-700 hover:border-cyan-500/50 transition cursor-pointer"
            title="Enfocar ubicación en el Mapa 3D"
          >
            <MapPin className="w-3 h-3" />
          </button>

          <button
            onClick={onFocusToggle}
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={isExpanded ? 'Volver a Cuadrícula' : 'Ampliar esta Cámara'}
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Área de Video Embebido o Telemetría Óptica */}
      <div className="relative flex-1 w-full bg-slate-950 overflow-hidden">
        {!isOptical ? (
          <iframe
            key={activeEmbedUrl}
            src={activeEmbedUrl}
            title={cam.title}
            loading="lazy"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <img
              src={sensorFeedUrl}
              alt={cam.title}
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.75)_100%)] pointer-events-none" />
            <div className="absolute top-3 left-3 bg-black/75 border border-amber-500/50 px-2.5 py-1 rounded text-[10px] font-mono text-amber-300 flex items-center gap-1.5">
              <Radio className="w-3 h-3 animate-pulse" />
              TELEMETRÍA ÓPTICA DIRECTA // {cam.elevation}
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-slate-300">
          <span>
            {cam.city}, {cam.state} • {cam.category}
          </span>
          <span className="text-cyan-300">
            {cam.coordinates[1].toFixed(3)}°N, {cam.coordinates[0].toFixed(3)}°W
          </span>
        </div>
      </div>
    </div>
  );
}
