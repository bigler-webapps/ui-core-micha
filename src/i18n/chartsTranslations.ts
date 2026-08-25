export const chartsTranslations = {
  'ChartFrame.LOADING': {
    de: 'Diagramm wird geladen.',
    fr: 'Chargement du graphique.',
    en: 'Loading chart.',
    sw: 'Inapakia chati.',
  },
  'ChartFrame.EMPTY_DEFAULT': {
    de: 'Keine Daten verfügbar.',
    fr: 'Aucune donnée disponible.',
    en: 'No data available.',
    sw: 'Hakuna data inayopatikana.',
  },
  'ChartFrame.ERROR_DEFAULT': {
    de: 'Das Diagramm konnte nicht geladen werden.',
    fr: 'Impossible de charger le graphique.',
    en: 'The chart could not be loaded.',
    sw: 'Chati haikuweza kupakiwa.',
  },
  'ChartFrame.EXPORT_SVG_LABEL': {
    de: 'SVG exportieren',
    fr: 'Exporter en SVG',
    en: 'Export SVG',
    sw: 'Hamisha SVG',
  },
  // UCM-CHART-17: the two formats now genuinely differ (SVG = chart only, vector; PNG = the whole
  // panel as shown, legend included) -- the label alone no longer says so, the tooltip does.
  'ChartFrame.EXPORT_SVG_TOOLTIP': {
    de: 'Skalierbare Vektorgrafik des Diagramms allein, ohne Legende.',
    fr: 'Image vectorielle du graphique seul, sans la légende.',
    en: 'Scalable vector image of the chart alone, without the legend.',
    sw: 'Picha ya vekta inayoweza kubadilishwa ukubwa ya chati pekee, bila maelezo.',
  },
  'ChartFrame.EXPORT_PNG_LABEL': {
    de: 'PNG exportieren',
    fr: 'Exporter en PNG',
    en: 'Export PNG',
    sw: 'Hamisha PNG',
  },
  // ui_reviewer finding: the original wording named the legend but not the size key/footnotes
  // the PNG also carries -- named explicitly now, matching the Envelope's own Goal wording
  // ("legend, size key and footnotes").
  'ChartFrame.EXPORT_PNG_TOOLTIP': {
    de: 'Bild des ganzen Kartenbereichs, wie angezeigt, inklusive Legende, Grössenschlüssel und Fussnoten.',
    fr: 'Image de toute la zone de la carte, telle qu’affichée, légende, clé de taille et notes de bas de page comprises.',
    en: 'Image of the whole card area as shown, including the legend, size key, and footnotes.',
    sw: 'Picha ya eneo lote la kadi kama linavyoonyeshwa, ikijumuisha maelezo, kifunguo cha ukubwa, na maelezo ya chini.',
  },
  'ChartFrame.EXPORT_ERROR': {
    de: 'Das Diagramm konnte nicht exportiert werden.',
    fr: 'Impossible d’exporter le graphique.',
    en: 'The chart could not be exported.',
    sw: 'Chati haikuweza kuhamishwa.',
  },
  'TimeSeriesChart.RANGE_LABEL': {
    de: 'Zeitraum',
    fr: 'Période',
    en: 'Range',
    sw: 'Kipindi',
  },
  'TimeSeriesChart.RANGE_1_DAY': {
    de: '1 Tag',
    fr: '1 jour',
    en: '1 day',
    sw: 'Siku 1',
  },
  'TimeSeriesChart.RANGE_1_WEEK': {
    de: '1 Woche',
    fr: '1 semaine',
    en: '1 week',
    sw: 'Wiki 1',
  },
  'TimeSeriesChart.RANGE_1_MONTH': {
    de: '1 Monat',
    fr: '1 mois',
    en: '1 month',
    sw: 'Mwezi 1',
  },
  'TimeSeriesChart.RANGE_1_YEAR': {
    de: '1 Jahr',
    fr: '1 an',
    en: '1 year',
    sw: 'Mwaka 1',
  },
  'TimeSeriesChart.SERIES_LABEL': {
    de: 'Serien',
    fr: 'Séries',
    en: 'Series',
    sw: 'Mfululizo',
  },
};
