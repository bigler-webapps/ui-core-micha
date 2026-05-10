// src/components/layout/PageLayout.jsx
import React from 'react';
import { Container, Box, Typography } from '@mui/material';

// Layout for content pages with larger width (e.g. Profile, Welcome, Input)
export const WidePage = ({ title, children, maxWidth = 'lg' }) => (
  <Container maxWidth={maxWidth} sx={{ mt: 4 }}>
    {title && (
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
    )}
    {children}
  </Container>
);

// Layout for forms or narrow pages (e.g. Login, Reset, Invite)
export const NarrowPage = ({ title, subtitle, children }) => (
  <Container maxWidth="md" sx={{ mt: 4 }}>
    <Box sx={{ maxWidth: 480, mx: 'auto' }}>
      {title && (
        <Typography variant="h4" gutterBottom>
          {title}
        </Typography>
      )}
      {subtitle && (
        <Typography paragraph>
          {subtitle}
        </Typography>
      )}
      {children}
    </Box>
  </Container>
);
