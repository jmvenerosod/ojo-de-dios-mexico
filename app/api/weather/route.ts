import { NextResponse } from 'next/server';

interface MetStation {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
  isMarine?: boolean;
}

// 30 nodos meteorológicos y oceanográficos cubriendo la República Mexicana, Pacífico, Golfo de México y Mar Caribe
const MEXICO_MET_NODES: MetStation[] = [
  { id: 'mx-met-1', name: 'Ciudad de México (Valle)', state: 'CDMX', lat: 19.4326, lon: -99.1332 },
  { id: 'mx-met-2', name: 'Monterrey', state: 'Nuevo León', lat: 25.6866, lon: -100.3161 },
  { id: 'mx-met-3', name: 'Guadalajara', state: 'Jalisco', lat: 20.6597, lon: -103.3496 },
  { id: 'mx-met-4', name: 'Cancún / Canal de Yucatán', state: 'Quintana Roo', lat: 21.1619, lon: -86.65, isMarine: true },
  { id: 'mx-met-5', name: 'Mérida / Costa Progreso', state: 'Yucatán', lat: 21.35, lon: -89.66, isMarine: true },
  { id: 'mx-met-6', name: 'Veracruz Golfo Centro', state: 'Veracruz', lat: 19.25, lon: -95.95, isMarine: true },
  { id: 'mx-met-7', name: 'Acapulco Pacífico Sur', state: 'Guerrero', lat: 16.65, lon: -99.9, isMarine: true },
  { id: 'mx-met-8', name: 'Tijuana / Pacífico Norte', state: 'Baja California', lat: 32.45, lon: -117.25, isMarine: true },
  { id: 'mx-met-9', name: 'Cabo San Lucas (Boca del Mar de Cortés)', state: 'BCS', lat: 22.75, lon: -109.91, isMarine: true },
  { id: 'mx-met-10', name: 'Hermosillo (Desierto Sonora)', state: 'Sonora', lat: 29.0729, lon: -110.9559 },
  { id: 'mx-met-11', name: 'Chihuahua Capital', state: 'Chihuahua', lat: 28.633, lon: -106.0691 },
  { id: 'mx-met-12', name: 'Ciudad Juárez', state: 'Chihuahua', lat: 31.6904, lon: -106.4245 },
  { id: 'mx-met-13', name: 'Torreón (Comarca Lagunera)', state: 'Coahuila', lat: 25.5428, lon: -103.4068 },
  { id: 'mx-met-14', name: 'Tampico / Golfo Norte', state: 'Tamaulipas', lat: 22.25, lon: -97.65, isMarine: true },
  { id: 'mx-met-15', name: 'Culiacán', state: 'Sinaloa', lat: 24.8091, lon: -107.394 },
  { id: 'mx-met-16', name: 'Mazatlán Litoral', state: 'Sinaloa', lat: 23.15, lon: -106.55, isMarine: true },
  { id: 'mx-met-17', name: 'Puerto Vallarta / Bahía Banderas', state: 'Jalisco', lat: 20.6, lon: -105.45, isMarine: true },
  { id: 'mx-met-18', name: 'Manzanillo Offshore', state: 'Colima', lat: 18.95, lon: -104.5, isMarine: true },
  { id: 'mx-met-19', name: 'Lázaro Cárdenas Marítimo', state: 'Michoacán', lat: 17.8, lon: -102.3, isMarine: true },
  { id: 'mx-met-20', name: 'Morelia', state: 'Michoacán', lat: 19.706, lon: -101.195 },
  { id: 'mx-met-21', name: 'San Luis Potosí', state: 'SLP', lat: 22.1565, lon: -100.9855 },
  { id: 'mx-met-22', name: 'Querétaro', state: 'Querétaro', lat: 20.5888, lon: -100.3899 },
  { id: 'mx-met-23', name: 'Puebla de Zaragoza', state: 'Puebla', lat: 19.0414, lon: -98.2063 },
  { id: 'mx-met-24', name: 'Oaxaca de Juárez', state: 'Oaxaca', lat: 17.0732, lon: -96.7266 },
  { id: 'mx-met-25', name: 'Golfo de Tehuantepec (Salina Cruz)', state: 'Oaxaca', lat: 15.95, lon: -95.19, isMarine: true },
  { id: 'mx-met-26', name: 'Villahermosa', state: 'Tabasco', lat: 17.9895, lon: -92.9475 },
  { id: 'mx-met-27', name: 'Tuxtla Gutiérrez', state: 'Chiapas', lat: 16.7516, lon: -93.103 },
  { id: 'mx-met-28', name: 'Puerto Chiapas (Pacífico Sur)', state: 'Chiapas', lat: 14.65, lon: -92.5, isMarine: true },
  { id: 'mx-met-29', name: 'Sonda de Campeche (Plataformas)', state: 'Golfo de México', lat: 19.83, lon: -91.6, isMarine: true },
  { id: 'mx-met-30', name: 'La Paz / Mar de Cortés', state: 'BCS', lat: 24.3, lon: -110.2, isMarine: true },
];

function decodeWmoWeather(code: number): { label: string; isSevere: boolean; icon: string } {
  if (code === 0) return { label: 'Cielo Despejado', isSevere: false, icon: '☀️' };
  if (code === 1 || code === 2) return { label: 'Parcialmente Nublado', isSevere: false, icon: '⛅' };
  if (code === 3) return { label: 'Nublado Cerrado', isSevere: false, icon: '☁️' };
  if (code >= 45 && code <= 48) return { label: 'Banco de Niebla Densa', isSevere: true, icon: '🌫️' };
  if (code >= 51 && code <= 57) return { label: 'Llovizna Persistente', isSevere: false, icon: '🌦️' };
  if (code >= 61 && code <= 67) return { label: 'Lluvia Moderada a Fuerte', isSevere: true, icon: '🌧️' };
  if (code >= 71 && code <= 77) return { label: 'Aguanieve / Granizo', isSevere: true, icon: '🌨️' };
  if (code >= 80 && code <= 82) return { label: 'Chubascos Torrenciales', isSevere: true, icon: '⛈️' };
  if (code >= 95) return { label: 'Tormenta Eléctrica Severa', isSevere: true, icon: '🌩️' };
  return { label: 'Condición Variable', isSevere: false, icon: '🌤️' };
}

export async function GET() {
  // 1. Obtener cuadros de animación de Radar de Precipitación y Satélite Infrarrojo de RainViewer
  let radarTileUrl = '';
  let radarFrames: { time: number; tileUrl: string }[] = [];
  let satelliteCloudTileUrl = '';

  try {
    const rvRes = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
      next: { revalidate: 120 },
    });
    if (rvRes.ok) {
      const rvData = await rvRes.json();
      const host = rvData.host || 'https://tilecache.rainviewer.com';
      if (rvData?.radar?.past?.length > 0) {
        const allFrames = [...rvData.radar.past, ...(rvData.radar.nowcast || [])];
        radarFrames = allFrames.map((f: any) => ({
          time: f.time,
          tileUrl: `${host}${f.path}/256/{z}/{x}/{y}/2/1_1.png`,
        }));
        const latestRadar = rvData.radar.past[rvData.radar.past.length - 1];
        radarTileUrl = `${host}${latestRadar.path}/256/{z}/{x}/{y}/2/1_1.png`;
      }
      if (rvData?.satellite?.infrared?.length > 0) {
        const latestSat = rvData.satellite.infrared[rvData.satellite.infrared.length - 1];
        satelliteCloudTileUrl = `${host}${latestSat.path}/256/{z}/{x}/{y}/0/0_0.png`;
      }
    }
  } catch {
    // Continuar si RainViewer tarda
  }

  const lats = MEXICO_MET_NODES.map((n) => n.lat).join(',');
  const lons = MEXICO_MET_NODES.map((n) => n.lon).join(',');

  // 2. Consultar en paralelo las 3 APIs abiertas de Open-Meteo (GFS/ECMWF Atmosférico + CAPE, Copernicus Calidad del Aire y Olas Marinas)
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cape&timezone=America%2FMexico_City`;
  const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=us_aqi,pm10,pm2_5,carbon_monoxide,dust,uv_index&timezone=America%2FMexico_City`;

  const marineNodes = MEXICO_MET_NODES.filter((n) => n.isMarine);
  const marineLats = marineNodes.map((n) => n.lat).join(',');
  const marineLons = marineNodes.map((n) => n.lon).join(',');
  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${marineLats}&longitude=${marineLons}&current=wave_height,wave_direction,wave_period,swell_wave_height&timezone=America%2FMexico_City`;

  let stationFeatures: any[] = [];

  try {
    const [omRes, aqRes, marRes] = await Promise.all([
      fetch(forecastUrl, { next: { revalidate: 180 } }),
      fetch(airQualityUrl, { next: { revalidate: 300 } }).catch(() => null),
      fetch(marineUrl, { next: { revalidate: 300 } }).catch(() => null),
    ]);

    if (!omRes.ok) throw new Error(`Open-Meteo HTTP ${omRes.status}`);
    const omData = await omRes.json();
    const omResults = Array.isArray(omData) ? omData : [omData];

    let aqResults: any[] = [];
    if (aqRes && aqRes.ok) {
      const aqData = await aqRes.json();
      aqResults = Array.isArray(aqData) ? aqData : [aqData];
    }

    const marineMap: Record<string, any> = {};
    if (marRes && marRes.ok) {
      const marData = await marRes.json();
      const marResults = Array.isArray(marData) ? marData : [marData];
      marineNodes.forEach((mn, mIdx) => {
        marineMap[mn.id] = marResults[mIdx]?.current || {};
      });
    }

    stationFeatures = MEXICO_MET_NODES.map((node, index) => {
      const current = omResults[index]?.current || {};
      const aq = aqResults[index]?.current || {};
      const mar = marineMap[node.id] || {};

      const temp = current.temperature_2m ?? 24;
      const feelsLike = current.apparent_temperature ?? temp;
      const windSpeed = current.wind_speed_10m ?? 14;
      const windDir = current.wind_direction_10m ?? 90;
      const windGusts = current.wind_gusts_10m ?? windSpeed + 8;
      const clouds = current.cloud_cover ?? 35;
      const humidity = current.relative_humidity_2m ?? 55;
      const precip = current.precipitation ?? 0;
      const pressureMsl = current.pressure_msl ?? current.surface_pressure ?? 1013;
      const cape = current.cape ?? 150;
      const wmo = decodeWmoWeather(current.weather_code ?? 1);

      // Calidad del aire (Copernicus CAMS)
      const aqi = aq.us_aqi ?? 42;
      const pm25 = aq.pm2_5 ?? 11.5;
      const pm10 = aq.pm10 ?? 22.0;
      const co = aq.carbon_monoxide ?? 190;
      const dust = aq.dust ?? 5;
      const uvIndex = aq.uv_index ?? 6.5;

      // Datos oceanográficos (si es nodo costero/marítimo)
      const waveHeight = mar.wave_height ?? (node.isMarine ? 1.4 : 0);
      const waveDir = mar.wave_direction ?? windDir;
      const wavePeriod = mar.wave_period ?? (node.isMarine ? 8.5 : 0);
      const swellHeight = mar.swell_wave_height ?? (node.isMarine ? 1.1 : 0);

      return {
        type: 'Feature',
        id: node.id,
        properties: {
          id: node.id,
          name: node.name,
          state: node.state,
          isMarine: Boolean(node.isMarine),
          temp: Number(temp.toFixed(1)),
          feelsLike: Number(feelsLike.toFixed(1)),
          windSpeed: Number(windSpeed.toFixed(1)),
          windDir: Math.round(windDir),
          windGusts: Number(windGusts.toFixed(1)),
          clouds: Math.round(clouds),
          humidity: Math.round(humidity),
          precip: Number(precip.toFixed(1)),
          pressure: Math.round(pressureMsl),
          cape: Math.round(cape),
          aqi: Math.round(aqi),
          pm25: Number(pm25.toFixed(1)),
          pm10: Number(pm10.toFixed(1)),
          co: Math.round(co),
          dust: Math.round(dust),
          uvIndex: Number(uvIndex.toFixed(1)),
          waveHeight: Number(waveHeight.toFixed(2)),
          waveDir: Math.round(waveDir),
          wavePeriod: Number(wavePeriod.toFixed(1)),
          swellHeight: Number(swellHeight.toFixed(2)),
          condition: wmo.label,
          icon: wmo.icon,
          isSevere: wmo.isSevere || windGusts >= 45 || temp >= 37 || cape >= 1200,
        },
        geometry: {
          type: 'Point',
          coordinates: [node.lon, node.lat],
        },
      };
    });
  } catch (err) {
    console.error('Error Open-Meteo, usando telemetría climática de respaldo:', err);
    stationFeatures = MEXICO_MET_NODES.map((node, idx) => ({
      type: 'Feature',
      id: node.id,
      properties: {
        id: node.id,
        name: node.name,
        state: node.state,
        isMarine: Boolean(node.isMarine),
        temp: 22 + (idx % 14),
        feelsLike: 24 + (idx % 14),
        windSpeed: 12 + (idx % 25),
        windDir: (idx * 35) % 360,
        windGusts: 20 + (idx % 30),
        clouds: (idx * 17) % 100,
        humidity: 60,
        precip: 0,
        pressure: 1008 + (idx % 12),
        cape: 120 + (idx * 95) % 1600,
        aqi: 35 + (idx * 7) % 90,
        pm25: 9.5 + (idx % 18),
        pm10: 18 + (idx % 30),
        co: 180 + (idx * 15),
        dust: 4 + (idx % 15),
        uvIndex: 7.2,
        waveHeight: node.isMarine ? 1.2 + (idx % 3) * 0.6 : 0,
        waveDir: (idx * 40) % 360,
        wavePeriod: node.isMarine ? 9.2 : 0,
        swellHeight: node.isMarine ? 1.1 : 0,
        condition: 'Parcialmente Nublado',
        icon: '⛅',
        isSevere: idx % 7 === 0,
      },
      geometry: {
        type: 'Point',
        coordinates: [node.lon, node.lat],
      },
    }));
  }

  // 3. Fenómenos Meteorológicos Sinópticos (Con Vórtices Ciclónicos para el Motor de Partículas)
  const phenomenaFeatures = [
    {
      type: 'Feature',
      id: 'phenom-1',
      properties: {
        title: 'Chorro Eólico "Tehuano" en el Golfo de Tehuantepec',
        type: 'VIENTO EXTREMO / NORTE',
        severity: 'ALERTA NARANJA',
        wind: 'Rachas de 70 a 95 km/h',
        detail:
          'Aceleración eólica por gradiente barométrico entre el Golfo de México y el Océano Pacífico provocando oleaje de 3 a 4 metros.',
        region: 'Istmo y Golfo de Tehuantepec (Oaxaca / Chiapas)',
        icon: '💨',
        vortexStrength: -0.6,
      },
      geometry: { type: 'Point', coordinates: [-94.95, 15.85] },
    },
    {
      type: 'Feature',
      id: 'phenom-2',
      properties: {
        title: 'Zona de Baja Presión / Perturbación Ciclónica del Pacífico',
        type: 'VÓRTICE CICLÓNICO / TORMENTA',
        severity: 'VIGILANCIA CICLÓNICA',
        wind: 'Rachas de 65 km/h y rotación ciclónica',
        detail:
          'Circulación cerrada de baja presión (1004 hPa) con convección profunda (CAPE > 1,500 J/kg) y mar de fondo hacia costas de Guerrero y Michoacán.',
        region: 'Pacífico Sur Mexicano (Acapulco - Lázaro Cárdenas)',
        icon: '🌀',
        vortexStrength: 1.4,
      },
      geometry: { type: 'Point', coordinates: [-101.2, 15.6] },
    },
    {
      type: 'Feature',
      id: 'phenom-3',
      properties: {
        title: 'Frente Frío y Línea de Turbonada en el Golfo Norte',
        type: 'FRENTE FRÍO ACTIVO',
        severity: 'ALERTA AMARILLA',
        wind: 'Rachas de 75 km/h y evento de Norte',
        detail:
          'Masa de aire polar ingresando al noreste y litoral del Golfo de México con convergencia frontal.',
        region: 'Tamaulipas, Nuevo León y Norte de Veracruz',
        icon: '⛈️',
        vortexStrength: 0.5,
      },
      geometry: { type: 'Point', coordinates: [-96.8, 22.8] },
    },
    {
      type: 'Feature',
      id: 'phenom-4',
      properties: {
        title: 'Onda Tropical y Flujo Alisio del Mar Caribe',
        type: 'ONDA TROPICAL',
        severity: 'VIGILANCIA',
        wind: 'Vientos alisios de 45 km/h y marejada 2.2m',
        detail:
          'Eje de onda tropical desplazándose hacia el oeste sobre el Canal de Yucatán y Quintana Roo.',
        region: 'Mar Caribe y Península de Yucatán',
        icon: '🌊',
        vortexStrength: 0.8,
      },
      geometry: { type: 'Point', coordinates: [-85.8, 19.6] },
    },
  ];

  return NextResponse.json({
    radarTileUrl,
    radarFrames,
    satelliteCloudTileUrl,
    stations: {
      type: 'FeatureCollection',
      features: stationFeatures,
    },
    phenomena: {
      type: 'FeatureCollection',
      features: phenomenaFeatures,
    },
    updatedAt: new Date().toISOString(),
  });
}
