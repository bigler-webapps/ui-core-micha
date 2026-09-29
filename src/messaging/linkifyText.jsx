import React from 'react';
import { Link } from '@mui/material';

const HTTP_URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;

function splitTrailingPunctuation(rawUrl) {
  let url = rawUrl;
  let trailing = '';
  while (/[.,!?]$/.test(url)) {
    trailing = `${url.slice(-1)}${trailing}`;
    url = url.slice(0, -1);
  }
  const openingParentheses = (url.match(/\(/g) || []).length;
  const closingParentheses = (url.match(/\)/g) || []).length;
  if (closingParentheses > openingParentheses) {
    trailing = `)${trailing}`;
    url = url.slice(0, -1);
  }
  return { url, trailing };
}

export function linkifyText(text) {
  const value = String(text ?? '');
  const parts = [];
  let lastIndex = 0;
  for (const match of value.matchAll(HTTP_URL_PATTERN)) {
    const rawUrl = match[0];
    const start = match.index ?? 0;
    if (start > lastIndex) parts.push(value.slice(lastIndex, start));
    const { url, trailing } = splitTrailingPunctuation(rawUrl);
    parts.push(<Link key={`url-${start}`} href={url} target="_blank" rel="noopener noreferrer">{url}</Link>);
    if (trailing) parts.push(trailing);
    lastIndex = start + rawUrl.length;
  }
  if (lastIndex < value.length) parts.push(value.slice(lastIndex));
  return parts.length ? parts : [value];
}
