import {CandlestickElement} from '../../src/element.candlestick';

describe('Candlestick element tests', function() {

	it('Should correctly identify as in range', function() {
		const candle = new CandlestickElement();

		Object.assign(candle, {
			base: 200,
			x: 10,
			y: 100,
			width: 50,
			open: 180,
			high: 100,
			low: 200,
			close: 120,
		});

		expect(candle.inRange(10, 130)).toBe(true);
		expect(candle.inRange(10, 190)).toBe(true);
		expect(candle.inRange(10, 80)).toBe(false);
		expect(candle.inRange(5, 400)).toBe(false);
	});

});
