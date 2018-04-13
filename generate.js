// process.env.DEBUG = "metalsmith-timer";

const buildJS = require('./build-js');
const buildMetalsmith = require('./build-metalsmith.js');
const critical = require('./critical.js');

async function main() {
  await buildJS();
  await buildMetalsmith();
  critical();
};

main();