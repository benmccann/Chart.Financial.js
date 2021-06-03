'use strict';

import {Chart} from 'chart.js';

import {CandlestickController} from './controller.candlestick.js';
import {OhlcController} from './controller.ohlc.js';

import {CandlestickElement} from './element.candlestick.js';
import {OhlcElement} from './element.ohlc.js';

Chart.register(CandlestickController, OhlcController, CandlestickElement, OhlcElement);
