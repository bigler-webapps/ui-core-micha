import Badge from '@mui/material/Badge';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

const defaultZIndex = (theme) => theme.zIndex.drawer + 2;

export function MobileBottomNav({
  destinations,
  activeRoute,
  onNavigate,
  hideAbove = 'md',
  zIndex = defaultZIndex,
}) {
  const theme = useTheme();
  const isHidden = useMediaQuery(theme.breakpoints.up(hideAbove));

  if (isHidden) return null;

  return (
    <BottomNavigation
      value={activeRoute}
      onChange={(_, route) => onNavigate(route)}
      showLabels
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex,
        borderTop: '1px solid',
        borderColor: 'divider',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
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
