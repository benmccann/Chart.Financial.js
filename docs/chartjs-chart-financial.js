/*!
 * @license
 * chartjs-chart-financial
 * http://chartjs.org/
 * Version: 0.1.0
 *
 * Copyright 2021 Chart.js Contributors
 * Released under the MIT license
 * https://github.com/chartjs/chartjs-chart-financial/blob/master/LICENSE.md
 */
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('chart.js'), require('chart.js/helpers')) :
typeof define === 'function' && define.amd ? define(['chart.js', 'chart.js/helpers'], factory) :
(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.Chart, global.Chart.helpers));
}(this, (function (chart_js, helpers) { 'use strict';

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
class FinancialController extends chart_js.BarController {

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
		helpers.clipArea(chart.ctx, chart.chartArea);
		for (let i = 0; i < rects.length; ++i) {
			rects[i].draw(me._ctx);
		}
		helpers.unclipArea(chart.ctx);
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

					if (!helpers.isNullOrUndef(point.y)) {
						return chart_js.defaults.interaction.callbacks.label(ctx);
					}

					const {o, h, l, c} = point;

					return `O: ${o}  H: ${h}  L: ${l}  C: ${c}`;
				}
			}
		}
	}
};

const globalOpts = chart_js.Chart.defaults;

globalOpts.elements.financial = {
	color: {
		up: 'rgba(80, 160, 115, 1)',
		down: 'rgba(215, 85, 65, 1)',
		unchanged: 'rgba(90, 90, 90, 1)',
	}
};

/**
 * Helper function to get the bounds of the bar regardless of the orientation
 * @param {Rectangle} bar the bar
 * @param {boolean} [useFinalPosition]
 * @return {object} bounds of the bar
 * @private
 */
function getBarBounds(bar, useFinalPosition) {
	const {x, y, base, width, height} = bar.getProps(['x', 'low', 'high', 'width', 'height'], useFinalPosition);

	let left, right, top, bottom, half;

	if (bar.horizontal) {
		half = height / 2;
		left = Math.min(x, base);
		right = Math.max(x, base);
		top = y - half;
		bottom = y + half;
	} else {
		half = width / 2;
		left = x - half;
		right = x + half;
		top = Math.min(y, base); // use min because 0 pixel at top of screen
		bottom = Math.max(y, base);
	}

	return {left, top, right, bottom};
}

function inRange(bar, x, y, useFinalPosition) {
	const skipX = x === null;
	const skipY = y === null;
	const bounds = !bar || (skipX && skipY) ? false : getBarBounds(bar, useFinalPosition);

	return bounds
		&& (skipX || x >= bounds.left && x <= bounds.right)
		&& (skipY || y >= bounds.top && y <= bounds.bottom);
}

class FinancialElement extends chart_js.Element {

	height() {
		return this.base - this.y;
	}

	inRange(mouseX, mouseY, useFinalPosition) {
		return inRange(this, mouseX, mouseY, useFinalPosition);
	}

	inXRange(mouseX, useFinalPosition) {
		return inRange(this, mouseX, null, useFinalPosition);
	}

	inYRange(mouseY, useFinalPosition) {
		return inRange(this, null, mouseY, useFinalPosition);
	}

	getRange(axis) {
		return axis === 'x' ? this.width / 2 : this.height / 2;
	}

	getCenterPoint(useFinalPosition) {
		const {x, low, high} = this.getProps(['x', 'low', 'high'], useFinalPosition);
		return {
			x,
			y: (high + low) / 2
		};
	}

	tooltipPosition(useFinalPosition) {
		const {x, open, close} = this.getProps(['x', 'open', 'close'], useFinalPosition);
		return {
			x,
			y: (open + close) / 2
		};
	}
}

const globalOpts$1 = chart_js.Chart.defaults;

class CandlestickElement extends FinancialElement {
	draw(ctx) {
		const me = this;

		const {x, open, high, low, close} = me;

		let borderColors = me.borderColor;
		if (typeof borderColors === 'string') {
			borderColors = {
				up: borderColors,
				down: borderColors,
				unchanged: borderColors
			};
		}

		let borderColor;
		if (close < open) {
			borderColor = helpers.valueOrDefault(borderColors ? borderColors.up : undefined, globalOpts$1.elements.candlestick.borderColor);
			ctx.fillStyle = helpers.valueOrDefault(me.color ? me.color.up : undefined, globalOpts$1.elements.candlestick.color.up);
		} else if (close > open) {
			borderColor = helpers.valueOrDefault(borderColors ? borderColors.down : undefined, globalOpts$1.elements.candlestick.borderColor);
			ctx.fillStyle = helpers.valueOrDefault(me.color ? me.color.down : undefined, globalOpts$1.elements.candlestick.color.down);
		} else {
			borderColor = helpers.valueOrDefault(borderColors ? borderColors.unchanged : undefined, globalOpts$1.elements.candlestick.borderColor);
			ctx.fillStyle = helpers.valueOrDefault(me.color ? me.color.unchanged : undefined, globalOpts$1.elements.candlestick.color.unchanged);
		}

		ctx.lineWidth = helpers.valueOrDefault(me.borderWidth, globalOpts$1.elements.candlestick.borderWidth);
		ctx.strokeStyle = helpers.valueOrDefault(borderColor, globalOpts$1.elements.candlestick.borderColor);

		ctx.beginPath();
		ctx.moveTo(x, high);
		ctx.lineTo(x, Math.min(open, close));
		ctx.moveTo(x, low);
		ctx.lineTo(x, Math.max(open, close));
		ctx.stroke();
		ctx.fillRect(x - me.width / 2, close, me.width, open - close);
		ctx.strokeRect(x - me.width / 2, close, me.width, open - close);
		ctx.closePath();
	}
}

CandlestickElement.id = 'candlestick';
CandlestickElement.defaults = helpers.merge({}, [globalOpts$1.elements.financial, {
	borderColor: globalOpts$1.elements.financial.color.unchanged,
	borderWidth: 1,
}]);

class CandlestickController extends FinancialController {

	updateElements(elements, start, count, mode) {
		const me = this;
		const dataset = me.getDataset();
		const ruler = me._ruler || me._getRuler();
		const firstOpts = me.resolveDataElementOptions(start, mode);
		const sharedOptions = me.getSharedOptions(firstOpts);
		const includeOptions = me.includeOptions(mode, sharedOptions);

		me.updateSharedOptions(sharedOptions, mode, firstOpts);

		for (let i = start; i < count; i++) {
			const options = sharedOptions || me.resolveDataElementOptions(i, mode);

			const baseProperties = me.calculateElementProperties(i, ruler, mode === 'reset', options);
			const properties = {
				...baseProperties,
				datasetLabel: dataset.label || '',
				// label: '', // to get label value please use dataset.data[index].label

				// Appearance
				color: dataset.color,
				borderColor: dataset.borderColor,
				borderWidth: dataset.borderWidth,
			};

			if (includeOptions) {
				properties.options = options;
			}
			me.updateElement(elements[i], i, properties, mode);
		}
	}

}

CandlestickController.id = 'candlestick';
CandlestickController.defaults = helpers.merge({
	dataElementType: CandlestickElement.id
}, chart_js.Chart.defaults.financial);

const globalOpts$2 = chart_js.Chart.defaults;

class OhlcElement extends FinancialElement {
	draw(ctx) {
		const me = this;

		const {x, open, high, low, close} = me;

		const armLengthRatio = helpers.valueOrDefault(me.armLengthRatio, globalOpts$2.elements.ohlc.armLengthRatio);
		let armLength = helpers.valueOrDefault(me.armLength, globalOpts$2.elements.ohlc.armLength);
		if (armLength === null) {
			// The width of an ohlc is affected by barPercentage and categoryPercentage
			// This behavior is caused by extending controller.financial, which extends controller.bar
			// barPercentage and categoryPercentage are now set to 1.0 (see controller.ohlc)
			// and armLengthRatio is multipled by 0.5,
			// so that when armLengthRatio=1.0, the arms from neighbour ohcl touch,
			// and when armLengthRatio=0.0, ohcl are just vertical lines.
			armLength = me.width * armLengthRatio * 0.5;
		}

		if (close < open) {
			ctx.strokeStyle = helpers.valueOrDefault(me.color ? me.color.up : undefined, globalOpts$2.elements.ohlc.color.up);
		} else if (close > open) {
			ctx.strokeStyle = helpers.valueOrDefault(me.color ? me.color.down : undefined, globalOpts$2.elements.ohlc.color.down);
		} else {
			ctx.strokeStyle = helpers.valueOrDefault(me.color ? me.color.unchanged : undefined, globalOpts$2.elements.ohlc.color.unchanged);
		}
		ctx.lineWidth = helpers.valueOrDefault(me.lineWidth, globalOpts$2.elements.ohlc.lineWidth);

		ctx.beginPath();
		ctx.moveTo(x, high);
		ctx.lineTo(x, low);
		ctx.moveTo(x - armLength, open);
		ctx.lineTo(x, open);
		ctx.moveTo(x + armLength, close);
		ctx.lineTo(x, close);
		ctx.stroke();
	}
}

OhlcElement.id = 'ohlc';
OhlcElement.defaults = helpers.merge({}, [globalOpts$2.elements.financial, {
	lineWidth: 2,
	armLength: null,
	armLengthRatio: 0.8,
}]);

class OhlcController extends FinancialController {

	updateElements(elements, start, count, mode) {
		const me = this;
		const dataset = me.getDataset();
		const ruler = me._ruler || me._getRuler();
		const firstOpts = me.resolveDataElementOptions(start, mode);
		const sharedOptions = me.getSharedOptions(firstOpts);
		const includeOptions = me.includeOptions(mode, sharedOptions);

		for (let i = 0; i < count; i++) {
			const options = sharedOptions || me.resolveDataElementOptions(i, mode);

			const baseProperties = me.calculateElementProperties(i, ruler, mode === 'reset', options);
			const properties = {
				...baseProperties,
				datasetLabel: dataset.label || '',
				lineWidth: dataset.lineWidth,
				armLength: dataset.armLength,
				armLengthRatio: dataset.armLengthRatio,
				color: dataset.color,
			};

			if (includeOptions) {
				properties.options = options;
			}
			me.updateElement(elements[i], i, properties, mode);
		}
	}

}

OhlcController.id = 'ohlc';
OhlcController.defaults = helpers.merge({
	dataElementType: OhlcElement.id,
	datasets: {
		barPercentage: 1.0,
		categoryPercentage: 1.0
	}
}, chart_js.Chart.defaults.financial);

chart_js.Chart.register(CandlestickController, OhlcController, CandlestickElement, OhlcElement);

})));
