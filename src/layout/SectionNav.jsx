import { useId, useState } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
  Box,
  ButtonBase,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

const defaultZIndex = (theme) => theme.zIndex.drawer + 3;

export const SECTION_NAV_DRAWER_PAPER_SX = {
  borderTopLeftRadius: 18,
  borderTopRightRadius: 18,
  maxHeight: '78dvh',
  p: 2,
  pb: 'max(16px, env(safe-area-inset-bottom))',
};

export const SECTION_NAV_GROUP_PAPER_SX = {
  overflow: 'hidden',
};

const SECTION_NAV_GRID_SX = {
  display: 'grid',
  gap: 4,
  alignItems: 'start',
};

const SECTION_NAV_SIDEBAR_SX = {
  position: 'sticky',
  top: 'var(--SectionNav-headerOffset)',
  alignSelf: 'start',
};

const SECTION_NAV_CONTENT_SX = {
  minWidth: 0,
};

const SECTION_NAV_GROUP_HEADER_SX = {
  px: 2,
  py: 1.5,
  borderBottom: '1px solid',
  borderColor: 'divider',
};

const SECTION_NAV_TRIGGER_SX = {
  width: '100%',
  minHeight: 56,
  mb: 2,
  px: 1.75,
  py: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2,
  textAlign: 'left',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  backgroundColor: 'background.paper',
  boxShadow: 1,
  '&:hover': {
    backgroundColor: 'action.hover',
  },
  '&.Mui-focusVisible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 2,
  },
};

const SECTION_NAV_TRIGGER_TEXT_SX = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
};

const SECTION_NAV_TRIGGER_VALUE_SX = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const SECTION_NAV_CHEVRON_SX = {
  color: 'text.secondary',
  transition: 'transform 0.18s ease',
  flex: 'none',
};

const SECTION_NAV_DRAWER_TITLE_SX = {
  mb: 2,
};

const SECTION_NAV_DRAWER_SCROLL_SX = {
  overflowY: 'auto',
};

function SectionNavList({
  groups,
  activeKey,
  rememberedKey,
  overviewItem,
  onSelect,
  rememberedLabel,
}) {
  const headingId = useId();

  return (
    <Stack spacing={2}>
      {overviewItem && (
        <Paper variant="outlined" sx={SECTION_NAV_GROUP_PAPER_SX}>
          <List disablePadding>
            <ListItemButton
              selected={activeKey == null}
              aria-current={activeKey == null ? 'page' : undefined}
              onClick={() => onSelect?.(null)}
            >
              <ListItemText primary={overviewItem.label} />
            </ListItemButton>
          </List>
        </Paper>
      )}

      {groups.map((group, groupIndex) => {
        const groupHeadingId = `${headingId}-${groupIndex}`;

        return (
          <Paper key={group.key} variant="outlined" sx={SECTION_NAV_GROUP_PAPER_SX}>
            <Box id={groupHeadingId} sx={SECTION_NAV_GROUP_HEADER_SX}>
              <Typography variant="subtitle2" fontWeight={700}>
                {group.label}
              </Typography>
            </Box>
            <List disablePadding aria-labelledby={groupHeadingId}>
              {group.items.map((item) => {
                const selected = item.key === activeKey;
                return (
                  <ListItemButton
                    key={item.key}
                    selected={selected}
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => onSelect?.(item.key)}
                  >
                    <ListItemText
                      primary={item.label}
                      secondary={!selected && item.key === rememberedKey ? rememberedLabel : null}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        );
      })}
    </Stack>
  );
}

/**
 * Render matrix:
 *
 * | `mode`    | `open`                 | `onOpen` | trigger | sidebar | `children`       | drawer              |
 * |-----------|------------------------|----------|---------|---------|------------------|---------------------|
 * | `desktop` | ignored                | ignored  | —       | yes     | yes, in the grid | —                   |
 * | `mobile`  | absent (uncontrolled)  | ignored  | yes     | —       | yes              | yes, internal state |
 * | `mobile`  | given                  | given    | yes     | —       | yes              | caller-driven       |
 * | `mobile`  | given                  | absent   | no      | —       | yes              | caller-driven       |
 *
 * Optional parts: without `overviewItem`, no overview entry or empty Paper is rendered;
 * without `rememberedKey`, no secondary line is rendered; without `title` or
 * `triggerEyebrow`, `t('SectionNav.TITLE')` or `t('SectionNav.TRIGGER_EYEBROW')` is used.
 */
export function SectionNav({
  mode,
  groups,
  activeKey = null,
  onSelect,
  open,
  onOpen,
  onClose,
  title,
  triggerEyebrow,
  overviewItem,
  rememberedKey,
  headerOffset = 24,
  // SHELL-3's bottom bar uses drawer + 2, so the drawer must stay above it.
  zIndex = defaultZIndex,
  sidebarWidth = 280,
  children,
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const drawerId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const drawerOpen = isControlled ? open : internalOpen;
  const canOpenTrigger = !isControlled || Boolean(onOpen);
  const resolvedTitle = title ?? t('SectionNav.TITLE');
  const resolvedEyebrow = triggerEyebrow ?? t('SectionNav.TRIGGER_EYEBROW');
  const rememberedLabel = t('SectionNav.LAST_OPENED');
  const resolvedZIndex = typeof zIndex === 'function' ? zIndex(theme) : zIndex;
  const resolvedHeaderOffset = typeof headerOffset === 'number' ? `${headerOffset}px` : headerOffset;
  const activeItem = activeKey == null
    ? overviewItem
    : groups.flatMap((group) => group.items).find((item) => item.key === activeKey);

  const handleTriggerClick = () => {
    if (isControlled) {
      onOpen?.();
    } else {
      setInternalOpen(true);
    }
  };

  const handleDrawerClose = () => {
    if (!isControlled) setInternalOpen(false);
    onClose?.();
  };

  const handleDrawerSelect = (key) => {
    onSelect?.(key);
    handleDrawerClose();
  };

  if (mode === 'desktop') {
    return (
      <Box
        sx={{ ...SECTION_NAV_GRID_SX, gridTemplateColumns: `${sidebarWidth}px minmax(0, 1fr)` }}
        data-section-nav-mode="desktop"
      >
        <Box
          component="nav"
          aria-label={resolvedTitle}
          sx={SECTION_NAV_SIDEBAR_SX}
          style={{ '--SectionNav-headerOffset': resolvedHeaderOffset }}
        >
          <SectionNavList
            groups={groups}
            activeKey={activeKey}
            rememberedKey={rememberedKey}
            overviewItem={overviewItem}
            onSelect={onSelect}
            rememberedLabel={rememberedLabel}
          />
        </Box>
        <Box sx={SECTION_NAV_CONTENT_SX}>{children}</Box>
      </Box>
    );
  }

  return (
    <>
      {canOpenTrigger && (
        <ButtonBase
          sx={SECTION_NAV_TRIGGER_SX}
          onClick={handleTriggerClick}
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
        >
          <Box sx={SECTION_NAV_TRIGGER_TEXT_SX}>
            <Typography variant="caption" color="text.secondary">
              {resolvedEyebrow}
            </Typography>
            <Typography variant="subtitle1" sx={SECTION_NAV_TRIGGER_VALUE_SX}>
              {activeItem?.label ?? resolvedTitle}
            </Typography>
          </Box>
          <KeyboardArrowDownIcon
            aria-hidden="true"
            sx={SECTION_NAV_CHEVRON_SX}
            style={{ transform: drawerOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </ButtonBase>
      )}

      <Box sx={SECTION_NAV_CONTENT_SX}>{children}</Box>

      <Drawer
        anchor="bottom"
        open={drawerOpen}
        onClose={handleDrawerClose}
        style={{ zIndex: resolvedZIndex }}
        PaperProps={{
          id: drawerId,
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': `${drawerId}-title`,
          sx: SECTION_NAV_DRAWER_PAPER_SX,
        }}
      >
        <Typography id={`${drawerId}-title`} variant="h6" sx={SECTION_NAV_DRAWER_TITLE_SX}>
          {resolvedTitle}
        </Typography>
        <Box sx={SECTION_NAV_DRAWER_SCROLL_SX}>
          <SectionNavList
            groups={groups}
            activeKey={activeKey}
            rememberedKey={rememberedKey}
            overviewItem={overviewItem}
            onSelect={handleDrawerSelect}
            rememberedLabel={rememberedLabel}
          />
        </Box>
      </Drawer>
    </>
  );
}
