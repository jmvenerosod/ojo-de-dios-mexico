# 👁️ El Ojo de Dios // México — Centro de Comando Geoespacial C5 + Motor Atmosférico Windy

Plataforma de inteligencia geoespacial, monitoreo meteorológico y videovigilancia pública en tiempo real para los **Estados Unidos Mexicanos**, construida con **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, **Mapbox GL JS**, **Google Maps HD Tiles** y **Docker**.

---

## 🚀 Características Principales

### 1. 📹 Red Nacional de Videovigilancia Pública (103 Cámaras en Vivo)
- Catálogo verificado de **103 cámaras públicas en vivo** en toda la República Mexicana indexadas en **Windy.com / Webcams de México / CENAPRED**:
  - **Ciudad de México (17):** Zócalo (Panorámica y Zoom), Palacio de Bellas Artes, Torre Latinoamericana (Sur, Este, Poniente), Av. Madero, Monumento a la Revolución, Paseo de la Reforma, Bosque y Castillo de Chapultepec, Plaza Garibaldi, Basílica de Guadalupe, Tlalpan, Iztapalapa y Santa Fe.
  - **Monitoreo Volcánico (10):** Volcán Popocatépetl (Tlamacas, Altzomoni, Amecameca, Tianguismanalco, San Pedro Benito Juárez, Panorámica Puebla), Volcán de Fuego de Colima (Palmillas, Montitlán, Parque Nacional) y Volcán Citlaltépetl / Pico de Orizaba.
  - **Quintana Roo (23):** Cancún, Laguna Nichupté, Isla Mujeres, Cozumel, Playa del Carmen, Quinta Avenida, Xcaret, Xplor, Xel-Há, Tulum y 6 vistas de la Laguna de Bacalar.
  - **Yucatán (4):** Mérida, Puerto Progreso, Izamal y Valladolid.
  - **Guerrero (9):** Acapulco (Bahía Santa Lucía, Condesa, El Morro, Marina), Ixtapa y Zihuatanejo (Playa La Madera y Bahía).
  - **Baja California y BCS (5):** Cabo San Lucas, San José del Cabo, Loreto y Tijuana (Garita de San Ysidro y Zona Río).
  - **Jalisco y Bahía de Banderas (6):** Puerto Vallarta (Playa Los Muertos, Conchas Chinas, Playa Gemelas), Bahía de Banderas y Guadalajara (La Minerva y Panorámica).
  - **Querétaro (11):** Plaza de Armas, Plaza Fundadores, Av. 5 de Febrero, Panorámica, Peña de Bernal, Tequisquiapan, Amealco, Cadereyta, Jalpan de Serra, San Joaquín y Viñedos.
  - **Otros Estados (18):** Pirámides de Teotihuacán, Reserva Rancho La Onza (EdoMéx), Pachuca (Hidalgo), Oaxaca y Huatulco, Veracruz y Xalapa, Uruapan (Michoacán), Mazatlán (Sinaloa), Hermosillo y San Carlos (Sonora), Monterrey (Nuevo León) y Satélite NOAA GOES-16.
- **Muro C5 (`SurveillanceWall.tsx`):** Modos `TODAS`, `3x3`, `2x2`, `FOCO`, vista dividida con el mapa 3D, buscador instantáneo por ciudad/estado y botón de **auto-reconexión de señal (`🔄 SEÑAL / RECONECTAR`)**.

### 2. 🌬️ Capas Meteorológicas y Oceanográficas Open-Source (Estilo Windy)
- **Viento, Rachas y Flujo IDW:** 750 partículas fluidas a 60 FPS interpoladas vectorialmente (IDW) + giro ciclónico sobre modelos GFS/ECMWF (`Open-Meteo`).
- **Olas y Mar de Fondo:** Altura significativa de ola, periodo y dirección en costas del Pacífico, Golfo de México y Mar Caribe (`Open-Meteo Marine`).
- **Fenómenos y Tormentas (CAPE + Radar Doppler):** Energía convectiva de tormentas y reproductor animado de cuadros de Radar Doppler (`RainViewer`).
- **Nubosidad e Infrarrojo Satelital:** Cobertura nubosa por estación y mosaico satelital infrarrojo.
- **Temperatura, Presión Barométrica (Isobaras) y Calidad del Aire (`Copernicus CAMS`):** PM2.5, PM10, Monóxido de Carbono (Humo), Polvo del Sahara e Índice UV.
- **Simulador Atmosférico Windy 3D Embebido (`WindyPanel.tsx`):** Sincronizado en tiempo real con las coordenadas y el nivel de zoom del mapa, con selector de altitud (`Superficie`, `850 hPa`, `500 hPa`, `250 hPa`).

### 3. 🛰️ Cartografía Google Maps HD + Capas Tácticas
- **4 Modos Visuales:** `SATÉLITE` (Google Hybrid Retina `scale=2`), `CALLES` (Google Roadmap), `RELIEVE` (Google Terrain) y `AUTO-C5` (Modo oscuro táctico con transición automática a satélite HD al acercar el zoom).
- **Tráfico Vial en Vivo de Google Maps**, buscador nacional de calles/colonias (`Nominatim MX`) y enlaces directos a **Google Street View 360°**.
- **Capas Tácticas:** Sismos en tiempo real (`USGS / SSN`), Tráfico Aéreo ADS-B (`OpenSky Network`), Puntos de Calor / Incendios (`NASA FIRMS`) y Tráfico Marítimo AIS.

---

## 🐳 Despliegue Rápido con Docker

1. Clona el repositorio:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd ojo-de-dios
   ```

2. Crea tu archivo `.env.local` a partir de `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

3. Construye y levanta el contenedor en segundo plano:
   ```bash
   docker compose up -d --build
   ```

4. Abre en tu navegador:
   ```text
   http://localhost:3000
   ```

---

## 💻 Ejecución en Modo Desarrollo (Node.js)

```bash
npm install
npm run dev
```
