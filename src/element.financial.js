'use strict';

import {Chart, Element} from 'chart.js';

const globalOpts = Chart.defaults;

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

export class FinancialElement extends Element {

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
