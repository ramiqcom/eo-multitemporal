import 'node-self';

import ee from '@google/earthengine';
import { NextResponse } from 'next/server';
import { ImageRequestBody, MapId, VisObject } from '../../module/global';

export async function POST(req: Request) {
  try {
    const { bounds, date, bands }: ImageRequestBody = await req.json();

    // Authenticate
    await authenticate(process.env.EE_KEY);

    const geometry: ee.Geometry = ee.Geometry.BBox(bounds[0], bounds[1], bounds[2], bounds[3]);

    // Make into image col
    const imageCol: ee.ImageCollection = ee
      .ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(geometry)
      .filterDate(date[0], date[1]);

    // Cloud masking col
    const maskingCol: ee.ImageCollection = ee
      .ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED')
      .filterBounds(geometry)
      .filterDate(date[0], date[1]);

    // Connect col
    const connectCol = imageCol.linkCollection(maskingCol, ['cs_cdf']);

    // Cloud masking
    const cloudMasked: ee.ImageCollection = connectCol.map(cloudMasking);

    // Composite
    const median: ee.Image = cloudMasked.median();

    // Visualization parameter
    const vis = {
      bands,
      min: [0.1, 0.05, 0.025],
      max: [0.4, 0.3, 0.2],
    };

    // Get image url
    const { urlFormat } = await getMapId(median, vis);
    console.log(urlFormat);

    // Return the tile url
    return NextResponse.json({ url: urlFormat }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }
}

/**
 * Function to cloud mask
 * @param image
 * @returns
 */
function cloudMasking(image: ee.Image): ee.Image {
  const cs = image.select('cs_cdf');
  const mask = cs.gt(0.6);
  return image.select(['B.*']).updateMask(mask).multiply(0.0001);
}

/**
 * Function to authenticate earth engine
 * @param key
 * @returns
 */
function authenticate(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(
      JSON.parse(key),
      () =>
        ee.initialize(
          null,
          null,
          (): void => resolve(undefined),
          (error: string): void => reject(new Error(error)),
        ),
      (error: string): void => reject(new Error(error)),
    );
  });
}

/**
 * Function to get image tile map url
 * @param image
 * @param vis
 * @returns
 */
function getMapId(image: ee.Image, vis: VisObject): Promise<MapId> {
  return new Promise((resolve, reject) => {
    image.getMapId(vis, (obj: MapId, error: string) =>
      error ? reject(new Error(error)) : resolve(obj),
    );
  });
}

/**
 * Function to evaluate earth engine data to conventional data
 * @param obj
 * @returns
 */
function evaluate(obj: ee.Element): Promise<any> {
  return new Promise((resolve, reject) =>
    obj.evaluate((result: any, error: string) =>
      error ? reject(new Error(error)) : resolve(result),
    ),
  );
}
