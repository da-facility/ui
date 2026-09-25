import {Theme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import type {ReactNode} from 'react';
import '@astryxdesign/theme-neutral/theme.css';

export function UIProvider({children, mode = 'light'}: {children: ReactNode; mode?: 'light' | 'dark'}) {
  return <Theme theme={neutralTheme} mode={mode}>{children}</Theme>;
}
