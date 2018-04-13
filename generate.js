// process.env.DEBUG = "metalsmith-timer";
const fs = require("fs");
const path = require("path");

const frontmatter = require("front-matter");

// Metalsmih
const Metalsmith = require("metalsmith");
const autoprefixer = require("metalsmith-autoprefixer");
const collections = require("metalsmith-collections");
const copy = require("metalsmith-copy");
const each = require("metalsmith-each");
const feed = require("metalsmith-feed");
const fileMetadata = require("metalsmith-filemetadata");
// const filesize = require("filesize");
const fingerprint = require("metalsmith-fingerprint-ignore");
const htmlMinifier = require("metalsmith-html-minifier");
const ignore = require("metalsmith-ignore");
const inplace = require("metalsmith-in-place");
// const jsonToFiles = require("metalsmith-json-to-files");
const layouts = require("metalsmith-layouts");
const less = require("metalsmith-less");
const markdown = require("metalsmith-markdown");
// const metacopy = require("metalsmith-metacopy");
// const metadata = require("metalsmith-metadata");
// const nunjucks = require("jstransformer")(require("jstransformer-nunjucks"));
// const pagination = require("metalsmith-pagination");
const paths = require("metalsmith-paths");
const permalinks = require("metalsmith-permalinks");
const replace = require("metalsmith-text-replace");
const sitemap = require("metalsmith-sitemap");
const subsetfonts = require("metalsmith-subsetfonts");
const inlineSource = require("metalsmith-inline-source");
const sharp = require("metalsmith-sharp");
const nunjucksDate = require("nunjucks-date");
const timer = require("metalsmith-timer");
const msIf = require("metalsmith-if");
// const sqip = require("sqip");
// const tags = require("metalsmith-tags");
// const watch = require("metalsmith-watch");
const rollup = require('rollup');
const commonjs = require("rollup-plugin-commonjs");
const nodeResolve = require('rollup-plugin-node-resolve');
const babel = require("rollup-plugin-babel");
const babelMinify = require('rollup-plugin-babel-minify');

const sitedata = frontmatter(fs.readFileSync('./src/config/sitedata.md', "utf8")).attributes;

// console.log(sitedata);

let nextId = 0;

// nunjucks
//   .configure("./layouts", { watch: false })
//   .addFilter("date", nunjucksDate);

// function getFandoms() {
//   return (files, metalsmith, done) => {
//     const fandoms = [];
//     Object.keys(files)
//       .filter(f => path.extname(f) === ".md")
//       .forEach(file => {
//         const fm = frontmatter(
//           fs.readFileSync(path.join(metalsmith._source, file), "utf8")
//         );
//         nextId = Number.isNaN(Number(fm.attributes.vid_id))
//           ? nextId
//           : Number(fm.attributes.vid_id);
//         console.log(fm.attributes.footage)
//         // if (fm.attributes.fandoms) {
//         //   const fandoms = fm.attributes.fandoms.toString().split(", ");
//         //   for (fandom of fandoms) {
//         //     if (fandoms.indexOf(fandom) < 0) {
//         //       fandoms.push(fandom);
//         //     }
//         //   }
//         // }
//       });
//     fandoms.sort();
//     // metalsmith._metadata.tags = fandoms;
//     setImmediate(done);
//   };
// }

async function buildJS() {
  const bundle = await rollup.rollup({
    input: "js/index.js",
    plugins: [
      nodeResolve({
        browser: true
      }),
      commonjs({
        sourceMap: true
      }),
      babel({
        exclude: 'node_modules/**',
        sourceMap: true,
        presets: [
          [
            "env",
            {
              "modules": false
            }
          ]
        ],
      }),
      babelMinify({
        sourceMap: true
      })
    ],
  });

  const outputOptions = {
    format: "iife",
    sourcemap: true,
    // sourcemapFile: "./build/js/bundle.js.map",
    file: "./src/assets/js/bundle.js",
  };

  await bundle.write(outputOptions);
}

buildJS().then(() => {
  Metalsmith(process.cwd())
  .metadata({
    site: sitedata
  })
  .source("./src")
  .destination("./build")
  .use(timer("clean"))
  // .clean(true)
  .use(ignore(["**/*.m4v"]))
  .use(timer("less"))
  .use(less())
  .use(timer("autoprefixer"))
  .use(autoprefixer())
  .use(timer("css move"))
  .use(
    copy({
      pattern: "assets/css/*.css",
      move: false,
      transform(file) {
        return path.join(
          ...path
            .dirname(file)
            .split(path.sep)
            .slice(1),
          "admin",
          path.basename(file)
        );
      }
    })
  )
  // .use(
  //   sharp({
  //     src: "**/*.svg",
  //     namingPattern: "{dir}{name}-og.jpg",
  //     methods: [
  //       {
  //         name: "resize",
  //         args: [1200, 630]
  //       },
  //       {
  //         name: "toFormat",
  //         args: ["jpeg"]
  //       }
  //     ],
  //     moveFile: false
  //   })
  // )
  .use(timer("move other assets"))
  .use(
    copy({
      pattern: "assets/**/*.*",
      move: true,
      transform(file) {
        return path.join(
          ...path
            .dirname(file)
            .split(path.sep)
            .slice(1),
          path.basename(file)
        );
      }
    })
  )
  .use(timer("fingerprint"))
  .use(fingerprint({ pattern: ["css/*.css", "js/*.js"] }))
  .use(timer("admin css"))
  .use(
    copy({
      pattern: "css/admin/*.*",
      move: true,
      transform(file) {
        return path.join("css", path.basename(file));
      }
    })
  )
  // .use(getFandoms())
  .use(timer("admin config"))
  .use(
    replace({
      "admin/config.yml": {
        find: /abcd/gi,
        replace: () => `${nextId + 1}`
      }
    })
  )
  .use(timer("rename md to basename version"))
  .use(
    each((f, filename) => {
      const file = f;
      file.basename = path.basename(filename, ".md");
      return filename;
    })
  )
  .use(ignore(["tags/**", "**/*.less"]))
  .use(timer("copy vids to vidplayer"))
  .use(
    copy({
      pattern: "vids/*.*",
      move: false,
      transform(file) {
        const newpath = path.join(
          "vidplayer",
          ...path
            .dirname(file)
            .split(path.sep)
            .slice(1),
          path.basename(file)
        );
        return newpath;
      }
    })
  )
  .use(timer("add markdown layout metadata"))
  .use(
    fileMetadata([
      { pattern: "*.md", metadata: { layout: "home.njk" } },
      { pattern: "vids/**", metadata: { layout: "vid.njk" } },
      { pattern: "vidplayer/**", metadata: { layout: "vidplayer.njk" } }
    ])
  )
  .use(timer("make vids collection"))
  .use(
    collections({
      vids: {
        pattern: "vids/*.md",
        sortBy: "date",
        reverse: true
      }
    })
  )
  .use(timer("transform md to html"))
  .use(markdown())
  .use(timer("permalinks"))
  .use(
    permalinks({
      // pattern: "post/:date/:title",
      // date: "YYYY/MM/DD",

      linksets: [
        {
          match: { collection: "vids" },
          pattern: "vid/:basename"
        },
        {
          match: { collection: "vidplayer" },
          pattern: "vidplayer/:basename"
        }
      ]
    })
  )
  .use(timer("make feed"))
  .use(
    feed({
      collection: "vids"
    })
  )
  .use(timer("fix index.html paths"))
  .use(
    paths({
      property: "paths",
      directoryIndex: "index.html"
    })
  )
  .use(timer("nunjucks templating"))
  .use(
    layouts({
      // engine: "nunjucks",
      // directory: "layouts",
      pattern: "**/*.html",
      engineOptions: {
        filters: { date: nunjucksDate }
      }
    })
  )
  .use(
    msIf(
      process.env.CONTEXT === "production",
      subsetfonts() // this plugin will run
    )
  )
  // .use(timer("subset google fonts"))
  // .use(subsetfonts())
  // .use(
  //   inplace({
  //     pattern: "**/*.njk",
  //     engineOptions: {
  //       path: `${__dirname}/layouts`
  //     }
  //   })
  // )
  .use(timer("inline svgs"))
  .use(
    inlineSource({
      swallowErrors: true
    })
  )
  .use(timer("minify html"))
  .use(
    htmlMinifier({
      removeAttributeQuotes: false,
      removeEmptyAttributes: false
    })
  )
  .use(timer("create sitemap"))
  .use(
    sitemap({
      hostname: sitedata.url,
      omitIndex: true,
      pattern: ["vid/**/*.html", "*.html"]
    })
  )
  .use(timer("google webmaster file"))
  .use(
    copy({
      pattern: "**/googlea7adbfb6a9a0f483",
      move: true,
      transform(file) {
        return `${path.basename(file)}.html`;
      }
    })
  )
  .build(err => {
    if (err) {
      throw err;
    }
  });
})