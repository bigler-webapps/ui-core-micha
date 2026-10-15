import { createKitSxEntry } from '../../theme/kitSxEntry';
import { CHART_FRAME_ALERT_SX, CHART_FRAME_ROOT_SX } from './ChartFrame';

export const CHARTS_KIT_SX_REGISTRY = [
  createKitSxEntry('ChartFrame.root', 'MuiPaper', CHART_FRAME_ROOT_SX, 'CHART_FRAME_ROOT_SX'),
  createKitSxEntry('ChartFrame.alert', 'MuiAlert', CHART_FRAME_ALERT_SX, 'CHART_FRAME_ALERT_SX'),
];
