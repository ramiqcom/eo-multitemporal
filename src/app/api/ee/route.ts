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

    const col: ee.FeatureCollection = ee
      .FeatureCollection(
        ['LANDSAT/LC08/C02/T1_L2', 'LANDSAT/LC09/C02/T1_L2'].map((id): ee.Image => {
          return ee.ImageCollection(id).filterBounds(geometry).filterDate(date[0], date[1]);
        }),
      )
      .flatten();

    // Make into image col and scale it to 0-1
    const imageCol: ee.ImageCollection = ee.ImageCollection(col).map(scaling);

    // Cloud masking
    const cloudMasked: ee.ImageCollection = imageCol.map(cloudMasking);

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

    // Return the tile url
    return NextResponse.json({ url: urlFormat }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }
}

/**
 * Function to scale the image to 0 - 1
 * @param image
 * @returns
 */
function scaling(image: ee.Image): ee.Image {
  return image.addBands(image.select(['SR_B.*']).multiply(0.0000275).add(-0.2), null, true);
}

/**
 * Function to cloud mask
 * @param image
 * @returns
 */
function cloudMasking(image: ee.Image): ee.Image {
  const qa = image.select('QA_PIXEL');
  const dilated = 1 << 1;
  const cirrus = 1 << 2;
  const cloud = 1 << 3;
  const shadow = 1 << 4;
  const mask = qa
    .bitwiseAnd(dilated)
    .eq(0)
    .and(qa.bitwiseAnd(cirrus).eq(0))
    .and(qa.bitwiseAnd(cloud).eq(0))
    .and(qa.bitwiseAnd(shadow).eq(0));
  return image.select(['SR_B.*']).updateMask(mask);
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
