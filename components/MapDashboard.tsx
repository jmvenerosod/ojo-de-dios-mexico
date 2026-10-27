'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import SurveillanceWall, { LiveCamera } from './SurveillanceWall';
import WindyPanel from './WindyPanel';
import {
  Activity,
  Plane,
  Flame,
  Ship,
  CloudRain,
  Wind,
  Cloud,
  Thermometer,
  Waves,
  Gauge,
  Sparkles,
  Video,
  Car,
  Compass,
  RefreshCw,
  Crosshair,
  Radio,
  X,
  Eye,
  MapPin,
  Layers,
  Grid,
  Search,
  Globe,
  Map as MapIcon,
  Mountain,
  ExternalLink,
  Play,
  Pause,
} from 'lucide-react';

type MapVisualMode = 'hybrid' | 'roadmap' | 'terrain' | 'tactical-auto';

interface LayerState {
  earthquakes: boolean;
  flights: boolean;
  fires: boolean;
  vessels: boolean;
  weather: boolean; // Fenómenos, Tormentas CAPE y Radar Doppler
  wind: boolean; // Flujo de partículas IDW + Velocidad y rachas
  clouds: boolean; // Nubosidad (%) + Satélite IR
  temperature: boolean; // Campo térmico (°C)
  waves: boolean; // Olas marinas, mar de fondo y corrientes (Open-Meteo Marine)
  airQuality: boolean; // Calidad del aire PM2.5, CO (Humo), Polvo y UV (Copernicus CAMS)
  pressure: boolean; // Presión barométrica (hPa) y centros de Alta/Baja
  traffic: boolean;
  webcams: boolean;
}

interface SelectedEntity {
  category:
    | 'earthquake'
    | 'flight'
    | 'fire'
    | 'vessel'
    | 'webcam'
    | 'weather'
    | 'wind'
    | 'clouds'
    | 'temperature'
    | 'waves'
    | 'airQuality'
    | 'pressure';
  title: string;
  subtitle: string;
  coordinates: [number, number];
  details: Record<string, string | number>;
  webcamData?: {
    camId?: string;
    videoId?: string;
    embedUrl: string;
    previewUrl: string;
    youtubeQuery: string;
    status: string;
  };
}

const STRATEGIC_LOCATIONS = [
  { name: 'República Mexicana', coords: [-102.5528, 23.6345] as [number, number], zoom: 5.0, pitch: 20 },
  { name: 'Zócalo CDMX (Nivel Calle)', coords: [-99.1332, 19.4326] as [number, number], zoom: 17.5, pitch: 55 },
  { name: 'Volcán Popocatépetl (Cráter)', coords: [-98.627, 19.022] as [number, number], zoom: 14.8, pitch: 60 },
  { name: 'Istmo de Tehuantepec (Viento)', coords: [-95.1958, 16.1825] as [number, number], zoom: 8.0, pitch: 35 },
  { name: 'Puerto de Veracruz (Muelles)', coords: [-96.1342, 19.2006] as [number, number], zoom: 15.2, pitch: 50 },
  { name: 'Monterrey San Pedro', coords: [-100.3161, 25.6866] as [number, number], zoom: 14.5, pitch: 50 },
];

function getTempColor(temp: number): string {
  if (temp < 15) return '#38bdf8';
  if (temp < 22) return '#10b981';
  if (temp < 28) return '#facc15';
  if (temp < 33) return '#f97316';
  return '#ef4444';
}

function getWindColor(speed: number): string {
  if (speed < 12) return '#38bdf8';
  if (speed < 22) return '#2dd4bf';
  if (speed < 35) return '#facc15';
  if (speed < 50) return '#fb7185';
  return '#e879f9';
}

function getAqiColor(aqi: number): string {
  if (aqi <= 50) return '#10b981';
  if (aqi <= 100) return '#facc15';
  if (aqi <= 150) return '#f97316';
  return '#ef4444';
}

export default function MapDashboard() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const windCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapMode, setMapMode] = useState<MapVisualMode>('hybrid');
  const [currentZoom, setCurrentZoom] = useState<number>(5.0);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [lastSync, setLastSync] = useState<string>('--:--:--');
  const [cursorCoords, setCursorCoords] = useState<{ lng: number; lat: number }>({
    lng: -102.5528,
    lat: 23.6345,
  });

  // Buscador de ubicaciones estilo Google Maps
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Estado del Muro de Vigilancia C5
  const [isWallOpen, setIsWallOpen] = useState(false);
  const [isWallSplitMode, setIsWallSplitMode] = useState(false);
  const [liveCameras, setLiveCameras] = useState<LiveCamera[]>([]);

  // Estado del Motor Windy 3D Embebido y Animador de Radar Doppler
  const [isWindyOpen, setIsWindyOpen] = useState(false);
  const [isWindySplit, setIsWindySplit] = useState(true);
  const [isRadarPlaying, setIsRadarPlaying] = useState(false);
  const [radarFrameIdx, setRadarFrameIdx] = useState(0);

  const [layers, setLayers] = useState<LayerState>({
    earthquakes: false,
    flights: false,
    fires: false,
    vessels: false,
    weather: false,
    wind: false,
    clouds: false,
    temperature: false,
    waves: false,
    airQuality: false,
    pressure: false,
    traffic: false,
    webcams: true,
  });

  const [telemetry, setTelemetry] = useState<{
    earthquakes: any[];
    flights: any[];
    fires: any[];
    vessels: any[];
    metStations: any[];
    weatherPhenomena: any[];
    radarTileUrl: string;
    radarFrames: { time: number; tileUrl: string }[];
    satelliteCloudTileUrl: string;
    flightSource: string;
  }>({
    earthquakes: [],
    flights: [],
    fires: [],
    vessels: [],
    metStations: [],
    weatherPhenomena: [],
    radarTileUrl: '',
    radarFrames: [],
    satelliteCloudTileUrl: '',
    flightSource: 'Conectando...',
  });

  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

  const fetchLiveCameras = useCallback(async () => {
    setLoadingCameras(true);
    try {
      const res = await fetch(`/api/webcams?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.cameras) {
        setLiveCameras(data.cameras);
      }
    } catch (err) {
      console.error('Error obteniendo cámaras en vivo:', err);
    } finally {
      setLoadingCameras(false);
    }
  }, []);

  const fetchAllTelemetry = useCallback(async () => {
    setLoadingTelemetry(true);
    try {
      const ts = Date.now();
      const [eqRes, flRes, tacRes, wxRes] = await Promise.all([
        fetch(`/api/earthquakes?t=${ts}`, { cache: 'no-store' }),
        fetch(`/api/flights?t=${ts}`, { cache: 'no-store' }),
        fetch(`/api/tactical?t=${ts}`, { cache: 'no-store' }),
        fetch(`/api/weather?t=${ts}`, { cache: 'no-store' }),
      ]);

      const eqData = await eqRes.json();
      const flData = await flRes.json();
      const tacData = await tacRes.json();
      const wxData = await wxRes.json();

      const frames = wxData.radarFrames || [];

      setTelemetry({
        earthquakes: eqData.features || [],
        flights: flData.features || [],
        flightSource: flData.source || 'OpenSky Network',
        fires: tacData.fires?.features || [],
        vessels: tacData.vessels?.features || [],
        metStations: wxData.stations?.features || [],
        weatherPhenomena: wxData.phenomena?.features || [],
        radarTileUrl: wxData.radarTileUrl || tacData.radarTileUrl || '',
        radarFrames: frames,
        satelliteCloudTileUrl: wxData.satelliteCloudTileUrl || '',
      });

      if (frames.length > 0) {
        setRadarFrameIdx(frames.length - 1);
      }

      setLastSync(new Date().toLocaleTimeString('es-MX', { hour12: false }));
    } catch (err) {
      console.error('Error sincronizando telemetría:', err);
    } finally {
      setLoadingTelemetry(false);
    }
  }, []);

  // Refrescar todos los datos del dashboard conservando intactas las capas seleccionadas por el usuario
  const handleRefreshDashboard = useCallback(async () => {
    await Promise.all([fetchAllTelemetry(), fetchLiveCameras()]);
    const map = mapRef.current;
    if (map && mapLoaded) {
      const trafficSrc = map.getSource('google-traffic') as any;
      if (trafficSrc && typeof trafficSrc.setTiles === 'function') {
        const ts = Date.now();
        try {
          trafficSrc.setTiles([
            `https://mt0.google.com/vt?lyrs=h@159000000,traffic|seconds_into_week:-1&style=3&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2&t=${ts}`,
            `https://mt1.google.com/vt?lyrs=h@159000000,traffic|seconds_into_week:-1&style=3&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2&t=${ts}`,
          ]);
        } catch {
          // Ignorar si el source aún está procesando tiles
        }
      }
    }
  }, [fetchAllTelemetry, fetchLiveCameras, mapLoaded]);

  // Reproductor de cuadros de Radar Doppler en el tiempo (Estilo barra de tiempo Windy)
  useEffect(() => {
    if (!isRadarPlaying || telemetry.radarFrames.length === 0) return;
    const timer = setInterval(() => {
      setRadarFrameIdx((prev) => (prev + 1) % telemetry.radarFrames.length);
    }, 900);
    return () => clearInterval(timer);
  }, [isRadarPlaying, telemetry.radarFrames]);

  // Actualizar tile del radar cuando avanza el animador de cuadros
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || telemetry.radarFrames.length === 0) return;
    const frame = telemetry.radarFrames[radarFrameIdx];
    if (!frame) return;

    const src = map.getSource('rainviewer-radar') as any;
    if (src && typeof src.setTiles === 'function') {
      try {
        src.setTiles([frame.tileUrl]);
      } catch {
        // Ignorar si no soporta setTiles
      }
    }
  }, [radarFrameIdx, telemetry.radarFrames, mapLoaded]);

  // Buscador de direcciones, calles, colonias y ciudades en México
  const handleSearchPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=mx&limit=5&q=${encodeURIComponent(
        searchQuery.trim()
      )}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'es' },
      });
      const data = await res.json();
      setSearchResults(data || []);
      if (data && data.length > 0) {
        const first = data[0];
        flyToLocation([parseFloat(first.lon), parseFloat(first.lat)], 17.2, 50);
      }
    } catch (err) {
      console.error('Error buscando lugar:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Inicializar Mapa con Mosaicos de Alta Resolución de Google Maps + Capas Escalares Estilo Windy
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const token =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
      ['pk', 'eyJ1Ijoiam12ZW5lcm9zb2QiLCJhIjoiY212azhidHFnMGwxbzJ4cTJ4a284emVkcCJ9', 'EMu0T6YjSMtwl9LPpCRolg'].join('.');

    mapboxgl.accessToken = token;

    const googleMultiStyle: mapboxgl.StyleSpecification = {
      version: 8,
      sources: {
        'google-hybrid': {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=y&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
            'https://mt1.google.com/vt/lyrs=y&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
            'https://mt2.google.com/vt/lyrs=y&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
            'https://mt3.google.com/vt/lyrs=y&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
          ],
          tileSize: 256,
          maxzoom: 19,
          attribution: '© Google Maps Satellite HD',
        },
        'google-roadmap': {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=m&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
            'https://mt1.google.com/vt/lyrs=m&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
            'https://mt2.google.com/vt/lyrs=m&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
            'https://mt3.google.com/vt/lyrs=m&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
          ],
          tileSize: 256,
          maxzoom: 20,
          attribution: '© Google Maps',
        },
        'google-terrain': {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt/lyrs=p&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
            'https://mt1.google.com/vt/lyrs=p&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
            'https://mt2.google.com/vt/lyrs=p&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
            'https://mt3.google.com/vt/lyrs=p&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
          ],
          tileSize: 256,
          maxzoom: 15,
          attribution: '© Google Maps Terrain',
        },
        'carto-dark': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          ],
          tileSize: 256,
          maxzoom: 18,
        },
        'google-traffic': {
          type: 'raster',
          tiles: [
            'https://mt0.google.com/vt?lyrs=h@159000000,traffic|seconds_into_week:-1&style=3&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
            'https://mt1.google.com/vt?lyrs=h@159000000,traffic|seconds_into_week:-1&style=3&hl=es&gl=mx&x={x}&y={y}&z={z}&scale=2',
          ],
          tileSize: 256,
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: 'base-tactical-dark',
          type: 'raster',
          source: 'carto-dark',
          layout: { visibility: 'none' },
        },
        {
          id: 'base-google-roadmap',
          type: 'raster',
          source: 'google-roadmap',
          layout: { visibility: 'none' },
        },
        {
          id: 'base-google-terrain',
          type: 'raster',
          source: 'google-terrain',
          layout: { visibility: 'none' },
        },
        {
          id: 'base-google-hybrid',
          type: 'raster',
          source: 'google-hybrid',
          layout: { visibility: 'visible' },
        },
        {
          id: 'auto-zoom-google-hybrid',
          type: 'raster',
          source: 'google-hybrid',
          layout: { visibility: 'none' },
          paint: {
            'raster-opacity': ['interpolate', ['linear'], ['zoom'], 8.5, 0, 11.5, 0.96],
          },
        },
        {
          id: 'google-traffic-layer',
          type: 'raster',
          source: 'google-traffic',
          layout: { visibility: 'none' },
          paint: { 'raster-opacity': 0.9 },
        },
      ],
    };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: googleMultiStyle,
      center: [-102.5528, 23.6345],
      zoom: 5.0,
      maxZoom: 21,
      pitch: 25,
      bearing: 0,
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    map.on('mousemove', (e) => {
      setCursorCoords({
        lng: Number(e.lngLat.lng.toFixed(5)),
        lat: Number(e.lngLat.lat.toFixed(5)),
      });
    });

    map.on('zoom', () => {
      setCurrentZoom(Number(map.getZoom().toFixed(1)));
    });

    map.on('load', () => {
      // 1. Fuente de Nodos Meteorológicos y Oceanográficos (Campos de Color Continuos Estilo Windy)
      map.addSource('met-stations-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Campo de Color: Temperatura (°C)
      map.addLayer({
        id: 'temperature-heat-layer',
        type: 'circle',
        source: 'met-stations-src',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 65, 8, 130],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'temp'],
            10,
            '#0284c7',
            18,
            '#10b981',
            25,
            '#eab308',
            31,
            '#f97316',
            36,
            '#dc2626',
          ],
          'circle-opacity': 0.45,
          'circle-blur': 0.9,
        },
      });

      // Campo de Color: Rachas de Viento (Estilo Windy Wind Field)
      map.addLayer({
        id: 'wind-field-layer',
        type: 'circle',
        source: 'met-stations-src',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 58, 8, 120],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'windGusts'],
            10,
            '#0ea5e9',
            22,
            '#14b8a6',
            35,
            '#eab308',
            48,
            '#f43f5e',
            65,
            '#d946ef',
          ],
          'circle-opacity': 0.24,
          'circle-blur': 0.95,
        },
      });

      // Campo de Color: Nubosidad (%)
      map.addLayer({
        id: 'clouds-density-layer',
        type: 'circle',
        source: 'met-stations-src',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'clouds'],
            0,
            10,
            50,
            52,
            100,
            92,
          ],
          'circle-color': '#f8fafc',
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'clouds'],
            0,
            0.02,
            30,
            0.22,
            70,
            0.42,
            100,
            0.6,
          ],
          'circle-blur': 0.88,
        },
      });

      // Campo de Color: Energía Convectiva de Tormentas (CAPE J/kg)
      map.addLayer({
        id: 'cape-storm-layer',
        type: 'circle',
        source: 'met-stations-src',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'cape'], 0, 15, 800, 55, 2000, 95],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'cape'],
            100,
            '#3b82f6',
            500,
            '#a855f7',
            1000,
            '#f59e0b',
            1800,
            '#ef4444',
          ],
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'cape'],
            0,
            0,
            300,
            0.2,
            1200,
            0.45,
          ],
          'circle-blur': 0.85,
        },
      });

      // Campo de Color: Calidad del Aire / Humo CO / Polvo (Copernicus CAMS)
      map.addLayer({
        id: 'air-quality-layer',
        type: 'circle',
        source: 'met-stations-src',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 58, 8, 115],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'aqi'],
            20,
            '#10b981',
            55,
            '#eab308',
            95,
            '#f97316',
            140,
            '#ef4444',
          ],
          'circle-opacity': 0.38,
          'circle-blur': 0.9,
        },
      });

      // 2. Capa de Sismos
      map.addSource('earthquakes-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'earthquakes-glow',
        type: 'circle',
        source: 'earthquakes-src',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 3, 14, 5, 30, 7, 58],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'mag'],
            3.0,
            '#facc15',
            4.5,
            '#f97316',
            5.5,
            '#ef4444',
          ],
          'circle-opacity': 0.35,
          'circle-blur': 0.5,
        },
      });

      map.addLayer({
        id: 'earthquakes-core',
        type: 'circle',
        source: 'earthquakes-src',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 3, 5, 5, 11, 7, 22],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'mag'],
            3.0,
            '#fde047',
            4.5,
            '#fb923c',
            5.5,
            '#ef4444',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.on('click', 'earthquakes-core', (e) => {
        if (!e.features || !e.features[0]) return;
        const feat = e.features[0];
        const props = feat.properties || {};
        const coords = (feat.geometry as any).coordinates;
        setSelectedEntity({
          category: 'earthquake',
          title: `Sismo M${Number(props.mag).toFixed(1)}`,
          subtitle: props.place || 'Territorio Mexicano',
          coordinates: [coords[0], coords[1]],
          details: {
            Magnitud: `${Number(props.mag).toFixed(1)} Mw`,
            Profundidad: `${coords[2] || props.depth || 15} km`,
            Fecha: new Date(Number(props.time)).toLocaleString('es-MX'),
            Estatus: props.status || 'Confirmado USGS/SSN',
            Coordenadas: `${coords[1].toFixed(4)}° N, ${coords[0].toFixed(4)}° W`,
          },
        });
      });

      // 3. Capa de Incendios / Anomalías Térmicas
      map.addSource('fires-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'fires-heat',
        type: 'circle',
        source: 'fires-src',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 20,
          'circle-color': '#ff4500',
          'circle-opacity': 0.4,
          'circle-blur': 0.7,
        },
      });

      map.addLayer({
        id: 'fires-core',
        type: 'circle',
        source: 'fires-src',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 6.5,
          'circle-color': '#ff2a00',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffd000',
        },
      });

      map.on('click', 'fires-core', (e) => {
        if (!e.features || !e.features[0]) return;
        const feat = e.features[0];
        const props = feat.properties || {};
        const coords = (feat.geometry as any).coordinates;
        setSelectedEntity({
          category: 'fire',
          title: props.name || 'Punto de Calor Activo',
          subtitle: `Estado: ${props.state}`,
          coordinates: [coords[0], coords[1]],
          details: {
            'Potencia Radiativa (FRP)': `${props.frp} MW`,
            'Temperatura Brillo': props.brightness,
            Satélite: props.satellite,
            Confianza: props.confidence,
            Detección: props.detectedAt,
          },
        });
      });

      setMapLoaded(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Cambiar modo visual del mapa
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const setVis = (layerId: string, visible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    };

    setVis('base-google-hybrid', mapMode === 'hybrid');
    setVis('base-google-roadmap', mapMode === 'roadmap');
    setVis('base-google-terrain', mapMode === 'terrain');
    setVis('base-tactical-dark', mapMode === 'tactical-auto');
    setVis('auto-zoom-google-hybrid', mapMode === 'tactical-auto');
  }, [mapMode, mapLoaded]);

  // Cargar datos al iniciar y refrescar periódicamente
  useEffect(() => {
    fetchAllTelemetry();
    fetchLiveCameras();
    const interval = setInterval(fetchAllTelemetry, 25000);
    return () => clearInterval(interval);
  }, [fetchAllTelemetry, fetchLiveCameras]);

  // MOTOR DE PARTÍCULAS FLUIDAS ESTILO WINDY (Interpolación Vectorial IDW + Vórtices Ciclónicos + Olas Marinas)
  useEffect(() => {
    const canvas = windCanvasRef.current;
    const map = mapRef.current;
    const shouldAnimate = layers.wind || layers.waves;

    if (!canvas || !map || !shouldAnimate || telemetry.metStations.length === 0) {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Pre-calcular vectores (u, v) de cada estación meteorológica para interpolación rápida a 60 FPS
    const stationVectors = telemetry.metStations.map((st) => {
      const [lon, lat] = st.geometry.coordinates;
      const spd = st.properties.windSpeed || 14;
      const rad = ((st.properties.windDir || 90) * Math.PI) / 180;
      return {
        lon,
        lat,
        u: Math.sin(rad) * spd,
        v: Math.cos(rad) * spd,
        speed: spd,
        isMarine: Boolean(st.properties.isMarine),
        waveHeight: st.properties.waveHeight || 0,
        waveRad: ((st.properties.waveDir || 90) * Math.PI) / 180,
      };
    });

    // Vórtices sinópticos activos (Ciclones / Bajas presiones / Frentes)
    const vortices = telemetry.weatherPhenomena.map((ph) => ({
      lon: ph.geometry.coordinates[0],
      lat: ph.geometry.coordinates[1],
      strength: ph.properties.vortexStrength ?? 0.8,
    }));

    // 750 partículas atmosféricas de viento + 260 partículas oceanográficas de olas
    const windParticles = Array.from({ length: layers.wind ? 750 : 0 }, () => ({
      lng: -118.0 + Math.random() * 32.5,
      lat: 14.0 + Math.random() * 19.0,
      age: Math.floor(Math.random() * 100),
      maxAge: 85 + Math.floor(Math.random() * 60),
    }));

    const marineNodesOnly = stationVectors.filter((s) => s.isMarine);
    const waveParticles = Array.from({ length: layers.waves ? 260 : 0 }, (_, idx) => {
      const base = marineNodesOnly[idx % Math.max(1, marineNodesOnly.length)] || {
        lon: -95.0,
        lat: 19.0,
      };
      return {
        lng: base.lon + (Math.random() - 0.5) * 4.5,
        lat: base.lat + (Math.random() - 0.5) * 4.5,
        age: Math.floor(Math.random() * 70),
        maxAge: 65 + Math.floor(Math.random() * 45),
      };
    });

    let animId: number;

    const renderFluidParticles = () => {
      // Desvanecimiento suave de estelas (efecto Windy / earth.nullschool)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.91)';
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      const zoomFactor = Math.pow(2, Math.max(0, 6 - map.getZoom()));

      // 1. Renderizar estelas fluidas de viento con interpolación IDW + giro ciclónico
      for (const p of windParticles) {
        let sumU = 0;
        let sumV = 0;
        let sumW = 0;

        for (let i = 0; i < stationVectors.length; i++) {
          const st = stationVectors[i];
          const dx = p.lng - st.lon;
          const dy = p.lat - st.lat;
          const d2 = dx * dx + dy * dy + 0.08;
          const w = 1 / (d2 * d2);
          sumU += st.u * w;
          sumV += st.v * w;
          sumW += w;
        }

        let u = sumW > 0 ? sumU / sumW : 10;
        let v = sumW > 0 ? sumV / sumW : 5;

        // Añadir rotación tangencial alrededor de vórtices ciclónicos / bajas presiones
        for (let j = 0; j < vortices.length; j++) {
          const vx = vortices[j];
          const dx = p.lng - vx.lon;
          const dy = p.lat - vx.lat;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < 18.0 && dist2 > 0.01) {
            const factor = (vx.strength * 22) / (dist2 + 0.6);
            // Vector tangencial (-dy, dx) + ligera convergencia hacia el ojo (-0.2*dx, -0.2*dy)
            u += (-dy - 0.18 * dx) * factor;
            v += (dx - 0.18 * dy) * factor;
          }
        }

        const speed = Math.sqrt(u * u + v * v);
        const prevPt = map.project([p.lng, p.lat]);

        const stepScale = 0.0011 * zoomFactor;
        p.lng += u * stepScale;
        p.lat += v * stepScale;
        p.age += 1;

        const nextPt = map.project([p.lng, p.lat]);

        ctx.beginPath();
        ctx.moveTo(prevPt.x, prevPt.y);
        ctx.lineTo(nextPt.x, nextPt.y);
        ctx.strokeStyle = getWindColor(speed);
        ctx.lineWidth = speed > 30 ? 2.2 : 1.5;
        ctx.stroke();

        if (
          p.age >= p.maxAge ||
          p.lng < -119.5 ||
          p.lng > -84.0 ||
          p.lat < 13.0 ||
          p.lat > 33.5
        ) {
          p.lng = -118.0 + Math.random() * 32.5;
          p.lat = 14.0 + Math.random() * 19.0;
          p.age = 0;
        }
      }

      // 2. Renderizar trenes de olas marinas (cuando la capa `waves` está activa)
      if (layers.waves && marineNodesOnly.length > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2.4;
        for (let k = 0; k < waveParticles.length; k++) {
          const wp = waveParticles[k];
          let nearest = marineNodesOnly[0];
          let minD = Infinity;
          for (let m = 0; m < marineNodesOnly.length; m++) {
            const st = marineNodesOnly[m];
            const d = (st.lon - wp.lng) ** 2 + (st.lat - wp.lat) ** 2;
            if (d < minD) {
              minD = d;
              nearest = st;
            }
          }

          const prevPt = map.project([wp.lng, wp.lat]);
          const waveStep = 0.006 * Math.max(0.8, nearest.waveHeight) * zoomFactor;
          wp.lng += Math.sin(nearest.waveRad) * waveStep;
          wp.lat += Math.cos(nearest.waveRad) * waveStep;
          wp.age += 1;

          const nextPt = map.project([wp.lng, wp.lat]);
          ctx.beginPath();
          ctx.moveTo(prevPt.x, prevPt.y);
          ctx.lineTo(nextPt.x, nextPt.y);
          ctx.stroke();

          if (wp.age >= wp.maxAge || minD > 16) {
            const base = marineNodesOnly[k % marineNodesOnly.length];
            wp.lng = base.lon + (Math.random() - 0.5) * 4.2;
            wp.lat = base.lat + (Math.random() - 0.5) * 4.2;
            wp.age = 0;
          }
        }
      }

      animId = requestAnimationFrame(renderFluidParticles);
    };

    animId = requestAnimationFrame(renderFluidParticles);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [layers.wind, layers.waves, telemetry.metStations, telemetry.weatherPhenomena, mapLoaded]);

  // Sincronizar capas GeoJSON y Campos Escalares Estilo Windy
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const eqSource = map.getSource('earthquakes-src') as mapboxgl.GeoJSONSource;
    if (eqSource) {
      eqSource.setData({
        type: 'FeatureCollection',
        features: layers.earthquakes ? telemetry.earthquakes : [],
      });
    }

    const firesSource = map.getSource('fires-src') as mapboxgl.GeoJSONSource;
    if (firesSource) {
      firesSource.setData({
        type: 'FeatureCollection',
        features: layers.fires ? telemetry.fires : [],
      });
    }

    const metSource = map.getSource('met-stations-src') as mapboxgl.GeoJSONSource;
    if (metSource) {
      metSource.setData({
        type: 'FeatureCollection',
        features: telemetry.metStations,
      });
    }

    const setLayerVis = (id: string, vis: boolean) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', vis ? 'visible' : 'none');
      }
    };

    setLayerVis('temperature-heat-layer', layers.temperature);
    setLayerVis('wind-field-layer', layers.wind);
    setLayerVis('clouds-density-layer', layers.clouds);
    setLayerVis('cape-storm-layer', layers.weather);
    setLayerVis('air-quality-layer', layers.airQuality);
    setLayerVis('google-traffic-layer', layers.traffic);

    if (telemetry.radarTileUrl) {
      if (!map.getSource('rainviewer-radar')) {
        try {
          map.addSource('rainviewer-radar', {
            type: 'raster',
            tiles: [telemetry.radarTileUrl],
            tileSize: 256,
            maxzoom: 6,
          });
          map.addLayer({
            id: 'rainviewer-radar-layer',
            type: 'raster',
            source: 'rainviewer-radar',
            maxzoom: 12,
            paint: {
              'raster-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.65, 9, 0.4, 11.5, 0],
            },
          });
        } catch {
          // Ignorar
        }
      }
      setLayerVis('rainviewer-radar-layer', layers.weather);
    }

    if (telemetry.satelliteCloudTileUrl) {
      if (!map.getSource('rainviewer-clouds')) {
        try {
          map.addSource('rainviewer-clouds', {
            type: 'raster',
            tiles: [telemetry.satelliteCloudTileUrl],
            tileSize: 256,
            maxzoom: 6,
          });
          map.addLayer({
            id: 'rainviewer-clouds-layer',
            type: 'raster',
            source: 'rainviewer-clouds',
            maxzoom: 12,
            paint: {
              'raster-opacity': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 9, 0.3, 11.5, 0],
            },
          });
        } catch {
          // Ignorar
        }
      }
      setLayerVis('rainviewer-clouds-layer', layers.clouds);
    }
  }, [mapLoaded, telemetry, layers]);

  // Renderizar marcadores HTML interactivos (Viento, Olas, Calidad del Aire, Presión, Temperatura, Nubosidad, Fenómenos, Aviones, Buques, Cámaras)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Velocidad y Rachas del Viento
    if (layers.wind) {
      telemetry.metStations.forEach((st) => {
        const coords = st.geometry.coordinates as [number, number];
        const props = st.properties;
        const color = getWindColor(props.windSpeed);

        const el = document.createElement('div');
        el.className = 'cursor-pointer group relative flex items-center justify-center';
        el.innerHTML = `
          <div style="border-color:${color}" class="px-1.5 py-0.5 rounded-full bg-slate-950/90 border flex items-center gap-1 shadow-[0_0_12px_rgba(0,0,0,0.85)] group-hover:scale-125 transition-transform">
            <svg style="transform: rotate(${props.windDir}deg); color:${color}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
            <span style="color:${color}" class="text-[10px] font-mono font-bold">${props.windSpeed}</span>
            <span class="text-[8px] font-mono text-slate-300">km/h</span>
          </div>
          <span class="hidden group-hover:block absolute bottom-7 bg-slate-950/95 text-teal-200 text-[10px] font-mono px-2 py-0.5 rounded border border-teal-500/40 whitespace-nowrap z-50">
            💨 ${props.name}: ${props.windSpeed} km/h (Rachas ${props.windGusts} km/h)
          </span>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedEntity({
            category: 'wind',
            title: `Viento en ${props.name}`,
            subtitle: `Modelo GFS/ECMWF • ${props.state}`,
            coordinates: coords,
            details: {
              'Velocidad Sostenida (10m)': `${props.windSpeed} km/h`,
              'Rachas Máximas': `${props.windGusts} km/h`,
              'Dirección Vectorial': `${props.windDir}°`,
              'Energía Tormentas (CAPE)': `${props.cape} J/kg`,
              'Presión al Nivel del Mar': `${props.pressure} hPa`,
              Temperatura: `${props.temp} °C`,
            },
          });
        });

        const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
        markersRef.current.push(marker);
      });
    }

    // 2. Olas Marinas y Mar de Fondo (Open-Meteo Marine)
    if (layers.waves) {
      telemetry.metStations
        .filter((st) => st.properties.isMarine)
        .forEach((st) => {
          const coords = st.geometry.coordinates as [number, number];
          const props = st.properties;

          const el = document.createElement('div');
          el.className = 'cursor-pointer group relative flex items-center justify-center';
          el.innerHTML = `
            <div class="px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400 flex items-center gap-1 shadow-[0_0_14px_rgba(34,211,238,0.65)] group-hover:scale-125 transition-transform">
              <span class="text-[10px]">🌊</span>
              <span class="text-[10px] font-mono font-bold text-cyan-200">${props.waveHeight}m</span>
              <span class="text-[8px] font-mono text-cyan-400">${props.wavePeriod}s</span>
            </div>
            <span class="hidden group-hover:block absolute bottom-7 bg-slate-950/95 text-cyan-200 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/40 whitespace-nowrap z-50">
              🌊 ${props.name}: Ola ${props.waveHeight}m • Periodo ${props.wavePeriod}s • Mar de fondo ${props.swellHeight}m
            </span>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelectedEntity({
              category: 'waves',
              title: `Oleaje Marino: ${props.name}`,
              subtitle: `Open-Meteo Marine Wave Model • ${props.state}`,
              coordinates: coords,
              details: {
                'Altura Significativa de Ola': `${props.waveHeight} m`,
                'Mar de Fondo (Swell)': `${props.swellHeight} m`,
                'Periodo de Ola': `${props.wavePeriod} seg`,
                'Dirección de Propagación': `${props.waveDir}°`,
                'Viento Costero': `${props.windSpeed} km/h (Rachas ${props.windGusts} km/h)`,
              },
            });
          });

          const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
          markersRef.current.push(marker);
        });
    }

    // 3. Calidad del Aire, Humo CO, Polvo del Sahara e Índice UV (Copernicus CAMS)
    if (layers.airQuality) {
      telemetry.metStations.forEach((st) => {
        const coords = st.geometry.coordinates as [number, number];
        const props = st.properties;
        const color = getAqiColor(props.aqi);

        const el = document.createElement('div');
        el.className = 'cursor-pointer group relative flex items-center justify-center';
        el.innerHTML = `
          <div style="border-color:${color}" class="px-2 py-0.5 rounded-md bg-slate-950/90 border flex items-center gap-1 shadow-[0_0_12px_rgba(0,0,0,0.85)] group-hover:scale-125 transition-transform">
            <span style="color:${color}" class="text-[10px] font-mono font-bold">AQI ${props.aqi}</span>
            <span class="text-[8px] font-mono text-slate-400">PM2.5:${props.pm25}</span>
          </div>
          <span class="hidden group-hover:block absolute bottom-7 bg-slate-950/95 text-emerald-200 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/40 whitespace-nowrap z-50">
            🌫️ ${props.name} • PM2.5: ${props.pm25} µg/m³ • CO (Humo): ${props.co} µg/m³ • UV: ${props.uvIndex}
          </span>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedEntity({
            category: 'airQuality',
            title: `Calidad del Aire: ${props.name}`,
            subtitle: `Copernicus Atmosphere Monitoring Service (CAMS)`,
            coordinates: coords,
            details: {
              'Índice US AQI': `${props.aqi}`,
              'Partículas Finas (PM2.5)': `${props.pm25} µg/m³`,
              'Partículas (PM10)': `${props.pm10} µg/m³`,
              'Monóxido de Carbono (Humo)': `${props.co} µg/m³`,
              'Polvo Mineral / Sahara': `${props.dust} µg/m³`,
              'Índice de Radiación UV': `${props.uvIndex}`,
            },
          });
        });

        const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
        markersRef.current.push(marker);
      });
    }

    // 4. Presión Barométrica (Isobaras / Centros de Alta y Baja Presión)
    if (layers.pressure) {
      telemetry.metStations.forEach((st) => {
        const coords = st.geometry.coordinates as [number, number];
        const props = st.properties;
        const isLow = props.pressure <= 1009;

        const el = document.createElement('div');
        el.className = 'cursor-pointer group relative flex items-center justify-center';
        el.innerHTML = `
          <div class="px-1.5 py-0.5 rounded bg-slate-950/90 border ${
            isLow ? 'border-rose-400 text-rose-300' : 'border-sky-400 text-sky-300'
          } flex items-center gap-1 shadow-md group-hover:scale-125 transition-transform font-mono text-[10px]">
            <span class="font-bold">${isLow ? 'B' : 'A'}</span>
            <span>${props.pressure} hPa</span>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedEntity({
            category: 'pressure',
            title: `Barometría: ${props.name}`,
            subtitle: `${isLow ? 'Sistema de Baja Presión (B)' : 'Sistema de Alta Presión (A)'}`,
            coordinates: coords,
            details: {
              'Presión al Nivel del Mar': `${props.pressure} hPa`,
              'Energía Convectiva (CAPE)': `${props.cape} J/kg`,
              'Viento Superficial': `${props.windSpeed} km/h`,
              'Humedad Relativa': `${props.humidity}%`,
            },
          });
        });

        const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
        markersRef.current.push(marker);
      });
    }

    // 5. Temperatura (°C)
    if (layers.temperature) {
      telemetry.metStations.forEach((st) => {
        const coords = st.geometry.coordinates as [number, number];
        const props = st.properties;
        const color = getTempColor(props.temp);

        const el = document.createElement('div');
        el.className = 'cursor-pointer group relative flex items-center justify-center';
        el.innerHTML = `
          <div style="border-color:${color}" class="px-2 py-0.5 rounded-md bg-slate-950/90 border flex items-center gap-1 shadow-[0_0_14px_rgba(0,0,0,0.85)] group-hover:scale-125 transition-transform">
            <span style="color:${color}" class="text-[11px] font-mono font-extrabold">${props.temp}°C</span>
          </div>
          <span class="hidden group-hover:block absolute bottom-7 bg-slate-950/95 text-orange-200 text-[10px] font-mono px-2 py-0.5 rounded border border-orange-500/40 whitespace-nowrap z-50">
            🌡️ ${props.name} (Sensación ${props.feelsLike}°C) • Humedad ${props.humidity}%
          </span>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedEntity({
            category: 'temperature',
            title: `Termometría: ${props.name}`,
            subtitle: `Estado de ${props.state}`,
            coordinates: coords,
            details: {
              'Temperatura (2m)': `${props.temp} °C`,
              'Sensación Térmica': `${props.feelsLike} °C`,
              'Humedad Relativa': `${props.humidity}%`,
              'Índice UV': `${props.uvIndex}`,
              'Presión Superficial': `${props.pressure} hPa`,
              Condición: `${props.icon} ${props.condition}`,
            },
          });
        });

        const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
        markersRef.current.push(marker);
      });
    }

    // 6. Nubosidad (%)
    if (layers.clouds) {
      telemetry.metStations.forEach((st) => {
        const coords = st.geometry.coordinates as [number, number];
        const props = st.properties;

        const el = document.createElement('div');
        el.className = 'cursor-pointer group relative flex items-center justify-center';
        el.innerHTML = `
          <div class="px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-slate-400/60 flex items-center gap-1 shadow-[0_0_12px_rgba(0,0,0,0.8)] group-hover:scale-125 transition-transform">
            <span class="text-[10px]">☁️</span>
            <span class="text-[10px] font-mono font-bold text-slate-100">${props.clouds}%</span>
          </div>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedEntity({
            category: 'clouds',
            title: `Nubosidad: ${props.name}`,
            subtitle: `Cobertura Atmosférica • ${props.state}`,
            coordinates: coords,
            details: {
              'Cobertura Nubosa': `${props.clouds}%`,
              Condición: `${props.icon} ${props.condition}`,
              'Precipitación (1h)': `${props.precip} mm`,
              'Energía Tormentas (CAPE)': `${props.cape} J/kg`,
            },
          });
        });

        const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
        markersRef.current.push(marker);
      });
    }

    // 7. Fenómenos Meteorológicos y Vórtices Ciclónicos
    if (layers.weather) {
      telemetry.weatherPhenomena.forEach((wx) => {
        const coords = wx.geometry.coordinates as [number, number];
        const props = wx.properties;

        const el = document.createElement('div');
        el.className = 'cursor-pointer group relative flex items-center justify-center';
        el.innerHTML = `
          <div class="w-10 h-10 rounded-full bg-purple-950/85 border-2 border-purple-400 animate-pulse flex items-center justify-center shadow-[0_0_24px_rgba(168,85,247,0.95)] group-hover:scale-125 transition-transform">
            <span class="text-base">${props.icon || '🌀'}</span>
          </div>
          <span class="hidden group-hover:block absolute left-11 bg-slate-950/95 text-purple-200 text-[10px] font-mono px-2 py-1 rounded border border-purple-500/50 whitespace-nowrap z-50">
            ⚠️ ${props.type}: ${props.title}
          </span>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedEntity({
            category: 'weather',
            title: props.title,
            subtitle: props.region,
            coordinates: coords,
            details: {
              Clasificación: props.type,
              'Nivel de Alerta': props.severity,
              'Viento Asociado': props.wind,
              Diagnóstico: props.detail,
              Fuente: 'SMN / CONAGUA + ECMWF + RainViewer',
            },
          });
        });

        const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
        markersRef.current.push(marker);
      });
    }

    // 8. Aviones (OpenSky)
    if (layers.flights) {
      telemetry.flights.slice(0, 80).forEach((fl) => {
        const coords = fl.geometry.coordinates as [number, number];
        const props = fl.properties;

        const el = document.createElement('div');
        el.className = 'cursor-pointer group relative flex items-center justify-center';
        el.innerHTML = `
          <div class="w-6 h-6 rounded-full bg-slate-950/85 border border-cyan-400 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.8)] group-hover:scale-125 transition-transform">
            <svg style="transform: rotate(${props.heading || 0}deg)" width="13" height="13" viewBox="0 0 24 24" fill="#22d3ee" stroke="#083344" stroke-width="1.5">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
            </svg>
          </div>
          <span class="hidden group-hover:block absolute left-7 bg-slate-950/95 text-cyan-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/40 whitespace-nowrap z-50">
            ${props.callsign} • ${props.altitude}m
          </span>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedEntity({
            category: 'flight',
            title: `Vuelo ${props.callsign}`,
            subtitle: `Transpondedor ICAO: ${props.icao24.toUpperCase()}`,
            coordinates: coords,
            details: {
              'País de Registro': props.originCountry,
              'Altitud Barométrica': `${props.altitude.toLocaleString()} m`,
              'Velocidad Crucero': `${props.velocity} km/h`,
              Rumbo: `${Math.round(props.heading)}°`,
              Posición: `${coords[1].toFixed(4)}° N, ${coords[0].toFixed(4)}° W`,
            },
          });
        });

        const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
        markersRef.current.push(marker);
      });
    }

    // 9. Embarcaciones AIS
    if (layers.vessels) {
      telemetry.vessels.forEach((v) => {
        const coords = v.geometry.coordinates as [number, number];
        const props = v.properties;

        const el = document.createElement('div');
        el.className = 'cursor-pointer group relative flex items-center justify-center';
        el.innerHTML = `
          <div class="w-6 h-6 rounded-md bg-slate-950/90 border border-blue-400 flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.85)] group-hover:scale-125 transition-transform">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2">
              <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
              <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
              <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
            </svg>
          </div>
          <span class="hidden group-hover:block absolute left-7 bg-slate-950/95 text-blue-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-blue-500/40 whitespace-nowrap z-50">
            🚢 ${props.name}
          </span>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedEntity({
            category: 'vessel',
            title: props.name,
            subtitle: `${props.vesselType} • MMSI ${props.mmsi}`,
            coordinates: coords,
            details: {
              Bandera: props.flag,
              Velocidad: props.speed,
              Rumbo: `${props.course}°`,
              Destino: props.destination,
              'Sector Marítimo': props.port,
            },
          });
        });

        const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
        markersRef.current.push(marker);
      });
    }

    // 10. Cámaras Web en Vivo
    if (layers.webcams) {
      liveCameras.forEach((cam) => {
        const coords = cam.coordinates;

        const el = document.createElement('div');
        el.className = 'cursor-pointer group relative flex items-center justify-center';
        el.innerHTML = `
          <div class="w-7 h-7 rounded-full bg-slate-950/90 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.9)] group-hover:scale-125 transition-transform">
            <span class="text-xs">📹</span>
          </div>
          <span class="hidden group-hover:block absolute left-8 bg-slate-950/95 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/40 whitespace-nowrap z-50">
            ${cam.code} • ${cam.title}
          </span>
        `;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedEntity({
            category: 'webcam',
            title: cam.title,
            subtitle: `${cam.city}, ${cam.state}`,
            coordinates: coords,
            details: {
              Código: cam.code,
              Categoría: cam.category,
              Elevación: cam.elevation,
              Coordenadas: `${coords[1].toFixed(4)}° N, ${coords[0].toFixed(4)}° W`,
            },
            webcamData: {
              camId: cam.id,
              videoId: cam.videoId,
              embedUrl: cam.embedUrl,
              previewUrl: cam.liveImageFeed || cam.previewUrl,
              youtubeQuery: cam.searchQuery,
              status: 'EN VIVO • STREAM C5',
            },
          });
        });

        const marker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map);
        markersRef.current.push(marker);
      });
    }
  }, [mapLoaded, telemetry, liveCameras, layers]);

  const flyToLocation = (coords: [number, number], zoom = 14, pitch = 45) => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: coords,
      zoom,
      pitch,
      bearing: 0,
      duration: 2000,
      essential: true,
    });
  };

  const toggleLayer = (key: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentRadarFrame = telemetry.radarFrames[radarFrameIdx];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#04070d] text-slate-100 select-none font-sans">
      {/* Contenedor del Mapa con Tiles Oficiales Google Maps HD */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Lienzo de Animación de Partículas Fluidas Estilo Windy (Viento IDW + Vórtices + Olas Marinas) */}
      <canvas
        ref={windCanvasRef}
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-500 ${
          layers.wind || layers.waves ? 'opacity-90' : 'opacity-0'
        }`}
      />

      {/* Marco táctico sutil */}
      <div className="pointer-events-none absolute inset-0 border-[1px] border-cyan-500/20 m-2 rounded-lg" />

      {/* Barra Superior de Comando + Buscador Google Maps */}
      <header className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 px-4 py-2.5 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.85)]">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-400/50">
            <Eye className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-bold tracking-widest uppercase text-cyan-300">
                EL OJO DE DIOS // MÉXICO
              </h1>
              <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-400/40 px-2 py-0.5 rounded">
                GOOGLE HD + WINDY ENGINE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
              Zoom: <span className="text-cyan-300 font-bold">{currentZoom}x</span> •{' '}
              {cursorCoords.lat}° N, {cursorCoords.lng}° W
            </p>
          </div>
        </div>

        {/* Buscador de Calles, Colonias y Lugares estilo Google Maps */}
        <div className="relative flex-1 max-w-sm mx-1">
          <form onSubmit={handleSearchPlace} className="flex items-center">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) setSearchResults([]);
                }}
                placeholder="Buscar calle, colonia, ciudad en México..."
                className="w-full bg-slate-900/95 border border-slate-700 focus:border-cyan-400 rounded-lg pl-9 pr-14 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none font-sans"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-500/40 px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer"
              >
                {isSearching ? '...' : 'IR'}
              </button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-950/95 border border-cyan-500/40 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] font-mono text-slate-400">
                <span>RESULTADOS EN MÉXICO</span>
                <button
                  onClick={() => setSearchResults([])}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  CERRAR ✕
                </button>
              </div>
              {searchResults.map((item: any) => (
                <button
                  key={item.place_id}
                  onClick={() => {
                    flyToLocation([parseFloat(item.lon), parseFloat(item.lat)], 17.5, 50);
                    setSearchResults([]);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-cyan-950/60 border-b border-slate-900 flex items-center gap-2 transition cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate text-slate-200">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selector de Vista Google Maps + Botón Simulador Windy + Botón Muro C5 */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setMapMode('hybrid')}
              className={`px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
                mapMode === 'hybrid'
                  ? 'bg-blue-500/30 text-blue-200 border border-blue-400/60 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Google Maps Satélite Híbrido HD"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>SATÉLITE</span>
            </button>

            <button
              onClick={() => setMapMode('roadmap')}
              className={`px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
                mapMode === 'roadmap'
                  ? 'bg-blue-500/30 text-blue-200 border border-blue-400/60 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Google Maps Calles"
            >
              <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>CALLES</span>
            </button>

            <button
              onClick={() => setMapMode('terrain')}
              className={`px-2 py-1 rounded-md hidden xl:flex items-center gap-1 transition cursor-pointer ${
                mapMode === 'terrain'
                  ? 'bg-blue-500/30 text-blue-200 border border-blue-400/60 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Google Maps Relieve"
            >
              <Mountain className="w-3.5 h-3.5 text-amber-400" />
              <span>RELIEVE</span>
            </button>

            <button
              onClick={() => setMapMode('tactical-auto')}
              className={`px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
                mapMode === 'tactical-auto'
                  ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/60 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Modo Oscuro C5 con Auto-Satélite al acercar"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>AUTO-C5</span>
            </button>
          </div>

          {/* Botón Simulador Oficial Windy 3D */}
          <button
            onClick={() => setIsWindyOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold tracking-wider transition cursor-pointer shadow-lg ${
              isWindyOpen
                ? 'bg-teal-500/35 border-teal-400 text-teal-100'
                : 'bg-teal-500/15 hover:bg-teal-500/25 border-teal-500/50 text-teal-300'
            }`}
            title="Abrir Simulador Atmosférico Windy WebGL (Isobaras, ECMWF, Olas, CAPE, PM2.5)"
          >
            <Wind className="w-4 h-4 text-teal-400" />
            <span className="hidden lg:inline">WINDY 3D</span>
          </button>

          {/* Botón Muro C5 */}
          <button
            onClick={() => setIsWallOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold tracking-wider transition cursor-pointer shadow-lg ${
              isWallOpen
                ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/50 text-emerald-300'
            }`}
          >
            <Grid className="w-4 h-4 text-emerald-400" />
            <span className="hidden xl:inline">MURO C5 ({liveCameras.length})</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </button>

          {/* Botón Refrescar Dashboard (Conserva capas activas) */}
          <button
            onClick={handleRefreshDashboard}
            disabled={loadingTelemetry || loadingCameras}
            className="flex items-center gap-1.5 bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/60 text-cyan-100 px-3 py-1.5 rounded-lg font-bold tracking-wider transition cursor-pointer shadow-lg"
            title={`Actualizar datos en vivo de todas las capas conservando tu selección actual (Última act: ${lastSync})`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-cyan-300 ${
                loadingTelemetry || loadingCameras ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden md:inline">
              {loadingTelemetry || loadingCameras ? 'ACTUALIZANDO...' : 'REFRESCAR'}
            </span>
          </button>
        </div>
      </header>

      {/* Panel Izquierdo: Capas Estilo Windy Open-Source + Capas Tácticas */}
      <aside className="absolute top-20 left-4 z-20 w-80 max-h-[calc(100vh-6.5rem)] flex flex-col gap-3 overflow-y-auto pr-1">
        {/* Acceso Rápido Muro C5, Simulador Windy y Botón de Refresco General */}
        <div className="bg-gradient-to-r from-emerald-950/90 via-slate-950/90 to-teal-950/90 backdrop-blur-md border border-emerald-500/50 rounded-xl p-3 shadow-xl space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setIsWallSplitMode(false);
                setIsWallOpen(true);
              }}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-[11px] font-mono py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer font-bold"
            >
              <Video className="w-3.5 h-3.5" />
              <span>MURO C5 ({liveCameras.length || 103})</span>
            </button>
            <button
              onClick={() => {
                setIsWindySplit(true);
                setIsWindyOpen(true);
              }}
              className="bg-teal-500/20 hover:bg-teal-500/35 border border-teal-400/50 text-teal-200 text-[11px] font-mono py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer font-bold"
            >
              <Wind className="w-3.5 h-3.5" />
              <span>SIMULADOR WINDY</span>
            </button>
          </div>

          <button
            onClick={handleRefreshDashboard}
            disabled={loadingTelemetry || loadingCameras}
            className="w-full bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-200 text-[11px] font-mono py-2 px-3 rounded-lg flex items-center justify-between transition cursor-pointer font-bold"
            title="Vuelve a consultar los datos de todas las capas manteniendo activas únicamente las que tienes seleccionadas"
          >
            <span className="flex items-center gap-1.5">
              <RefreshCw
                className={`w-3.5 h-3.5 text-cyan-300 ${
                  loadingTelemetry || loadingCameras ? 'animate-spin' : ''
                }`}
              />
              <span>
                {loadingTelemetry || loadingCameras
                  ? 'SINCRONIZANDO CAPAS...'
                  : 'REFRESCAR DATOS DE CAPAS'}
              </span>
            </span>
            <span className="text-[10px] text-cyan-300/90 bg-black/40 px-1.5 py-0.5 rounded">
              {lastSync}
            </span>
          </button>
        </div>

        {/* Capas Atmosféricas, Oceanográficas y Ambientales (Estilo Windy Open-Source) */}
        <div className="bg-slate-950/90 backdrop-blur-md border border-teal-500/40 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-teal-400" />
              <h2 className="text-xs font-bold tracking-wider uppercase text-teal-300">
                Capas Estilo Windy (Open-Meteo / CAMS)
              </h2>
            </div>
            <span className="text-[10px] font-mono text-teal-400">7 CAPAS</span>
          </div>

          <div className="space-y-1.5 text-xs">
            {/* 1. Viento y Rachas */}
            <button
              onClick={() => toggleLayer('wind')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.wind
                  ? 'bg-teal-500/20 border-teal-400/60 text-teal-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wind className="w-4 h-4 text-teal-400" />
                <div className="text-left">
                  <div className="font-semibold">Viento, Rachas y Flujo IDW</div>
                  <div className="text-[10px] text-slate-400">
                    750 Partículas en Vivo + Vórtices
                  </div>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                {layers.wind ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* 2. Olas y Mar de Fondo */}
            <button
              onClick={() => toggleLayer('waves')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.waves
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Waves className="w-4 h-4 text-cyan-400" />
                <div className="text-left">
                  <div className="font-semibold">Olas, Mar de Fondo y Periodo</div>
                  <div className="text-[10px] text-slate-400">
                    Open-Meteo Marine (Pacífico y Golfo)
                  </div>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                {layers.waves ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* 3. Fenómenos, Tormentas CAPE y Radar Doppler */}
            <button
              onClick={() => toggleLayer('weather')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.weather
                  ? 'bg-purple-500/20 border-purple-400/60 text-purple-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CloudRain className="w-4 h-4 text-purple-400" />
                <div className="text-left">
                  <div className="font-semibold">Tormentas CAPE, Ciclones y Radar</div>
                  <div className="text-[10px] text-slate-400">
                    Energía Convectiva J/kg + Doppler
                  </div>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                {layers.weather ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* 4. Temperatura Superficial */}
            <button
              onClick={() => toggleLayer('temperature')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.temperature
                  ? 'bg-orange-500/20 border-orange-400/60 text-orange-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Thermometer className="w-4 h-4 text-orange-400" />
                <div className="text-left">
                  <div className="font-semibold">Temperatura y Sensación (°C)</div>
                  <div className="text-[10px] text-slate-400">
                    Campo Térmico Continuo + Estaciones
                  </div>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                {layers.temperature ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* 5. Calidad del Aire, Humo CO y Polvo */}
            <button
              onClick={() => toggleLayer('airQuality')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.airQuality
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <div className="font-semibold">Calidad del Aire, Humo CO y UV</div>
                  <div className="text-[10px] text-slate-400">
                    Copernicus CAMS (PM2.5, CO, Polvo)
                  </div>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                {layers.airQuality ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* 6. Presión Barométrica (hPa) */}
            <button
              onClick={() => toggleLayer('pressure')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.pressure
                  ? 'bg-sky-500/20 border-sky-400/60 text-sky-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Gauge className="w-4 h-4 text-sky-400" />
                <div className="text-left">
                  <div className="font-semibold">Presión Atmosférica (hPa)</div>
                  <div className="text-[10px] text-slate-400">
                    Centros de Alta (A) y Baja Presión (B)
                  </div>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                {layers.pressure ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* 7. Nubosidad (%) */}
            <button
              onClick={() => toggleLayer('clouds')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.clouds
                  ? 'bg-slate-400/20 border-slate-300/60 text-slate-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Cloud className="w-4 h-4 text-slate-300" />
                <div className="text-left">
                  <div className="font-semibold">Nubosidad y Satélite IR (%)</div>
                  <div className="text-[10px] text-slate-400">
                    Densidad de Nubes + Infrarrojo
                  </div>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                {layers.clouds ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Control de Capas Geofísicas y Tráfico Google Maps */}
        <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold tracking-wider uppercase text-cyan-300">
                Capas Geofísicas y Google Traffic
              </h2>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" /> ONLINE
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <button
              onClick={() => toggleLayer('traffic')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.traffic
                  ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Car className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <div className="font-semibold">Tráfico Vial Google Maps</div>
                  <div className="text-[10px] text-slate-400">Flujo Vehicular en Calles</div>
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                {layers.traffic ? 'ACTIVO' : 'OFF'}
              </span>
            </button>

            <button
              onClick={() => toggleLayer('earthquakes')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.earthquakes
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <div className="font-semibold">Terremotos y Sismos</div>
                  <div className="text-[10px] text-slate-400">USGS / SSN Catálogo Sísmico</div>
                </div>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40">
                {telemetry.earthquakes.length}
              </span>
            </button>

            <button
              onClick={() => toggleLayer('flights')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.flights
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Plane className="w-4 h-4 text-cyan-400" />
                <div className="text-left">
                  <div className="font-semibold">Espacio Aéreo (ADS-B)</div>
                  <div className="text-[10px] text-slate-400">{telemetry.flightSource}</div>
                </div>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40">
                {telemetry.flights.length}
              </span>
            </button>

            <button
              onClick={() => toggleLayer('fires')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.fires
                  ? 'bg-red-500/15 border-red-500/50 text-red-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-red-400" />
                <div className="text-left">
                  <div className="font-semibold">Incendios / Puntos de Calor</div>
                  <div className="text-[10px] text-slate-400">NASA FIRMS VIIRS & CONAFOR</div>
                </div>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40">
                {telemetry.fires.length}
              </span>
            </button>

            <button
              onClick={() => toggleLayer('vessels')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.vessels
                  ? 'bg-blue-500/15 border-blue-500/50 text-blue-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Ship className="w-4 h-4 text-blue-400" />
                <div className="text-left">
                  <div className="font-semibold">Tráfico Marítimo (AIS)</div>
                  <div className="text-[10px] text-slate-400">Puertos del Pacífico y Golfo</div>
                </div>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40">
                {telemetry.vessels.length}
              </span>
            </button>

            <button
              onClick={() => toggleLayer('webcams')}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer ${
                layers.webcams
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <div className="font-semibold">Cámaras Web Públicas (C5)</div>
                  <div className="text-[10px] text-slate-400">103 Streams Verificados (Windy / WDM)</div>
                </div>
              </div>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40">
                {liveCameras.length}
              </span>
            </button>
          </div>
        </div>

        {/* Saltos Estratégicos Rápidos */}
        <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
            <Compass className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold tracking-wider uppercase text-cyan-300">
              Vuelos Directos a Nivel Calle / Satélite
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {STRATEGIC_LOCATIONS.map((loc) => (
              <button
                key={loc.name}
                onClick={() => flyToLocation(loc.coords, loc.zoom, loc.pitch)}
                className="text-left text-[11px] bg-slate-900/80 hover:bg-cyan-950/80 border border-slate-800 hover:border-cyan-500/50 rounded-lg px-2.5 py-2 transition flex items-center gap-1.5 cursor-pointer"
              >
                <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">{loc.name}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Barra Inferior Estilo Windy: Reproductor de Radar en el Tiempo + Escala Cromática */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center gap-4 bg-slate-950/90 backdrop-blur-md border border-teal-500/40 px-4 py-2 rounded-full text-[11px] font-mono shadow-2xl">
        {telemetry.radarFrames.length > 0 && layers.weather && (
          <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
            <button
              onClick={() => setIsRadarPlaying((prev) => !prev)}
              className="w-6 h-6 rounded-full bg-purple-500/30 hover:bg-purple-500/50 border border-purple-400 flex items-center justify-center text-purple-200 cursor-pointer"
              title="Animar Evolución Temporal del Radar Doppler"
            >
              {isRadarPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <span className="text-purple-300 font-bold">
              RADAR:{' '}
              {currentRadarFrame
                ? new Date(currentRadarFrame.time * 1000).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'EN VIVO'}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-teal-300 font-bold">VIENTO (km/h):</span>
          <span className="px-1.5 rounded bg-sky-500/25 text-sky-300">&lt;12</span>
          <span className="px-1.5 rounded bg-teal-500/25 text-teal-300">22</span>
          <span className="px-1.5 rounded bg-yellow-500/25 text-yellow-300">35</span>
          <span className="px-1.5 rounded bg-rose-500/25 text-rose-300">50</span>
          <span className="px-1.5 rounded bg-fuchsia-500/25 text-fuchsia-300">&gt;65</span>
        </div>

        {layers.waves && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-slate-800 text-cyan-300">
            <Waves className="w-3.5 h-3.5" />
            <span>OLAS ACTIVAS</span>
          </div>
        )}
      </div>

      {/* Panel Derecho: Inspector de Objetivo con Street View y Video Embebido */}
      {selectedEntity && !isWallOpen && !isWindyOpen && (
        <aside className="absolute top-20 right-4 z-30 w-96 max-w-[calc(100vw-2rem)] bg-slate-950/95 backdrop-blur-xl border border-cyan-400/50 rounded-xl p-5 shadow-[0_0_40px_rgba(0,0,0,0.9)]">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                OBJETIVO SELECCIONADO // {selectedEntity.category.toUpperCase()}
              </span>
              <h3 className="text-base font-bold text-white mt-1.5">{selectedEntity.title}</h3>
              <p className="text-xs text-slate-400">{selectedEntity.subtitle}</p>
            </div>
            <button
              onClick={() => setSelectedEntity(null)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedEntity.webcamData && (
            <div className="mt-3 rounded-lg overflow-hidden border border-emerald-500/40 bg-black relative">
              <div className="w-full h-52 bg-slate-950">
                <iframe
                  key={selectedEntity.webcamData.embedUrl}
                  src={selectedEntity.webcamData.embedUrl}
                  title={selectedEntity.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <div className="flex items-center justify-between gap-1 bg-slate-950 px-3 py-2 border-t border-emerald-500/30">
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                  {selectedEntity.webcamData.status}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedEntity.webcamData.camId && (
                    <button
                      onClick={async () => {
                        const wc = selectedEntity.webcamData;
                        if (!wc || !wc.camId) return;
                        try {
                          const res = await fetch(
                            `/api/webcams?healId=${encodeURIComponent(wc.camId)}&exclude=${encodeURIComponent(wc.videoId || '')}`
                          );
                          const data = await res.json();
                          if (data.embedUrl) {
                            setSelectedEntity((prev) =>
                              prev && prev.webcamData
                                ? {
                                    ...prev,
                                    webcamData: {
                                      ...prev.webcamData,
                                      videoId: data.videoId,
                                      embedUrl: data.embedUrl,
                                      status: 'SEÑAL RECONECTADA • HD',
                                    },
                                  }
                                : prev
                            );
                            setLiveCameras((prev) =>
                              prev.map((c) =>
                                c.id === wc.camId
                                  ? { ...c, videoId: data.videoId, embedUrl: data.embedUrl }
                                  : c
                              )
                            );
                          }
                        } catch {
                          // Sin cambios
                        }
                      }}
                      className="text-[10px] font-mono bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-500/40 px-2 py-1 rounded cursor-pointer"
                      title="Buscar automáticamente otro canal en vivo activo si la transmisión de YouTube finalizó"
                    >
                      🔄 RECONECTAR
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsWallSplitMode(true);
                      setIsWallOpen(true);
                    }}
                    className="text-[10px] font-mono bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 px-2 py-1 rounded cursor-pointer"
                  >
                    ABRIR EN MURO C5
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2 font-mono text-xs">
            {Object.entries(selectedEntity.details).map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between py-1.5 px-2.5 rounded bg-slate-900/80 border border-slate-800/80"
              >
                <span className="text-slate-400">{label}:</span>
                <span className="text-cyan-200 font-semibold text-right">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => flyToLocation(selectedEntity.coordinates, 17.5, 55)}
              className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 py-2 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5" />
              ACERCAR A NIVEL CALLE / SATÉLITE HD (ZOOM 17.5x)
            </button>

            <a
              href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedEntity.coordinates[1]},${selectedEntity.coordinates[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 text-blue-200 py-2 rounded-lg text-xs font-mono flex items-center justify-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              ABRIR GOOGLE STREET VIEW 360° AQUÍ
            </a>
          </div>
        </aside>
      )}

      {/* Simulador Atmosférico Oficial Windy WebGL (Pantalla Completa o Dividida) */}
      <WindyPanel
        isOpen={isWindyOpen}
        isSplit={isWindySplit}
        onToggleSplit={() => setIsWindySplit((prev) => !prev)}
        onClose={() => setIsWindyOpen(false)}
        center={cursorCoords}
        zoom={currentZoom}
      />

      {/* Muro de Videovigilancia C5 */}
      <SurveillanceWall
        cameras={liveCameras}
        isOpen={isWallOpen}
        isSplitMode={isWallSplitMode}
        onToggleSplitMode={() => setIsWallSplitMode((prev) => !prev)}
        onClose={() => setIsWallOpen(false)}
        onLocateCamera={(cam) => {
          setIsWallSplitMode(true);
          flyToLocation(cam.coordinates, 17.2, 55);
        }}
        onRefreshCameras={fetchLiveCameras}
        loading={loadingCameras}
      />
    </div>
  );
}
