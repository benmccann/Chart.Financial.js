import { Chart } from 'chart.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const chart = new Chart('id', {
  type: 'candlestick',
  data: {
    labels: [],
    datasets: [{
      data: [{ c: 10, x: new Date(), h: 11, l: 3, o: 2 }]
    }]
  },
  options: {
    plugins: {}
  },
  plugins: []
});
