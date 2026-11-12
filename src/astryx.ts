/**
 * The Astryx components an app screen needs, so apps import their whole UI
 * from `@da-facility/ui`. These are plain re-exports: the same components,
 * from the app's own copy of Astryx (a peer dependency, never bundled here).
 * A re-export becomes a wrapper only when the library needs to change its
 * behaviour, and then keeps its name and props.
 *
 * Each name comes from its own Astryx entry point, so bundlers drop the ones
 * an app doesn't use.
 */
export {AlertDialog, type AlertDialogProps} from '@astryxdesign/core/AlertDialog';
export {Avatar, type AvatarProps} from '@astryxdesign/core/Avatar';
export {Badge, type BadgeProps} from '@astryxdesign/core/Badge';
export {Banner, type BannerProps} from '@astryxdesign/core/Banner';
export {BreadcrumbItem, Breadcrumbs, type BreadcrumbItemProps, type BreadcrumbsProps} from '@astryxdesign/core/Breadcrumbs';
export {Button, type ButtonProps} from '@astryxdesign/core/Button';
export {CheckboxInput, type CheckboxInputProps} from '@astryxdesign/core/CheckboxInput';
export {Dialog, DialogHeader, type DialogHeaderProps, type DialogProps} from '@astryxdesign/core/Dialog';
export {
  DropdownMenu,
  DropdownMenuDivider,
  DropdownMenuItem,
  type DropdownMenuItemData,
  type DropdownMenuItemProps,
  type DropdownMenuOption,
  type DropdownMenuProps,
} from '@astryxdesign/core/DropdownMenu';
export {EmptyState, type EmptyStateProps} from '@astryxdesign/core/EmptyState';
export {Field, FieldLabel, FieldStatus, type FieldLabelProps, type FieldProps, type FieldStatusProps} from '@astryxdesign/core/Field';
export {Heading, type HeadingProps} from '@astryxdesign/core/Heading';
export {Icon, type IconProps} from '@astryxdesign/core/Icon';
export {IconButton, type IconButtonProps} from '@astryxdesign/core/IconButton';
export {Lightbox, type LightboxProps} from '@astryxdesign/core/Lightbox';
export {Link, LinkProvider, type LinkProps, type LinkProviderProps} from '@astryxdesign/core/Link';
export {Pagination, type PaginationProps} from '@astryxdesign/core/Pagination';
export {RadioList, RadioListItem, type RadioListItemProps, type RadioListProps} from '@astryxdesign/core/RadioList';
export {SegmentedControl, SegmentedControlItem, type SegmentedControlItemProps, type SegmentedControlProps} from '@astryxdesign/core/SegmentedControl';
export {Selector, type SelectorProps} from '@astryxdesign/core/Selector';
export {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
  type SideNavHeadingProps,
  type SideNavItemProps,
  type SideNavProps,
  type SideNavSectionProps,
} from '@astryxdesign/core/SideNav';
export {Skeleton, type SkeletonProps} from '@astryxdesign/core/Skeleton';
export {Spinner, type SpinnerProps} from '@astryxdesign/core/Spinner';
export {Switch, type SwitchProps} from '@astryxdesign/core/Switch';
export {Tab, TabList, type TabListProps, type TabProps} from '@astryxdesign/core/TabList';
export {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  type TableBodyProps,
  type TableCellProps,
  type TableColumn,
  type TableHeaderCellProps,
  type TableHeaderProps,
  type TableProps,
  type TableRowProps,
} from '@astryxdesign/core/Table';
export {Text, type TextProps} from '@astryxdesign/core/Text';
export {TextArea, type TextAreaProps} from '@astryxdesign/core/TextArea';
export {TextInput, type TextInputProps} from '@astryxdesign/core/TextInput';
export {Token, type TokenProps} from '@astryxdesign/core/Token';
export {Tooltip, type TooltipProps} from '@astryxdesign/core/Tooltip';
export {VisuallyHidden, type VisuallyHiddenProps} from '@astryxdesign/core/VisuallyHidden';
export {Theme, useTheme} from '@astryxdesign/core/theme';
export {InternationalizationProvider, useLocale, useTranslator, type InternationalizationProviderProps} from '@astryxdesign/core/i18n';
