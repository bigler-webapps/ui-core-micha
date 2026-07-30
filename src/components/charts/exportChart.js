function findSvg(chartContainer) {
  const svg = chartContainer?.querySelector('svg');
  if (!svg) throw new Error('Chart container does not contain an SVG element.');
  return svg;
}

function svgBlob(chartContainer) {
  const svg = findSvg(chartContainer).cloneNode(true);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Serializes the first SVG rendered inside a chart container and downloads it. */
export function exportChartSvg(chartContainer, filename = 'chart.svg') {
  const blob = svgBlob(chartContainer);
  download(blob, filename);
  return blob;
}

/** Rasterizes the first SVG rendered inside a chart container at two-times scale and downloads it. */
export function exportChartPng(chartContainer, filename = 'chart.png') {
  const source = svgBlob(chartContainer);

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const image = new Image();

    image.onload = () => {
      try {
        const svg = findSvg(chartContainer);
        const width = Number(svg.getAttribute('width')) || svg.clientWidth || 1;
        const height = Number(svg.getAttribute('height')) || svg.clientHeight || 1;
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = height * 2;
        const context = canvas.getContext('2d');
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error('Unable to create PNG export.'));
            return;
          }
          download(blob, filename);
          resolve(blob);
        }, 'image/png');
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to load chart SVG for PNG export.'));
    };
    image.src = url;
  });
}
