describe('Financial controller tests', function() {
	it('Should create candlestick elements for each data item during initialization', function() {
		var chart = window.acquireChart({type: 'candlestick',
			data: {
				datasets: [{
					data: [
						{x: 1491004800, o: 70.87, h: 80.13, l: 40.94, c: 50.24},
						{x: 1491091200, o: 60.23, h: 200.23, l: 50.29, c: 90.20},
						{x: 1491177600, o: 40.00, h: 50.42, l: 20.31, c: 30.20},
						{x: 1491264000, o: 60.90, h: 80.34, l: 40.14, c: 60.29},
						{x: 1491350400, o: 60.94, h: 100.09, l: 50.78, c: 90.04},
						{x: 1491436800, o: 30.49, h: 50.20, l: 20.09, c: 40.20},
						{x: 1491523200, o: 50.04, h: 80.93, l: 40.94, c: 70.24},
						{x: 1491609600, o: 60.29, h: 100.49, l: 50.49, c: 90.24},
						{x: 1491696000, o: 40.04, h: 50.23, l: 20.23, c: 30.49},
						{x: 1491782400, o: 30.23, h: 50.09, l: 20.87, c: 40.49}
					]
				}]
			},
			getDatasetMeta: function(datasetIndex) {
				this.data.datasets[datasetIndex].meta = this.data.datasets[datasetIndex].meta || {
					data: [],
					dataset: null
				};
				return this.data.datasets[datasetIndex].meta;
			}
		});

		var meta = chart.getDatasetMeta(0);
		expect(meta.data.length).toBe(10);
		for (var i = 0; i < meta.data.length; i++) {
			expect(meta.data[i].x > 0).toBe(true);
			expect(meta.data[i].y > 0).toBe(true);
		}
	});

});
