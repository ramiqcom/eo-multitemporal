import { LngLatBoundsLike } from 'maplibre-gl';
import { createContext } from 'react';

export type Option = { label: string; value: any };

export type Options = Option[];

export type VisObject = {
  bands: string[];
  min: number[];
  max: number[];
  palette?: string[];
};

export type MapId = {
  mapid: string;
  urlFormat: string;
  image: Object;
};

export type ImageRequestBody = {
  bounds: LngLatBoundsLike;
  date: string[];
  bands: string[];
};

export type ImageResponseBody = {
  url?: string;
  message?: string;
};

export const Context = createContext<{}>({});
