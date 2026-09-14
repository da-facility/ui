import type {ComponentType} from 'react';

export type CatalogueItem = {
  id: string;
  name: string;
  description: string;
  category: 'Template' | 'Component';
  source?: {
    label: string;
    url: string;
  };
  viewports: {
    desktop: {width: number; height: number; deviceScaleFactor: number};
    mobile: {width: number; height: number; deviceScaleFactor: number};
  };
  styles: string[];
  Component: ComponentType;
};
