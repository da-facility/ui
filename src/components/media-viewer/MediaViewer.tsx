import {useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode} from 'react';
import {Icon} from '@astryxdesign/core/Icon';
import {useMessages} from '../../i18n';
import '../media-canvas/media-canvas.css';
import './media-viewer.css';

export type MediaViewerItem = {
  /** Stable id; the viewer starts fresh (fitted, low-res first) when it changes. */
  id: string;
  /** The image fitted in the stage, such as a 2048px preview. */
  previewUrl: string;
  /** A small rendition shown scaled up while the preview loads, such as the grid's thumbnail. */
  thumbUrl?: string;
  /**
   * A larger image to zoom into. Without it there is no zoom, as when the
   * backend limits what the person may see.
   */
  fullUrl?: string;
  /** Pixel size of the largest image offered (`fullUrl`, else `previewUrl`); zoom shows it at this size. */
  width: number;
  height: number;
  /** Text for the image, such as its headline or caption. */
  alt: string;
};

export type MediaViewerProps = {
  /** The item shown. */
  item: MediaViewerItem;
  /** Text at the start of the top row, such as the file name. Also names the dialog. */
  title?: ReactNode;
  /** 1-based position in the collection, shown as "14 / 1,204" with `total`. */
  position?: number;
  total?: number;
  /** The neighbours, preloaded so moving is instant. A missing one hides its arrow. */
  previous?: MediaViewerItem | null;
  next?: MediaViewerItem | null;
  /**
   * Called by the arrows, the Left and Right keys and swipes. The app owns the
   * URL: replace the address rather than push, so one Back still closes.
   */
  onPrevious?: () => void;
  onNext?: () => void;
  /** Called by the close button and Escape (and Back on Android). The app unmounts the viewer or leaves its route. */
  onClose: () => void;
  /** The side panel: 272px beside the image on desktop, a sheet under it on phones. I toggles it. */
  panel?: ReactNode;
  /** Accessible name of the panel and its toggle. Defaults to "Details". */
  panelLabel?: string;
  /** Whether the panel is open, for a controlled panel. */
  isPanelOpen?: boolean;
  /** Whether the panel starts open. Defaults to true. */
  defaultPanelOpen?: boolean;
  onPanelOpenChange?: (isOpen: boolean) => void;
  /** Called when the image zooms in or back to fit. */
  onZoomChange?: (isZoomed: boolean) => void;
  /** Accessible name of the viewer when `title` isn't text. Defaults to the item's `alt`. */
  label?: string;
  /**
   * Where focus goes on close. Defaults to whatever had focus when the viewer
   * opened, if it is still in the page; a grid that remounted focuses its own tile.
   */
  returnFocus?: () => HTMLElement | null | undefined;
};

type Zoom = {left: number; top: number};

const PAN_STEP = 120;
const SWIPE = 50;

/**
 * A full-window viewer on a native `<dialog>`: the image fitted (never cropped)
 * on a dark canvas, low-res first, with previous and next, zoom into a larger
 * image, and a side panel slot. It owns no URL; its callbacks let the app make
 * it a route.
 */
export function MediaViewer({
  item,
  title,
  position,
  total,
  previous,
  next,
  onPrevious,
  onNext,
  onClose,
  panel,
  panelLabel,
  isPanelOpen: isPanelOpenProp,
  defaultPanelOpen = true,
  onPanelOpenChange,
  onZoomChange,
  label,
  returnFocus,
}: MediaViewerProps) {
  const t = useMessages();
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [ownPanelOpen, setOwnPanelOpen] = useState(defaultPanelOpen);
  const isPanelOpen = panel != null && (isPanelOpenProp ?? ownPanelOpen);
  const [zoom, setZoomState] = useState<Zoom | null>(null);
  const [loaded, setLoaded] = useState<{preview: string | null; full: string | null}>({preview: null, full: null});
  const [announcement, setAnnouncement] = useState('');
  const gesture = useRef<{x: number; y: number; left: number; top: number; moved: boolean; pointerType: string} | null>(null);
  const callbacks = useRef({onClose, onPrevious, onNext, returnFocus, onZoomChange});
  callbacks.current = {onClose, onPrevious, onNext, returnFocus, onZoomChange};
  const canPrevious = previous !== null && Boolean(onPrevious) && (previous !== undefined || (position ?? 2) > 1);
  const canNext = next !== null && Boolean(onNext) && (next !== undefined || position == null || total == null || position < total);
  const isZoomable = Boolean(item.fullUrl);

  // Open as a modal: the rest of the page is inert and focus stays inside.
  // On unmount, close and give focus back.
  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    dialog.focus();
    return () => {
      if (dialog.open) dialog.close();
      const target = callbacks.current.returnFocus?.() ?? (opener?.isConnected ? opener : null);
      target?.focus({preventScroll: true});
    };
  }, []);

  // A new item starts fitted, and its position is announced.
  const shownId = useRef(item.id);
  useEffect(() => {
    if (shownId.current === item.id) return;
    shownId.current = item.id;
    setZoom(null);
    setAnnouncement(position != null && total != null
      ? t('@da-facility.mediaViewer.positionAnnouncement', {name: item.alt, position, total})
      : item.alt);
  }, [item.id, item.alt, position, total, t]);

  // The neighbours' previews load ahead, so moving shows them at once.
  useEffect(() => {
    for (const neighbour of [previous, next]) {
      if (!neighbour) continue;
      const image = new Image();
      image.decoding = 'async';
      image.src = neighbour.previewUrl;
    }
  }, [previous?.previewUrl, next?.previewUrl]);

  function setZoom(next: Zoom | null) {
    setZoomState(current => {
      if ((current == null) !== (next == null)) callbacks.current.onZoomChange?.(next != null);
      return next;
    });
  }

  function setPanelOpen(open: boolean) {
    if (isPanelOpenProp === undefined) setOwnPanelOpen(open);
    onPanelOpenChange?.(open);
  }

  /** Keeps the zoomed image covering the stage, or centred where it is smaller. */
  function clamp(left: number, top: number): Zoom {
    const stage = stageRef.current!.getBoundingClientRect();
    const fit = (offset: number, size: number, space: number) => size <= space ? (space - size) / 2 : Math.min(0, Math.max(space - size, offset));
    return {left: fit(left, item.width, stage.width), top: fit(top, item.height, stage.height)};
  }

  /** Zooms to 100% around a point on the stage, keeping that point of the image under it. */
  function zoomAt(clientX?: number, clientY?: number) {
    if (!isZoomable) return;
    const stage = stageRef.current!.getBoundingClientRect();
    const scale = Math.min(stage.width / item.width, stage.height / item.height);
    const fitted = {width: item.width * scale, height: item.height * scale};
    const fittedLeft = (stage.width - fitted.width) / 2;
    const fittedTop = (stage.height - fitted.height) / 2;
    const x = clientX == null ? stage.width / 2 : clientX - stage.left;
    const y = clientY == null ? stage.height / 2 : clientY - stage.top;
    const u = Math.min(1, Math.max(0, (x - fittedLeft) / fitted.width));
    const v = Math.min(1, Math.max(0, (y - fittedTop) / fitted.height));
    setZoom(clamp(x - u * item.width, y - v * item.height));
  }

  function pan(dx: number, dy: number) {
    setZoomState(current => current && clamp(current.left + dx, current.top + dy));
  }

  function keyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    const isTyping = target.closest('input, textarea, select, [contenteditable="true"]') != null;
    const isCommand = event.ctrlKey || event.metaKey || event.altKey;
    if (event.key === 'Tab') return trapTab(event);
    if (event.key === 'Escape') {
      event.preventDefault();
      if (zoom) setZoom(null);
      else callbacks.current.onClose();
      return;
    }
    if (isTyping || isCommand || target.closest('.media-viewer__panel')) return;
    const keys: Record<string, () => void> = zoom
      ? {
          ArrowLeft: () => pan(PAN_STEP, 0),
          ArrowRight: () => pan(-PAN_STEP, 0),
          ArrowUp: () => pan(0, PAN_STEP),
          ArrowDown: () => pan(0, -PAN_STEP),
          '-': () => setZoom(null),
          '0': () => setZoom(null),
        }
      : {
          ArrowLeft: () => { if (canPrevious) callbacks.current.onPrevious?.(); },
          ArrowRight: () => { if (canNext) callbacks.current.onNext?.(); },
          '+': () => zoomAt(),
          '=': () => zoomAt(),
        };
    if (panel != null) keys.i = keys.I = () => setPanelOpen(!isPanelOpen);
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  /** Tab and Shift+Tab wrap around inside the viewer instead of leaving for the browser's toolbar. */
  function trapTab(event: KeyboardEvent<HTMLDialogElement>) {
    const focusable = [...dialogRef.current!.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(element => element.checkVisibility());
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // One gesture handler for the stage: a tap or click zooms, a drag pans the
  // zoomed image, and a horizontal swipe on a touch screen moves.
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    gesture.current = {x: event.clientX, y: event.clientY, left: zoom?.left ?? 0, top: zoom?.top ?? 0, moved: false, pointerType: event.pointerType};
    if (zoom) event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = gesture.current;
    if (!state) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (Math.hypot(dx, dy) > 4) state.moved = true;
    if (zoom && state.moved) setZoomState(clamp(state.left + dx, state.top + dy));
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const state = gesture.current;
    gesture.current = null;
    if (!state) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!zoom && state.pointerType !== 'mouse' && Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx > 0 && canPrevious) callbacks.current.onPrevious?.();
      if (dx < 0 && canNext) callbacks.current.onNext?.();
      return;
    }
    if (state.moved) return;
    const onPhoto = (event.target as HTMLElement).closest('.media-viewer__photo, .media-viewer__zoomed');
    if (zoom) setZoom(null);
    else if (onPhoto) zoomAt(event.clientX, event.clientY);
  }

  const ratio = item.width / item.height;
  const isPreviewLoaded = loaded.preview === item.previewUrl;
  const isFullLoaded = loaded.full === item.fullUrl;
  const titleId = `${id}-title`;
  const hasTitle = title != null && title !== false && title !== '';
  return <dialog
    ref={dialogRef}
    className="media-canvas media-viewer"
    aria-labelledby={hasTitle && !label ? titleId : undefined}
    aria-label={hasTitle && !label ? undefined : label ?? item.alt}
    data-panel={isPanelOpen || undefined}
    tabIndex={-1}
    onKeyDown={keyDown}
    onCancel={event => {
      // Escape is handled above; this is for other close requests, such as Back on Android.
      event.preventDefault();
      if (zoom) setZoom(null);
      else callbacks.current.onClose();
    }}
  >
    <div className="media-viewer__main">
      <div className="media-viewer__top">
        <p className="media-viewer__heading">
          {hasTitle && <span className="media-viewer__title" id={titleId}>{title}</span>}
          {position != null && total != null && <span className="media-viewer__position">
            {hasTitle && <span aria-hidden="true"> · </span>}
            {t('@da-facility.mediaViewer.position', {position, total})}
          </span>}
        </p>
        <div className="media-viewer__toolbar">
          {isZoomable && <button type="button" className="media-viewer__button" aria-pressed={zoom != null} onClick={() => zoom ? setZoom(null) : zoomAt()}>
            {zoom ? t('@da-facility.mediaViewer.zoomOut') : t('@da-facility.mediaViewer.zoomIn')}
          </button>}
          {panel != null && <button type="button" className="media-viewer__button" aria-expanded={isPanelOpen} aria-controls={`${id}-panel`} aria-keyshortcuts="I" onClick={() => setPanelOpen(!isPanelOpen)}>
            <Icon icon="info" size="sm" color="inherit" />
            {panelLabel ?? t('@da-facility.mediaViewer.details')}
          </button>}
          <button type="button" className="media-viewer__button" aria-keyshortcuts="Escape" onClick={() => callbacks.current.onClose()}>
            {t('@da-facility.mediaViewer.close')}
            <Icon icon="close" size="sm" color="inherit" />
          </button>
        </div>
      </div>
      <div
        ref={stageRef}
        className="media-viewer__stage"
        data-zoomable={isZoomable || undefined}
        data-zoomed={zoom ? true : undefined}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={() => { gesture.current = null; }}
      >
        {zoom
          ? <div className="media-viewer__zoomed" style={{width: item.width, height: item.height, transform: `translate(${zoom.left}px, ${zoom.top}px)`}}>
              <img className="media-viewer__image" src={item.previewUrl} alt="" draggable={false} />
              <img
                className="media-viewer__image media-viewer__image--full"
                src={item.fullUrl}
                alt={item.alt}
                draggable={false}
                data-loaded={isFullLoaded || undefined}
                onLoad={() => setLoaded(current => ({...current, full: item.fullUrl ?? null}))}
              />
            </div>
          : <div className="media-viewer__photo" style={{'--media-viewer-ratio': ratio} as CSSProperties} key={item.id}>
              {item.thumbUrl && !isPreviewLoaded && <img className="media-viewer__image media-viewer__image--thumb" src={item.thumbUrl} alt="" draggable={false} />}
              <img
                className="media-viewer__image media-viewer__image--preview"
                src={item.previewUrl}
                alt={item.alt}
                draggable={false}
                data-loaded={isPreviewLoaded || !item.thumbUrl || undefined}
                ref={image => {
                  if (image?.complete && image.naturalWidth > 0 && loaded.preview !== item.previewUrl) setLoaded(current => ({...current, preview: item.previewUrl}));
                }}
                onLoad={() => setLoaded(current => ({...current, preview: item.previewUrl}))}
              />
            </div>}
        {!zoom && canPrevious && <button type="button" className="media-viewer__nav media-viewer__nav--previous" aria-label={t('@da-facility.mediaViewer.previous')} aria-keyshortcuts="ArrowLeft" onClick={() => callbacks.current.onPrevious?.()}>
          <Icon icon="chevronLeft" color="inherit" />
        </button>}
        {!zoom && canNext && <button type="button" className="media-viewer__nav media-viewer__nav--next" aria-label={t('@da-facility.mediaViewer.next')} aria-keyshortcuts="ArrowRight" onClick={() => callbacks.current.onNext?.()}>
          <Icon icon="chevronRight" color="inherit" />
        </button>}
      </div>
    </div>
    {panel != null && <aside className="media-viewer__panel" id={`${id}-panel`} aria-label={panelLabel ?? t('@da-facility.mediaViewer.details')} hidden={!isPanelOpen}>
      {panel}
    </aside>}
    <div className="media-viewer__announcer" role="status">{announcement}</div>
  </dialog>;
}
