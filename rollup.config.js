const terser = require('rollup-plugin-terser').terser;
const pkg = require('./package.json');

const banner = `/*!
 * @license
 * ${pkg.name}
 * http://chartjs.org/
 * Version: ${pkg.version}
 *
 * Copyright ${new Date().getFullYear()} Chart.js Contributors
 * Released under the MIT license
 * https://github.com/chartjs/${pkg.name}/blob/master/LICENSE.md
 */`;

module.exports = [
	{
		input: 'src/index.js',
		output: ['.js', '.min.js'].map((suffix) => {
			const config = {
				name: 'Chart.Financial',
				file: `dist/${pkg.name}${suffix}`,
				banner: banner,
				format: 'umd',
				indent: false,
				plugins: [],
				globals: {
					'chart.js': 'Chart',
					'chart.js/helpers': 'Chart.helpers',
				},
			};

			if (suffix.match(/\.min\.js$/)) {
				config.plugins.push(
					terser({
						output: {
							comments: /^!/,
						},
					}),
				);
			}

			return config;
		}),
		external: [
			'chart.js',
			'chart.js/helpers',
		],
	},
	{
		input: 'src/index.esm.js',
		output: {
			file: pkg.module,
			banner: banner,
			format: 'esm',
			indent: false,
		},
		external: [
			'chart.js',
			'chart.js/helpers',
		],
	},
];
