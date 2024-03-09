'use client';

import { BBox, bboxPolygon, booleanOverlap } from '@turf/turf';
import { LngLatBoundsLike, Map, RasterTileSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useState } from 'react';
import { ImageRequestBody, ImageResponseBody } from './module/global';

export default function Home() {
  const mapDivId = 'map';
  const rasterId = 'ee-layer';

  // Maptiler key
  const stadiaKey = process.env.NEXT_PUBLIC_STADIA_KEY;

  // Map state
  const [map, setMap] = useState<Map>();
  const [mapStyle, setMapStyle] = useState(
    `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json?api_key=${stadiaKey}`,
  );
  const [bounds, setBounds] = useState<LngLatBoundsLike>([
    106.42082590885717, -6.688028295941078, 107.32550317136398, -5.788707932216541,
  ]);
  const [tileUrl, setTileUrl] = useState<string>();
  const [loadingText, setLoadingText] = useState<string>();

  // Function to parse date
  const stringDate = (date: Date) => date.toISOString().split('T')[0];
  const currentDate = new Date();
  const currentDateString = stringDate(currentDate);
  const currentDateMilis = currentDate.getTime();
  const lastMonthMillis = currentDateMilis - 7_889_400_000;
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
    try {
      // Show loading
      setLoadingText('Loading...');

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
    } catch (error) {
      // Show loading
      setLoadingText(error.message);
    }
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
      const boundsNew = map.getBounds().toArray().flat() as LngLatBoundsLike;
      const boundsNewPolygon = bboxPolygon(boundsNew as BBox);

      // Compare to previous bounds
      const oldBounds = bboxPolygon(bounds as BBox);
      const intersect = booleanOverlap(boundsNewPolygon, oldBounds);

      if (!intersect) {
        setBounds(boundsNew);
      }
    });
  }, []);

  // When the bounds or date change load tile url
  useEffect(() => {
    loadTile(date, bounds, bands);
  }, [date, bounds, bands]);

  // When the tile url changed then add it to map
  useEffect(() => {
    if (tileUrl) {
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

      // End tile loading
      setLoadingText(undefined);
    }
  }, [tileUrl]);

  return (
    <>
      <Float text={loadingText} />
      <div id='map'></div>
    </>
  );
}

function Float({ text }: { text: string }) {
  return (
    <div id='float'>
      <div className='float-panel'>{text}</div>
    </div>
  );
}
