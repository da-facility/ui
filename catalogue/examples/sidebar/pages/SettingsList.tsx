// Adapted from the Meta Astryx Settings Dialog template. See LICENSE.third-party.
import {Children, type ComponentType, type ReactNode, type SVGProps} from 'react';
import {Card} from '@astryxdesign/core/Card';
import {Divider} from '@astryxdesign/core/Divider';
import {HStack} from '@astryxdesign/core/HStack';
import {Icon} from '@astryxdesign/core/Icon';
import {Stack, StackItem} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import {VStack} from '@astryxdesign/core/VStack';
import * as stylex from '@stylexjs/stylex';

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const ROW_PADDING = 4;
export const CONTROL_WIDTH = 192;

const PAGE_CONTAINER = 'settings-page';
// Rows stack their control under the text when the page column is narrow.
const NARROW_PAGE = `@container ${PAGE_CONTAINER} (max-width: 480px)`;

const styles = stylex.create({
  page: {
    containerType: 'inline-size',
    containerName: PAGE_CONTAINER,
  },
  row: {
    display: 'flex',
    flexDirection: {default: 'row', [NARROW_PAGE]: 'column'},
    alignItems: {default: 'center', [NARROW_PAGE]: 'stretch'},
    gap: {default: 'var(--spacing-3)', [NARROW_PAGE]: 'var(--spacing-2)'},
  },
  text: {
    maxWidth: {default: 420, [NARROW_PAGE]: 'none'},
  },
  control: {
    flexShrink: 0,
  },
});

/** Container-query root for a settings page, so rows adapt to the column rather than the screen. */
export function SettingsPage({children}: {children: ReactNode}) {
  return <VStack gap={4} xstyle={styles.page}>{children}</VStack>;
}

/** A titled card of rows separated by dividers. */
export function SettingsCard({title, children}: {title?: string; children: ReactNode}) {
  return (
    <VStack gap={1.5}>
      {title != null && <Text type="supporting" weight="semibold" color="secondary">{title}</Text>}
      <Card padding={0} width="100%" variant="muted">
        <VStack as="ul" role="list" gap={0}>
          {Children.toArray(children).map((row, index) => (
            <VStack key={index} as="li" gap={0}>
              {index > 0 && <Divider variant="subtle" />}
              {row}
            </VStack>
          ))}
        </VStack>
      </Card>
    </VStack>
  );
}

type SettingsRowProps = {
  title: string;
  icon: IconComponent;
  /** Shown beside the title, such as a status token. */
  titleAccessory?: ReactNode;
  description?: ReactNode;
  control?: ReactNode;
  /** Full-width content below the row. */
  detail?: ReactNode;
};

export function SettingsRow({title, icon, titleAccessory, description, control, detail}: SettingsRowProps) {
  return (
    <VStack padding={ROW_PADDING} gap={2}>
      <Stack xstyle={styles.row}>
        <StackItem size="fill">
          <HStack gap={2} align="start">
            <VStack paddingBlockStart={0.5}>
              <Icon icon={icon} size="sm" color="secondary" />
            </VStack>
            <VStack gap={0.5} xstyle={styles.text}>
              <HStack gap={1.5} align="center">
                <Text type="label">{title}</Text>
                {titleAccessory}
              </HStack>
              {description != null && <Text type="supporting" color="secondary">{description}</Text>}
            </VStack>
          </HStack>
        </StackItem>
        {control != null && <VStack xstyle={styles.control}>{control}</VStack>}
      </Stack>
      {detail}
    </VStack>
  );
}
