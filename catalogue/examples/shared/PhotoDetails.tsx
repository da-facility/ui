import type {DemoPhoto} from './photos';
import './photo-details.css';

/** A stand-in for an app's metadata panel, for the viewer's side panel slot. */
export function PhotoDetails({photo}: {photo: DemoPhoto}) {
  return <div className="photo-details">
    <div>
      <h2>{photo.alt}</h2>
      <p>Stand-in caption for {photo.fileName}, written by the photographer.</p>
    </div>
    <dl>
      <dt>Author</dt><dd>Sam Rivera</dd>
      <dt>Rights</dt><dd>© Example Images</dd>
      <dt>Size</dt><dd>{photo.width} × {photo.height}</dd>
    </dl>
  </div>;
}
