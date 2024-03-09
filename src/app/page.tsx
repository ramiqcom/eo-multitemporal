'use client';

import { bbox, buffer, point } from '@turf/turf';
import { LngLatBoundsLike, Map, RasterTileSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useState } from 'react';
import { ImageRequestBody, ImageResponseBody } from './module/global';

export default function Home() {
  const mapDivId = 'map';
  const rasterId = 'ee-layer';

  // Maptiler key
  const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

  // Map state
  const [map, setMap] = useState<Map>();
  const [mapStyle, setMapStyle] = useState(
    `https://api.maptiler.com/maps/basic-v2/style.json?key=${mapTilerKey}`,
  );
  const [bounds, setBounds] = useState<LngLatBoundsLike>([
    105.97914832893267, -7.138747219601581, 107.78850517687292, -5.340106492152504,
  ]);
  const [tileUrl, setTileUrl] = useState<string>();

  // Function to parse date
  const stringDate = (date: Date) => date.toISOString().split('T')[0];
  const currentDate = new Date();
  const currentDateString = stringDate(currentDate);
  const currentDateMilis = currentDate.getTime();
  const lastMonthMillis = currentDateMilis - 7_889_238_000;
  const lastMonthDate = new Date(lastMonthMillis);
  const lastMonthString = stringDate(lastMonthDate);

  // Bands composite
  const [bands, setBands] = useState(['B8', 'B11', 'B12']);

  // Date state
  const [date, setDate] = useState<string[]>([lastMonthString, currentDateString]);

  // Function to load tile url
  async function loadTile(
    date: string[],
    bounds: LngLatBoundsLike,
    bands: string[],
  ): Promise<void> {
    const body: ImageRequestBody = {
      bounds,
      date,
      bands,
    };

    const res = await fetch('/api/ee', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { url, message }: ImageResponseBody = await res.json();

    if (!res.ok) {
      throw new Error(message);
    }

    setTileUrl(url);
  }

  // Load when html rendered
  useEffect(() => {
    // Load new map
    const map = new Map({
      container: mapDivId,
      bounds,
      style: mapStyle,
    });

    setMap(map);

    // When map change bounds do something
    map.on('moveend', async (e) => {
      const center = map.getCenter().toArray();
      const pointGeojson = point(center);
      const buffered = buffer(pointGeojson, 100);
      const bounds = bbox(buffered) as LngLatBoundsLike;
      setBounds(bounds);
    });
  }, []);

  // When the bounds or date change load tile url
  useEffect(() => {
    loadTile(date, bounds, bands);
  }, [date, bounds, bands]);

  // When the tile url changed then add it to map
  useEffect(() => {
    if (map && map.loaded() && tileUrl) {
      if (map.getSource(rasterId)) {
        const source = map.getSource(rasterId) as RasterTileSource;
        source.setTiles([tileUrl]);
      } else {
        map.addSource(rasterId, {
          tiles: [tileUrl],
          type: 'raster',
          tileSize: 256,
        });

        map.addLayer({
          id: rasterId,
          source: rasterId,
          type: 'raster',
          minzoom: 0,
          maxzoom: 22,
        });
      }
    }
  }, [tileUrl]);

  return <div id='map'></div>;
}
