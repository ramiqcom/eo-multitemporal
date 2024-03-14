'use client';

import booleanIntersects from '@turf/boolean-intersects';
import { BBox, bboxPolygon } from '@turf/turf';
import { LngLatBoundsLike, Map, RasterTileSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useState } from 'react';
import Float from './components/float';
import bandsSet from './data/bands.json';
import { Context, ImageRequestBody, ImageResponseBody } from './module/global';
import { dateString } from './module/utils';

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

  // Date millis center
  const [dateSliderValue, setDateSliderValue] = useState(1_706_309_534_850);

  // Checkbox for allowing to generate image
  const [allowGenerate, setAllowGenerate] = useState(true);

  // Bands selection
  const [red, setRed] = useState(bandsSet[7]);
  const [green, setGreen] = useState(bandsSet[10]);
  const [blue, setBlue] = useState(bandsSet[11]);
  const [bands, setBands] = useState<string[]>();
  useEffect(() => {
    setBands([red.value, green.value, blue.value]);
  }, [red, green, blue]);

  // Context value
  const contextDict = {
    dateSliderValue,
    setDateSliderValue,
    loadingText,
    setLoadingText,
    allowGenerate,
    setAllowGenerate,
    red,
    setRed,
    green,
    setGreen,
    blue,
    setBlue,
  };

  // Function to load tile url
  async function loadTile(date: number, bounds: LngLatBoundsLike, bands: string[]): Promise<void> {
    try {
      // Show loading
      setLoadingText('Loading...');

      // Function to parse date
      const start = new Date(date - 2_629_746_000);
      const end = new Date(date + 2_629_746_000);
      const dates = [dateString(start), dateString(end)];

      const body: ImageRequestBody = {
        bounds,
        date: dates,
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
    map.on('moveend', () => {
      const boundsNew = map.getBounds().toArray().flat() as LngLatBoundsLike;
      const boundsNewPolygon = bboxPolygon(boundsNew as BBox);

      // Compare to previous bounds
      const oldBounds = bboxPolygon(bounds as BBox);
      const intersect = booleanIntersects(boundsNewPolygon, oldBounds);
      console.log(intersect);

      if (!intersect) {
        setBounds(boundsNew);
      }
    });
  }, []);

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
          tileSize: 128,
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

  // When the bounds or date change load tile url
  useEffect(() => {
    if (allowGenerate && bands) {
      loadTile(dateSliderValue, bounds, bands);
    }
  }, [dateSliderValue, bounds, bands, allowGenerate]);

  return (
    <>
      <Context.Provider value={contextDict}>
        <Float />
        <div id='map'></div>
      </Context.Provider>
    </>
  );
}
