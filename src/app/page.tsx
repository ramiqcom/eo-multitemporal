'use client';

import booleanIntersects from '@turf/intersect';
import { BBox, bboxPolygon } from '@turf/turf';
import { LngLatBoundsLike, Map, RasterTileSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useContext, useEffect, useState } from 'react';
import { Context, GlobalContext, ImageRequestBody, ImageResponseBody } from './module/global';

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

  // Bands composite
  const [bands, setBands] = useState(['B8', 'B11', 'B12']);

  // Date millis center
  const [dateSliderValue, setDateSliderValue] = useState(1_706_309_534_850);

  // Context value
  const contextDict = {
    dateSliderValue,
    setDateSliderValue,
    loadingText,
    setLoadingText,
  };

  // Function to load tile url
  async function loadTile(date: number, bounds: LngLatBoundsLike, bands: string[]): Promise<void> {
    try {
      // Show loading
      setLoadingText('Loading...');

      // Function to parse date
      const stringDate = (date: Date) => date.toISOString().split('T')[0];
      const start = new Date(date - 2_629_746_000);
      const end = new Date(date + 2_629_746_000);
      const dates = [stringDate(start), stringDate(end)];

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
    map.on('moveend', async (e) => {
      const boundsNew = map.getBounds().toArray().flat() as LngLatBoundsLike;
      const boundsNewPolygon = bboxPolygon(boundsNew as BBox);

      // Compare to previous bounds
      const oldBounds = bboxPolygon(bounds as BBox);
      const intersect = booleanIntersects(boundsNewPolygon, oldBounds);

      if (!intersect) {
        setBounds(boundsNew);
      }
    });
  }, []);

  // When the bounds or date change load tile url
  useEffect(() => {
    loadTile(dateSliderValue, bounds, bands);
  }, [dateSliderValue, bounds, bands]);

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

  return (
    <>
      <Context.Provider value={contextDict}>
        <Float />
        <div id='map'></div>
      </Context.Provider>
    </>
  );
}

function Float() {
  const { loadingText } = useContext(Context) as GlobalContext;

  return (
    <div id='float' className='flexible vertical small-gap'>
      {loadingText ? <div className='float-panel'>{loadingText}</div> : undefined}
      <TimeRange />
    </div>
  );
}

function TimeRange() {
  const { dateSliderValue, setDateSliderValue } = useContext(Context) as GlobalContext;

  const [dateTemp, setDateTemp] = useState(dateSliderValue);

  const currentDate = new Date();
  const currentDateMillis = currentDate.getTime();
  const date2019 = new Date('2019-01-01');
  const date2019Millis = date2019.getTime();

  return (
    <div className='float-panel'>
      <input
        type='range'
        value={dateTemp}
        onChange={(e) => setDateTemp(Number(e.target.value))}
        onMouseUp={() => setDateSliderValue(dateTemp)}
        min={date2019Millis}
        max={currentDateMillis}
        step={86_400_000}
        style={{
          width: '100vh',
        }}
      />
    </div>
  );
}
