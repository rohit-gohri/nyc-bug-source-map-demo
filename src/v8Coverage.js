/* eslint-disable global-require, import/no-extraneous-dependencies, @typescript-eslint/no-use-before-define */

/**
 * @see https://github.com/bcoe/c8/issues/376
 * @see https://github.com/tapjs/processinfo/blob/33c72e547139630cde35a4126bb4575ad7157065/lib/register-coverage.cjs
 */
if (process.env.E2E_COVERAGE) {
  process.setSourceMapsEnabled(true);
  const inspector = require("inspector");
  const session = new inspector.Session();
  module.exports.session = session;
  session.connect();
  session.post("Profiler.enable");
  session.post("Runtime.enable");
  session.post("Profiler.startPreciseCoverage", {
    callCount: true,
    detailed: true,
  });

  const { fileURLToPath } = require("url");
  const v8toIstanbul = require("v8-to-istanbul");
  const libCoverage = require("istanbul-lib-coverage");
  const { findSourceMap } = require("module");

  const lineLengths = (f) =>
    readFileSync(f, "utf8")
      .split(/\n|\u2028|\u2029/)
      .map((l) => l.length);

  const { readFileSync } = require("fs");

  const getCoverage = async () => {
    const map = libCoverage.createCoverageMap();

    await new Promise((resolve, reject) => {
      session.post("Profiler.takePreciseCoverage", async (er, cov) => {
        /* istanbul ignore next - something very strange and bad happened */
        if (er) {
          reject(er);
          return;
        }
        // eslint-disable-next-line no-multi-assign,no-param-reassign
        const sourceMapCache = (cov["source-map-cache"] = {});
        await Promise.all(
          cov.result.map(async (obj) => {
            if (!/^file:/.test(obj.url)) {
              return false;
            }
            if (obj.url.includes("/node_modules/")) {
              return false;
            }

            const f = fileURLToPath(obj.url);
            // see if it has a source map
            const s = findSourceMap(f);
            if (s) {
              const { payload } = s;
              sourceMapCache[obj.url] = Object.assign(Object.create(null), {
                lineLengths: lineLengths(f),
                data: payload,
              });
            }

            const sources = {};
            const sourceMapAndLineLengths = sourceMapCache[obj.url];
            if (sourceMapAndLineLengths) {
              // See: https://github.com/nodejs/node/pull/34305
              if (!sourceMapAndLineLengths.data) return;
              sources.sourceMap = {
                sourcemap: sourceMapAndLineLengths.data,
              };
              if (sourceMapAndLineLengths.lineLengths) {
                let source = "";
                sourceMapAndLineLengths.lineLengths.forEach((length) => {
                  source += `${"".padEnd(length, ".")}\n`;
                });
                sources.source = source;
              }
            }

            const converter = v8toIstanbul(f, undefined, sources);
            await converter.load();
            converter.applyCoverage(obj.functions);
            const coverage = converter.toIstanbul();
            converter.destroy();
            map.merge(coverage);
          })
        );
        resolve(null);
      });
    });

    return map.toJSON();
  };

  global.__getCoverage__ = getCoverage;

  module.exports = { coverageOnProcessEnd: getCoverage };
} else {
  module.exports = { coverageOnProcessEnd: () => {} };
  global.__getCoverage__ = () => {};
}
