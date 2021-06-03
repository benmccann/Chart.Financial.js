'use strict';

import {Chart} from 'chart.js';
import {merge} from 'chart.js/helpers';
import {FinancialController} from './controller.financial';
import {OhlcElement} from './element.ohlc';

export class OhlcController extends FinancialController {

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
OhlcController.defaults = merge({
	dataElementType: OhlcElement.id,
	datasets: {
		barPercentage: 1.0,
		categoryPercentage: 1.0
	}
}, Chart.defaults.financial);
