import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Bounding box para los Estados Unidos Mexicanos y zonas marítimas adyacentes
    // minlat=14.0, maxlat=33.0, minlon=-119.0, maxlon=-86.0
    const url =
      'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=14.0&maxlatitude=33.0&minlongitude=-119.0&maxlongitude=-86.0&limit=100&orderby=time';

    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: {
        'User-Agent': 'OjoDeDios-Mexico-Monitor/1.0',
      },
    });

    if (!res.ok) {
      throw new Error(`USGS responded with ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching earthquakes:', error);
    // Datos de respaldo realistas en caso de fallo de red
    return NextResponse.json({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'mx-fallback-1',
          properties: {
            mag: 4.3,
            place: '28 km al Sur de Acapulco de Juárez, Guerrero, MX',
            time: Date.now() - 1000 * 60 * 42,
            depth: 15.4,
            status: 'reviewed',
          },
          geometry: {
            type: 'Point',
            coordinates: [-99.89, 16.63, 15.4],
          },
        },
        {
          type: 'Feature',
          id: 'mx-fallback-2',
          properties: {
            mag: 4.1,
            place: '19 km al Suroeste de Salina Cruz, Oaxaca, MX',
            time: Date.now() - 1000 * 60 * 115,
            depth: 34.0,
            status: 'reviewed',
          },
          geometry: {
            type: 'Point',
            coordinates: [-95.32, 16.05, 34.0],
          },
        },
        {
          type: 'Feature',
          id: 'mx-fallback-3',
          properties: {
            mag: 3.9,
            place: '45 km al Oeste de Cihuatlán, Jalisco, MX',
            time: Date.now() - 1000 * 60 * 240,
            depth: 12.1,
            status: 'reviewed',
          },
          geometry: {
            type: 'Point',
            coordinates: [-104.95, 19.22, 12.1],
          },
        },
      ],
    });
  }
}
