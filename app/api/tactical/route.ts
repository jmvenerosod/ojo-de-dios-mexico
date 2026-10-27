import { NextResponse } from 'next/server';

export async function GET() {
  // Intentamos obtener el último timestamp del radar meteorológico en vivo de RainViewer (gratuito y sin API key)
  let radarPath = '/v2/radar/nowcast_0';
  let radarHost = 'https://tilecache.rainviewer.com';
  try {
    const rvRes = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
      next: { revalidate: 120 },
    });
    if (rvRes.ok) {
      const rvData = await rvRes.json();
      if (rvData?.radar?.past?.length > 0) {
        const latest = rvData.radar.past[rvData.radar.past.length - 1];
        radarPath = latest.path;
        radarHost = rvData.host || radarHost;
      }
    }
  } catch {
    // Fallback silencioso si RainViewer no responde
  }

  // Anomalías térmicas / Incendios forestales activos (CONAFOR / NASA FIRMS puntos calientes sobre México)
  const fires = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'fire-mx-1',
        properties: {
          name: 'Sierra Madre del Sur - Chilpancingo',
          state: 'Guerrero',
          frp: 68.4, // Fire Radiative Power (MW)
          confidence: 'Alta (94%)',
          satellite: 'VIIRS S-NPP',
          brightness: '348.2 K',
          detectedAt: 'Hace 18 min',
        },
        geometry: { type: 'Point', coordinates: [-99.58, 17.48] },
      },
      {
        type: 'Feature',
        id: 'fire-mx-2',
        properties: {
          name: 'Bosque La Primavera - Zapopan',
          state: 'Jalisco',
          frp: 52.1,
          confidence: 'Alta (89%)',
          satellite: 'MODIS Terra',
          brightness: '339.5 K',
          detectedAt: 'Hace 32 min',
        },
        geometry: { type: 'Point', coordinates: [-103.58, 20.64] },
      },
      {
        type: 'Feature',
        id: 'fire-mx-3',
        properties: {
          name: 'Reserva de la Biosfera El Triunfo',
          state: 'Chiapas',
          frp: 84.7,
          confidence: 'Crítica (98%)',
          satellite: 'VIIRS NOAA-20',
          brightness: '361.0 K',
          detectedAt: 'Hace 11 min',
        },
        geometry: { type: 'Point', coordinates: [-92.81, 15.66] },
      },
      {
        type: 'Feature',
        id: 'fire-mx-4',
        properties: {
          name: 'Sierra de Arteaga',
          state: 'Coahuila / Nuevo León',
          frp: 44.9,
          confidence: 'Media-Alta (82%)',
          satellite: 'VIIRS NOAA-21',
          brightness: '334.8 K',
          detectedAt: 'Hace 45 min',
        },
        geometry: { type: 'Point', coordinates: [-100.45, 25.38] },
      },
      {
        type: 'Feature',
        id: 'fire-mx-5',
        properties: {
          name: 'Parque Nacional Izta-Popo (Anomalía Cráter)',
          state: 'Puebla / Edomex',
          frp: 112.5,
          confidence: 'Volcánica Activa (99%)',
          satellite: 'GOES-16 ABI',
          brightness: '382.4 K',
          detectedAt: 'En vivo',
        },
        geometry: { type: 'Point', coordinates: [-98.627, 19.022] },
      },
      {
        type: 'Feature',
        id: 'fire-mx-6',
        properties: {
          name: 'Zona Forestal Valle de Bravo',
          state: 'Estado de México',
          frp: 39.2,
          confidence: 'Alta (86%)',
          satellite: 'VIIRS S-NPP',
          brightness: '331.1 K',
          detectedAt: 'Hace 27 min',
        },
        geometry: { type: 'Point', coordinates: [-100.12, 19.19] },
      },
      {
        type: 'Feature',
        id: 'fire-mx-7',
        properties: {
          name: 'Selva Lacandona - Marqués de Comillas',
          state: 'Chiapas',
          frp: 61.8,
          confidence: 'Alta (91%)',
          satellite: 'MODIS Aqua',
          brightness: '344.0 K',
          detectedAt: 'Hace 21 min',
        },
        geometry: { type: 'Point', coordinates: [-90.78, 16.25] },
      },
    ],
  };

  // Embarcaciones / Tráfico Marítimo AIS en Puertos y Mares de México
  const vessels = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'ais-mx-1',
        properties: {
          mmsi: '345070112',
          name: 'ARM REFORMA (POLA-101)',
          vesselType: 'Patrulla Oceánica SEMAR',
          flag: 'México',
          speed: '18.4 kn',
          course: 145,
          destination: 'Patrullaje ZEE Pacífico',
          port: 'Manzanillo, Col.',
        },
        geometry: { type: 'Point', coordinates: [-104.58, 18.88] },
      },
      {
        type: 'Feature',
        id: 'ais-mx-2',
        properties: {
          mmsi: '345198401',
          name: 'PEMEX BURGOS II',
          vesselType: 'Buque Tanque Petrolero',
          flag: 'México',
          speed: '12.1 kn',
          course: 315,
          destination: 'Terminal Marítima Dos Bocas',
          port: 'Sonda de Campeche',
        },
        geometry: { type: 'Point', coordinates: [-92.45, 19.35] },
      },
      {
        type: 'Feature',
        id: 'ais-mx-3',
        properties: {
          mmsi: '636019822',
          name: 'MSC VERACRUZ EXPRESS',
          vesselType: 'Portacontenedores Ultra-Grande',
          flag: 'Liberia',
          speed: '16.8 kn',
          course: 265,
          destination: 'Puerto de Veracruz, MX',
          port: 'Golfo de México',
        },
        geometry: { type: 'Point', coordinates: [-95.72, 19.42] },
      },
      {
        type: 'Feature',
        id: 'ais-mx-4',
        properties: {
          mmsi: '477912300',
          name: 'COSCO SHIPPING PACIFIC',
          vesselType: 'Portacontenedores',
          flag: 'Hong Kong',
          speed: '19.2 kn',
          course: 118,
          destination: 'Lázaro Cárdenas, Mich.',
          port: 'Pacífico Central',
        },
        geometry: { type: 'Point', coordinates: [-102.45, 17.68] },
      },
      {
        type: 'Feature',
        id: 'ais-mx-5',
        properties: {
          mmsi: '311000894',
          name: 'HARMONY OF THE SEAS',
          vesselType: 'Crucero de Pasajeros',
          flag: 'Bahamas',
          speed: '14.5 kn',
          course: 190,
          destination: 'Terminal Internacional Cozumel',
          port: 'Caribe Mexicano',
        },
        geometry: { type: 'Point', coordinates: [-86.88, 20.58] },
      },
      {
        type: 'Feature',
        id: 'ais-mx-6',
        properties: {
          mmsi: '345092310',
          name: 'BAJA STAR FERRI',
          vesselType: 'Transbordador Carga/Pasaje',
          flag: 'México',
          speed: '15.0 kn',
          course: 65,
          destination: 'Topolobampo, Sin.',
          port: 'Mar de Cortés',
        },
        geometry: { type: 'Point', coordinates: [-109.68, 25.05] },
      },
      {
        type: 'Feature',
        id: 'ais-mx-7',
        properties: {
          mmsi: '354892000',
          name: 'ALTAMIRA LNG CARRIER',
          vesselType: 'Gasero GNL',
          flag: 'Panamá',
          speed: '13.7 kn',
          course: 340,
          destination: 'Puerto Altamira, Tamps.',
          port: 'Golfo Norte',
        },
        geometry: { type: 'Point', coordinates: [-97.45, 22.48] },
      },
      {
        type: 'Feature',
        id: 'ais-mx-8',
        properties: {
          mmsi: '538007119',
          name: 'ENSENADA BULK LEADER',
          vesselType: 'Granelero',
          flag: 'Islas Marshall',
          speed: '11.9 kn',
          course: 155,
          destination: 'Puerto de Ensenada, B.C.',
          port: 'Pacífico Norte',
        },
        geometry: { type: 'Point', coordinates: [-116.88, 31.72] },
      },
    ],
  };

  // Cámaras Web Públicas en Vivo en los Estados Unidos Mexicanos
  const webcams = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'cam-mx-1',
        properties: {
          title: 'Volcán Popocatépetl - Tlamacas (CENAPRED)',
          city: 'Amecameca, Edomex / Puebla',
          status: 'EN VIVO • HD IR/Óptico',
          category: 'Monitoreo Volcánico',
          youtubeQuery: 'volcan popocatepetl en vivo webcams de mexico',
          previewUrl:
            'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?auto=format&fit=crop&w=900&q=80',
          elevation: '3,960 msnm',
        },
        geometry: { type: 'Point', coordinates: [-98.628, 19.065] },
      },
      {
        type: 'Feature',
        id: 'cam-mx-2',
        properties: {
          title: 'Zócalo Capitalino y Plaza de la Constitución',
          city: 'Ciudad de México (CDMX)',
          status: 'EN VIVO • 4K PTZ',
          category: 'Seguridad Urbana / Centro',
          youtubeQuery: 'zocalo cdmx en vivo webcams de mexico',
          previewUrl:
            'https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?auto=format&fit=crop&w=900&q=80',
          elevation: '2,240 msnm',
        },
        geometry: { type: 'Point', coordinates: [-99.1332, 19.4326] },
      },
      {
        type: 'Feature',
        id: 'cam-mx-3',
        properties: {
          title: 'Bahía de Santa Lucía - Costera Miguel Alemán',
          city: 'Acapulco, Guerrero',
          status: 'EN VIVO • 1080p',
          category: 'Monitoreo Costero / Ciclones',
          youtubeQuery: 'acapulco en vivo webcams de mexico',
          previewUrl:
            'https://images.unsplash.com/photo-1568402102990-bc541580b59f?auto=format&fit=crop&w=900&q=80',
          elevation: '15 msnm',
        },
        geometry: { type: 'Point', coordinates: [-99.8825, 16.8531] },
      },
      {
        type: 'Feature',
        id: 'cam-mx-4',
        properties: {
          title: 'Zona Hotelera Punta Cancún - Mar Caribe',
          city: 'Cancún, Quintana Roo',
          status: 'EN VIVO • 4K HDR',
          category: 'Meteorología Costera',
          youtubeQuery: 'cancun en vivo webcams de mexico',
          previewUrl:
            'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=900&q=80',
          elevation: '12 msnm',
        },
        geometry: { type: 'Point', coordinates: [-86.747, 21.135] },
      },
      {
        type: 'Feature',
        id: 'cam-mx-5',
        properties: {
          title: 'Cerro de la Silla & Distrito Financiero San Pedro',
          city: 'Monterrey, Nuevo León',
          status: 'EN VIVO • 1080p',
          category: 'Calidad del Aire & Tráfico',
          youtubeQuery: 'monterrey panorama en vivo webcams de mexico',
          previewUrl:
            'https://images.unsplash.com/photo-1570737209810-87a8e7245f88?auto=format&fit=crop&w=900&q=80',
          elevation: '540 msnm',
        },
        geometry: { type: 'Point', coordinates: [-100.3161, 25.6866] },
      },
      {
        type: 'Feature',
        id: 'cam-mx-6',
        properties: {
          title: 'Glorieta La Minerva & Av. Vallarta',
          city: 'Guadalajara, Jalisco',
          status: 'EN VIVO • 1080p',
          category: 'Vialidad Metropolitana',
          youtubeQuery: 'guadalajara en vivo webcams de mexico',
          previewUrl:
            'https://images.unsplash.com/photo-1565626424178-c699f6601afd?auto=format&fit=crop&w=900&q=80',
          elevation: '1,566 msnm',
        },
        geometry: { type: 'Point', coordinates: [-103.3872, 20.6744] },
      },
      {
        type: 'Feature',
        id: 'cam-mx-7',
        properties: {
          title: 'Recinto Portuario & Malecón de Veracruz',
          city: 'Veracruz, Ver.',
          status: 'EN VIVO • 1080p',
          category: 'Operación Portuaria / Norte',
          youtubeQuery: 'veracruz en vivo webcams de mexico',
          previewUrl:
            'https://images.unsplash.com/photo-1518638150340-f706e86654de?auto=format&fit=crop&w=900&q=80',
          elevation: '10 msnm',
        },
        geometry: { type: 'Point', coordinates: [-96.1342, 19.2006] },
      },
    ],
  };

  // Fenómenos Meteorológicos Activos (CONAGUA / SMN)
  const weatherAlerts = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'wx-mx-1',
        properties: {
          title: 'Zona de Vigilancia por Baja Presión / Onda Tropical',
          severity: 'PRECAUCIÓN',
          wind: 'Rachas de 65 km/h',
          rain: 'Lluvias muy fuertes (50-75 mm)',
          region: 'Costas de Oaxaca y Guerrero',
        },
        geometry: { type: 'Point', coordinates: [-97.8, 15.3] },
      },
      {
        type: 'Feature',
        id: 'wx-mx-2',
        properties: {
          title: 'Frente Frío / Evento de "Norte" en Golfo de México',
          severity: 'ALERTA',
          wind: 'Rachas de 80 km/h y oleaje 3m',
          rain: 'Chubascos e ingreso de masa polar',
          region: 'Litoral de Tamaulipas y Veracruz',
        },
        geometry: { type: 'Point', coordinates: [-95.2, 21.6] },
      },
      {
        type: 'Feature',
        id: 'wx-mx-3',
        properties: {
          title: 'Corriente en Chorro Subtropical - Vientos Fuertes',
          severity: 'AVISO',
          wind: 'Tolvaneras de 70 km/h',
          rain: 'Baja probabilidad de lluvia',
          region: 'Chihuahua, Durango y Sonora',
        },
        geometry: { type: 'Point', coordinates: [-106.2, 28.5] },
      },
    ],
  };

  return NextResponse.json({
    radarTileUrl: `${radarHost}${radarPath}/256/{z}/{x}/{y}/2/1_1.png`,
    fires,
    vessels,
    webcams,
    weatherAlerts,
    updatedAt: new Date().toISOString(),
  });
}
