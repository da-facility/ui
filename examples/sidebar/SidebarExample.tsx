import clearSky from './clear-sky.svg';
import './sidebar-example.css';
import {SettingsExample} from './SettingsExample';
import {useLibraryTweaks} from '../../catalogue/controls/LibraryTweaks';

export function SidebarExample() {
  const {navigationSide, setNavigationSide} = useLibraryTweaks();
  return <SettingsExample mobileNavigationArtwork={<img className="sidebar-example__sky" src={clearSky} alt="" draggable={false} />} mobileNavigationSide={navigationSide} onMobileNavigationSideChange={setNavigationSide} mobileNavigationOffset={84} />;
}
