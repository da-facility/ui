import {UserMenuExample} from '../examples/user-menu/UserMenuExample';
import {LoginSplitExample} from '../examples/login-split/LoginSplitExample';
import {SidebarExample} from '../examples/sidebar/SidebarExample';
import {catalogueMetadata} from './metadata';
import type {CatalogueItem} from './types';

const components: Record<string, CatalogueItem['Component']> = {
  'login-split': LoginSplitExample,
  sidebar: SidebarExample,
  'user-menu': UserMenuExample,
};

export const catalogue: CatalogueItem[] = catalogueMetadata.map((item) => ({
  ...item,
  Component: components[item.id],
}));

export function getCatalogueItem(id: string) {
  return catalogue.find((item) => item.id === id);
}
