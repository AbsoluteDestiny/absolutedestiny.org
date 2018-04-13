const rollup = require('rollup');
const commonjs = require("rollup-plugin-commonjs");
const nodeResolve = require('rollup-plugin-node-resolve');
const babel = require("rollup-plugin-babel");
const uglify = require('rollup-plugin-uglify');

async function buildJS() {
  const bundle = await rollup.rollup({
    input: "js/index.js",
    onwarn: (message) => {
        if (message.code === 'CIRCULAR_DEPENDENCY') return;
        console.error( message.message );
    },
    plugins: [
      nodeResolve({
        browser: true
      }),
      commonjs(),
      babel({
        exclude: 'node_modules/**',
        presets: [
          [
            "env",
            {
              "modules": false
            }
          ]
        ],
      }),
      uglify()
    ],
  });

  const outputOptions = {
    format: "iife",
    sourcemap: true,
    file: "./src/assets/js/bundle.js",
  };

  await bundle.write(outputOptions);
}

module.exports = buildJS;