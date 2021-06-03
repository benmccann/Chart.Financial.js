'use strict';

import {BarController, defaults} from 'chart.js';
import {clipArea, isNullOrUndef, unclipArea} from 'chart.js/helpers';

/**
 * Computes the "optimal" sample size to maintain bars equally sized while preventing overlap.
 * @private
 */
function computeMinSampleSize(scale, pixels) {
	let min = scale._length;
	let prev, curr, i, ilen;

	for (i = 1, ilen = pixels.length; i < ilen; ++i) {
		min = Math.min(min, Math.abs(pixels[i] - pixels[i - 1]));
	}

	for (i = 0, ilen = scale.ticks.length; i < ilen; ++i) {
		curr = scale.getPixelForTick(i);
		min = i > 0 ? Math.min(min, Math.abs(curr - prev)) : min;
		prev = curr;
	}

	return min;
}

/**
 * This class is based off controller.bar.js from the upstream Chart.js library
 */
export class FinancialController extends BarController {

	getLabelAndValue(index) {
		const me = this;
		const parsed = me.getParsed(index);
		const axis = me._cachedMeta.iScale.axis;

		const {o, h, l, c} = parsed;
		const value = `O: ${o}  H: ${h}  L: ${l}  C: ${c}`;

		return {
			label: `${me._cachedMeta.iScale.getLabelForValue(parsed[axis])}`,
			value
		};
	}

	getAllParsedValues() {
		const meta = this._cachedMeta;
		const axis = meta.iScale.axis;
		const parsed = meta._parsed;
		const values = [];
		for (let i = 0; i < parsed.length; ++i) {
			values.push(parsed[i][axis]);
		}
		return values;
	}

	/**
	 * Implement this ourselves since it doesn't handle high and low values
	 * https://github.com/chartjs/Chart.js/issues/7328
	 * @protected
	 */
	getMinMax(scale) {
		const meta = this._cachedMeta;
		const _parsed = meta._parsed;
		const axis = meta.iScale.axis;

		if (_parsed.length < 2) {
			return {min: 0, max: 1};
		}

		if (scale === meta.iScale) {
			return {min: _parsed[0][axis], max: _parsed[_parsed.length - 1][axis]};
		}

		let min = Number.POSITIVE_INFINITY;
		let max = Number.NEGATIVE_INFINITY;
		for (let i = 0; i < _parsed.length; i++) {
			const data = _parsed[i];
			min = Math.min(min, data.l);
			max = Math.max(max, data.h);
		}
		return {min, max};
	}

	_getRuler() {
		const me = this;
		const opts = me.options;
		const meta = me._cachedMeta;
		const iScale = meta.iScale;
		const axis = iScale.axis;
		const pixels = [];
		for (let i = 0; i < meta.data.length; ++i) {
			pixels.push(iScale.getPixelForValue(me.getParsed(i)[axis]));
		}
		const barThickness = opts.barThickness;
		const min = computeMinSampleSize(iScale, pixels);
		return {
			min,
			pixels,
			start: iScale._startPixel,
			end: iScale._endPixel,
			stackCount: me._getStackCount(),
			scale: iScale,
			ratio: barThickness ? 1 : opts.categoryPercentage * opts.barPercentage
		};
	}

	/**
	 * @protected
	 */
	calculateElementProperties(index, ruler, reset, options) {
		const me = this;
		const vscale = me._cachedMeta.vScale;
		const base = vscale.getBasePixel();
		const ipixels = me._calculateBarIndexPixels(index, ruler, options);
		const data = me.chart.data.datasets[me.index].data[index];
		const open = vscale.getPixelForValue(data.o);
		const high = vscale.getPixelForValue(data.h);
		const low = vscale.getPixelForValue(data.l);
		const close = vscale.getPixelForValue(data.c);

		return {
			base: reset ? base : low,
			x: ipixels.center,
			y: (low + high) / 2,
			width: ipixels.size,
			open,
			high,
			low,
			close
		};
	}

	draw() {
		const me = this;
		const chart = me.chart;
		const rects = me._cachedMeta.data;
		clipArea(chart.ctx, chart.chartArea);
		for (let i = 0; i < rects.length; ++i) {
			rects[i].draw(me._ctx);
		}
		unclipArea(chart.ctx);
	}

}

FinancialController.overrides = {
	label: '',

	parsing: false,

	hover: {
		mode: 'label'
	},

	datasets: {
		categoryPercentage: 0.8,
		barPercentage: 0.9,
		animation: {
			numbers: {
				type: 'number',
				properties: ['x', 'y', 'base', 'width', 'open', 'high', 'low', 'close']
			}
		}
	},

	scales: {
		x: {
			type: 'timeseries',
			offset: true,
			ticks: {
				major: {
					enabled: true,
				},
				fontStyle: context => context.tick.major ? 'bold' : undefined,
				source: 'data',
				maxRotation: 0,
				autoSkip: true,
				autoSkipPadding: 75,
				sampleSize: 100
			},
			afterBuildTicks: scale => {
				const DateTime = window && window.luxon && window.luxon.DateTime;
				if (!DateTime) {
					return;
				}
				const majorUnit = scale._majorUnit;
				const ticks = scale.ticks;
				const firstTick = ticks[0];
				if (!firstTick) {
					return;
				}

				let val = DateTime.fromMillis(firstTick.value);
				if ((majorUnit === 'minute' && val.second === 0)
						|| (majorUnit === 'hour' && val.minute === 0)
						|| (majorUnit === 'day' && val.hour === 9)
						|| (majorUnit === 'month' && val.day <= 3 && val.weekday === 1)
						|| (majorUnit === 'year' && val.month === 1)) {
					firstTick.major = true;
				} else {
					firstTick.major = false;
				}
				let lastMajor = val.get(majorUnit);

				for (let i = 1; i < ticks.length; i++) {
					const tick = ticks[i];
					val = DateTime.fromMillis(tick.value);
					const currMajor = val.get(majorUnit);
					tick.major = currMajor !== lastMajor;
					lastMajor = currMajor;
				}
				scale.ticks = ticks;
			}
		},
		y: {
			type: 'linear'
		}
	},

	plugins: {
		tooltip: {
			intersect: false,
			mode: 'index',
			callbacks: {
				label(ctx) {
					const point = ctx.parsed;

					if (!isNullOrUndef(point.y)) {
						return defaults.plugins.tooltip.callbacks.label(ctx);
					}

					const {o, h, l, c} = point;

					return `O: ${o}  H: ${h}  L: ${l}  C: ${c}`;
				}
			}
		}
	}
};
