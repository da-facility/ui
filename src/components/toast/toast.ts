import type {ReactElement} from 'react';
import {toast as sonnerToast, type ExternalToast} from 'sonner';
import {prepareLaunch, type ToastFrom} from './arrival';
import {replaceInPlace} from './wave';

export type {ToastFrom};

/**
 * Options for one toast: Sonner's (`description`, `action`, `cancel`,
 * `duration`, `id`, `closeButton`, `dismissible`, `icon`, `onDismiss`,
 * `onAutoClose`, `position`, `className`, …) plus where it comes from.
 */
export type ToastOptions = ExternalToast & {
  /**
   * The element that triggered the toast (such as `event.currentTarget`), its
   * `DOMRect`, or a viewport point. A line is drawn from its centre to the
   * toast like a shooting star, and the card grows out of its impact.
   * `Toaster`'s `arrival` sets how it looks. Without it, the toast slides in as
   * usual. Skipped when the person prefers reduced motion.
   *
   * When it is an element inside another toast, such as its action button,
   * the new toast replaces that one where it stands: a wave from the element
   * wipes the card, which resizes to the new content. The old toast is not
   * dismissed.
   */
  from?: ToastFrom;
};

/** The id Sonner gives the toast; pass it back as `id` to update it, or to `toast.dismiss`. */
export type ToastId = string | number;

type SonnerPromise<Data> = Parameters<typeof sonnerToast.promise<Data>>[0];
type SonnerPromiseData<Data> = NonNullable<Parameters<typeof sonnerToast.promise<Data>>[1]>;

/** Options for `toast.promise`: Sonner's `loading`, `success`, `error`, `description` and `finally`, plus `from`. */
export type ToastPromiseOptions<Data> = SonnerPromiseData<Data> & {
  /** Where the star flies from; see `ToastOptions`. */
  from?: ToastFrom;
};

type Show<Message> = (message: Message, data?: ExternalToast) => ToastId;

/** Marks each toast shown here, so a toast shown from inside it can find and replace it. */
const REFERENCE = 'da-toast-ref-';
const references = new Map<string, ToastId>();
let nextReference = 0;
/** Counts replacements, so an action handler can tell whether it started one. */
let replacements = 0;
/** Plenty for the toasts on screen; older references are forgotten. */
const REMEMBERED = 100;

/**
 * Sonner merges an update into the toast it replaces, so whatever the new
 * toast does not set is cleared rather than carried over from the old one.
 */
const FRESH: ExternalToast = {
  description: undefined,
  action: undefined,
  cancel: undefined,
  icon: undefined,
  duration: undefined,
  closeButton: undefined,
  onDismiss: undefined,
  onAutoClose: undefined,
};

const classNames = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

/** The toast `from` sits inside, when it is one shown here. */
function hostOf(from: ToastFrom | undefined) {
  if (typeof Element === 'undefined' || !(from instanceof Element)) return undefined;
  const element = from.closest<HTMLElement>('[data-sonner-toast]');
  const reference = element && [...element.classList].find(name => name.startsWith(REFERENCE));
  const id = reference && references.get(reference);
  return element && reference && id != null ? {element, reference, id} : undefined;
}

/**
 * Sonner dismisses a toast after its action runs unless the click's default is
 * prevented, so an action that replaces its own toast keeps it.
 */
function keepWhenReplaced(data: ExternalToast): ExternalToast {
  const action = data.action;
  if (!action || typeof action !== 'object' || !('onClick' in action)) return data;
  return {...data, action: {...action, onClick: event => {
    const before = replacements;
    action.onClick(event);
    if (replacements !== before) event.preventDefault();
  }}};
}

function withArrival<Message>(show: Show<Message>, type?: string) {
  return (message: Message, options?: ToastOptions): ToastId => {
    const {from, ...rest} = options ?? {};
    const data = keepWhenReplaced(rest);

    const host = hostOf(from);
    if (host && from instanceof Element) {
      replacements++;
      const rect = from.getBoundingClientRect();
      const origin = {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
      replaceInPlace(host.element, origin, type, hidden => {
        show(message, {...FRESH, ...data, id: host.id, className: classNames(data.className, host.reference, hidden)});
      });
      return host.id;
    }

    const reference = `${REFERENCE}${++nextReference}`;
    const launch = prepareLaunch(from);
    const id = show(message, {...data, className: classNames(data.className, reference, launch?.className)});
    references.set(reference, id);
    if (references.size > REMEMBERED) references.delete(references.keys().next().value!);
    launch?.fly();
    return id;
  };
}

/**
 * Shows a toast through Sonner. `toast(message, options)` is the plain one,
 * and `toast.success`, `.info`, `.warning`, `.error`, `.loading`, `.message`,
 * `.custom` and `.promise` are Sonner's variants with the same options.
 * `toast.dismiss(id)` hides one toast, or every toast without an id.
 *
 * Each accepts `from`: the element (or rectangle, or point) the toast comes
 * from. A shooting star flies from there to the toast, which grows out of its
 * impact; from inside another toast, the new one replaces it in place.
 */
export const toast = Object.assign(withArrival(sonnerToast as Show<Parameters<typeof sonnerToast>[0]>), {
  success: withArrival(sonnerToast.success, 'success'),
  info: withArrival(sonnerToast.info, 'info'),
  warning: withArrival(sonnerToast.warning, 'warning'),
  error: withArrival(sonnerToast.error, 'error'),
  loading: withArrival(sonnerToast.loading, 'loading'),
  message: withArrival(sonnerToast.message),
  custom: withArrival(sonnerToast.custom as Show<(id: ToastId) => ReactElement>),
  promise<Data>(promise: SonnerPromise<Data>, options?: ToastPromiseOptions<Data>) {
    const {from, ...data} = options ?? {};
    const launch = prepareLaunch(from);
    if (!launch) return sonnerToast.promise(promise, data as SonnerPromiseData<Data>);
    const result = sonnerToast.promise(promise, {...data, className: [data.className, launch.className].filter(Boolean).join(' ')} as SonnerPromiseData<Data>);
    launch.fly();
    return result;
  },
  dismiss: sonnerToast.dismiss,
  getHistory: sonnerToast.getHistory,
  getToasts: sonnerToast.getToasts,
});
