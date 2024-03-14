import { LngLatBoundsLike } from 'maplibre-gl';
import { Dispatch, SetStateAction, createContext } from 'react';

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

export type GlobalContext = {
  dateSliderValue: number;
  setDateSliderValue: Dispatch<SetStateAction<number>>;
  loadingText: string;
  setLoadingText: Dispatch<SetStateAction<string>>;
  allowGenerate: boolean;
  setAllowGenerate: Dispatch<SetStateAction<boolean>>;
  red: Option;
  setRed: Dispatch<SetStateAction<Option>>;
  green: Option;
  setGreen: Dispatch<SetStateAction<Option>>;
  blue: Option;
  setBlue: Dispatch<SetStateAction<Option>>;
};

export const Context = createContext<{}>({});
