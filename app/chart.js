// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
const namespace = 'http://www.w3.org/2000/svg';

function element(name, attributes, content) {
  const node = document.createElementNS(namespace, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  if (content) node.textContent = content;
  return node;
}

export function drawHistory(container, points, current, baseline, settings) {
  const width = 510;
  const height = 194;
  const plot = {left: 35, top: 10, right: 493, bottom: 158};
  const dates = points.map(point => point.observedAt);
  const values = points.map(point => point.value);

  if (!points.length) {
    container.textContent = 'No resting readings to plot.';
    return;
  }

  const band = baseline?.n >= settings.minSamples && baseline.sd > 0
    ? [baseline.mean - settings.watch * baseline.sd, baseline.mean + settings.watch * baseline.sd]
    : [];
  const min = Math.floor((Math.min(...values, ...band) - 1) / 5) * 5;
  const max = Math.ceil((Math.max(...values, ...band) + 1) / 5) * 5;
  const x = time => plot.left + (time - dates[0]) / Math.max(1, dates.at(-1) - dates[0]) * (plot.right - plot.left);
  const y = bpm => plot.bottom - (bpm - min) / (max - min) * (plot.bottom - plot.top);
  const svg = element('svg', {
    viewBox: '0 0 ' + width + ' ' + height, role: 'img',
    'aria-label': 'Resting heart rate over time. The full history is available below the chart.',
  });

  if (band.length) {
    svg.append(element('rect', {
      x: plot.left, y: y(band[1]), width: plot.right - plot.left,
      height: y(band[0]) - y(band[1]), class: 'chart-band',
    }));
  }

  for (const tick of [min, (min + max) / 2, max]) {
    svg.append(element('line', {x1:plot.left, x2:plot.right, y1:y(tick), y2:y(tick), class:'chart-grid'}));
    svg.append(element('text', {x:plot.left - 7, y:y(tick) + 4, 'text-anchor':'end', class:'chart-label'}, String(tick)));
  }

  // Splitting the line at absent sols keeps the chart from implying measurements in gaps.
  const segments = [];
  points.forEach((point, index) => {
    if (index === 0 || point.observedAt - points[index - 1].observedAt > settings.dayMs * 1.25) segments.push([]);
    segments.at(-1).push(x(point.observedAt) + ',' + y(point.value));
  });

  for (const segment of segments) {
    svg.append(element('polyline', {points:segment.join(' '), class:'chart-line'}));
  }
  for (const point of points) {
    const isCurrent = point.id === current?.id;
    svg.append(element('circle', {
      cx:x(point.observedAt), cy:y(point.value), r:isCurrent ? 5 : 2.4,
      class:isCurrent ? 'chart-current' : 'chart-point',
    }));
  }

  svg.append(element('text', {x:plot.left, y:height - 10, class:'chart-label'}, 'Older'));
  svg.append(element('text', {x:plot.right, y:height - 10, 'text-anchor':'end', class:'chart-label'}, 'Latest'));
  container.replaceChildren(svg);
}
