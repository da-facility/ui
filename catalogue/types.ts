import type {ComponentType} from 'react';

/** What the catalogue passes to every example. */
export type ExampleProps = {
  /** Sub-page from the URL: `/sidebar/billing` gives `billing`. */
  page?: string;
  onPageChange: (page: string) => void;
  /** Current values of the tweaks the example declares. */
  tweaks: Record<string, boolean>;
  onTweakChange: (id: string, value: boolean) => void;
};

/** A switch in the catalogue menu. */
export type Tweak = {
  id: string;
  label: string;
  /** Heading the switch is listed under. */
  group?: string;
  /** Value until the switch is first changed. Defaults to off. */
  default?: boolean;
};

export type Example = {
  id: string;
  name: string;
  /** Matches the library folder the example demonstrates. */
  kind: 'Layout' | 'Template' | 'Component';
  description: string;
  /** Upstream design the example is adapted from. */
  source?: {label: string; url: string};
  /** Switches shown in the catalogue menu while this example is open. */
  tweaks?: Tweak[];
  Component: ComponentType<ExampleProps>;
};
