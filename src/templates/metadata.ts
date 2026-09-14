import type {CatalogueItem} from './types';

export const catalogueMetadata: Omit<CatalogueItem, 'Component'>[] = [
  {
    id: 'login-split',
    name: 'Login Split',
    description: 'Split-screen authentication form with social sign-in and a photographic cover.',
    category: 'Template',
    source: {
      label: 'Meta Astryx',
      url: 'https://facebook.github.io/astryx/sandbox/templates/login-split/',
    },
    viewports: {
      desktop: {width: 1920, height: 1080, deviceScaleFactor: 1},
      mobile: {width: 390, height: 844, deviceScaleFactor: 1},
    },
    styles: ['src/templates/login-split/login-split.css'],
  },
  {
    id: 'sidebar',
    name: 'Sidebar',
    description: 'Meta Astryx settings navigation with grouped sections, search, and responsive settings panels.',
    category: 'Template',
    source: {
      label: 'Meta Astryx · Settings Dialog',
      url: 'https://astryx.atmeta.com/templates?preview=settings-dialog',
    },
    viewports: {
      desktop: {width: 1920, height: 1080, deviceScaleFactor: 1},
      mobile: {width: 390, height: 844, deviceScaleFactor: 1},
    },
    styles: ['src/templates/sidebar/sidebar.css'],
  },
];
