'use client';

import booleanIntersects from '@turf/boolean-intersects';
import { BBox, bboxPolygon } from '@turf/turf';
import { LngLatBoundsLike, Map, RasterTileSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useContext, useEffect, useState } from 'react';
import { Context, GlobalContext, ImageRequestBody, ImageResponseBody } from './module/global';
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

  // Bands composite
  const [bands, setBands] = useState(['B8', 'B11', 'B12']);

  // Date millis center
  const [dateSliderValue, setDateSliderValue] = useState(1_706_309_534_850);

  // Checkbox for allowing to generate image
  const [allowGenerate, setAllowGenerate] = useState(true);

  // Context value
  const contextDict = {
    dateSliderValue,
    setDateSliderValue,
    loadingText,
    setLoadingText,
    allowGenerate,
    setAllowGenerate,
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

  // When the bounds or date change load tile url
  useEffect(() => {
    if (allowGenerate) {
      loadTile(dateSliderValue, bounds, bands);
    }
  }, [dateSliderValue, bounds, bands, allowGenerate]);

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
  const { dateSliderValue, setDateSliderValue, allowGenerate, setAllowGenerate } = useContext(
    Context,
  ) as GlobalContext;

  const [dateTemp, setDateTemp] = useState(dateSliderValue);

  const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
  const currentDate = new Date();
  const currentDateMillis = currentDate.getTime();
  const dateStart = new Date(`${years.at(0)}-01-01`);
  const dateStartMillis = dateStart.getTime();

  const list = years
    .map((year, index1) =>
      ['01-01', '06-31'].map((date, index2) => (
        <option
          key={Number(`${index1 + 1}0${index2 + 1}`)}
          value={new Date(`${year}-${date}`).getTime()}
        />
      )),
    )
    .flat();

  const rangeWidth = 100;
  const yearLast = new Date(`${years.at(-1)}-01-01`).getTime();
  const timeDistance = ((yearLast - dateStartMillis) * 100) / (currentDateMillis - dateStartMillis);

  return (
    <div className='flexible vertical float-panel'>
      <div className='flexible gap'>
        <div className='flexible' style={{ width: '20%' }}>
          <input
            type='checkbox'
            checked={allowGenerate}
            onChange={(e) => setAllowGenerate(e.target.checked)}
          />
          Generate image
        </div>

        <div className='flexible center1 center2' style={{ backgroundColor: 'gray', width: '80%' }}>
          {dateString(new Date(dateSliderValue))}
        </div>
      </div>

      <input
        type='range'
        value={dateTemp}
        onChange={(e) => setDateTemp(Number(e.target.value))}
        onMouseUp={() => setDateSliderValue(dateTemp)}
        min={dateStartMillis}
        max={currentDateMillis}
        step={86_400_000}
        style={{
          width: `${rangeWidth}vh`,
          color: 'white',
        }}
        list='marker'
      />

      <datalist id='marker'>{list}</datalist>

      <div className='flexible wide' style={{ width: `${timeDistance}vh` }}>
        {years.map((year, index) => (
          <div className='flexible' key={index}>
            {year}
          </div>
        ))}
      </div>
    </div>
  );
}
