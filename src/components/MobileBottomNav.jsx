import Badge from '@mui/material/Badge';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const defaultZIndex = (theme) => theme.zIndex.drawer + 2;

export const MOBILE_BOTTOM_NAV_ROOT_SX = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  borderTop: '1px solid',
  borderColor: 'divider',
  paddingBottom: 'env(safe-area-inset-bottom)',
};

export const MOBILE_BOTTOM_NAV_ACTION_SX = {
  minWidth: 0,
  maxWidth: 'none',
};

export function MobileBottomNav({
  destinations,
  activeRoute,
  onNavigate,
  hideAbove = 'md',
  zIndex = defaultZIndex,
  sx = {},
}) {
  const theme = useTheme();
  const isHidden = useMediaQuery(theme.breakpoints.up(hideAbove));
  const callerSx = Array.isArray(sx) ? sx : [sx];

  if (isHidden) return null;

  return (
    <BottomNavigation
      value={activeRoute}
      onChange={(_, route) => onNavigate(route)}
      showLabels
      sx={[
        { ...MOBILE_BOTTOM_NAV_ROOT_SX, zIndex },
        ...callerSx,
      ]}
    >
      {destinations.map((destination) => {
        const Icon = destination.icon;
        const selected = activeRoute === destination.route;
        const icon = (
          <Icon
            sx={destination.emphasis ? {
              p: 0.8,
              borderRadius: '50%',
              backgroundColor: selected ? 'primary.main' : 'background.paper',
              color: selected ? 'primary.contrastText' : 'primary.main',
              boxShadow: 'none',
              transform: 'translateY(-4px)',
            } : undefined}
          />
        );

        return (
          <BottomNavigationAction
            key={destination.route}
            value={destination.route}
            label={destination.shortLabel ?? destination.label}
            aria-label={destination.shortLabel != null ? destination.label : undefined}
            aria-current={selected ? 'page' : undefined}
            sx={MOBILE_BOTTOM_NAV_ACTION_SX}
            icon={destination.badgeCount ? (
              <Badge badgeContent={destination.badgeCount} color="error" max={99}>
                {icon}
              </Badge>
            ) : icon}
          />
        );
      })}
    </BottomNavigation>
  );
}
