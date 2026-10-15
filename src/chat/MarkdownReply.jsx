import React, { memo } from 'react';
import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const MARKDOWN_LIMIT = 200000;
const allowed = ['p','br','hr','h1','h2','h3','h4','h5','h6','strong','em','del','ul','ol','li','blockquote','code','pre','table','thead','tbody','tr','th','td','a','img'];
const plainText = (children) => (Array.isArray(children) ? children : [children]).map((child) => typeof child === 'string' ? child : '').join('');
function MarkdownReply({ text = '' }) {
  const { t } = useTranslation();
  if (text.length > MARKDOWN_LIMIT) return <Box sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{text}</Box>;
  return <Box sx={{ minWidth: 0, overflowWrap: 'anywhere', '& p': { my: 1 }, '& table': { borderCollapse: 'collapse' }, '& th,& td': { border: 1, borderColor: 'divider', p: 1 }, '& pre': { overflowX: 'auto', bgcolor: 'action.hover', p: 1, borderRadius: 1 }, '& blockquote': { borderLeft: 2, borderColor: 'divider', pl: 1, color: 'text.secondary' } }}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} allowedElements={allowed} unwrapDisallowed components={{
      a: ({ href, children }) => { const label = plainText(children); return <span>{children}{href && href !== label ? ' (' + href + ')' : ''}</span>; },
      img: ({ alt, src }) => <span>{alt || src || ''}</span>,
      table: ({ children }) => <Box role="region" tabIndex={0} aria-label={t('Chat.markdownTable')} sx={{ overflowX: 'auto', maxWidth: '100%' }}><table>{children}</table></Box>,
      pre: ({ children }) => <pre tabIndex={0} aria-label={t('Chat.markdownCode')}>{children}</pre>,
    }}>{text}</ReactMarkdown>
  </Box>;
}
export default memo(MarkdownReply);
