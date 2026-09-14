import {LoginSplit} from './login-split/LoginSplit';
import {Sidebar} from './sidebar/Sidebar';
import {catalogueMetadata} from './metadata';
import type {CatalogueItem} from './types';

const components: Record<string, CatalogueItem['Component']> = {
  'login-split': LoginSplit,
  sidebar: Sidebar,
};

export const catalogue: CatalogueItem[] = catalogueMetadata.map((item) => ({
  ...item,
  Component: components[item.id],
}));

export function getCatalogueItem(id: string) {
  return catalogue.find((item) => item.id === id);
}
