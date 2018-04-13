const critical = require('critical').stream;
// const debug = require('gulp-debug');
const gulp = require('gulp');
const plumber = require('gulp-plumber');

// for some reason critical isnt working with globs

module.exports = () => {
  gulp.task('critical', () => gulp.src(['**/*.html', 'vid/**/*.html', 'vidplayer/**/*.html'], { cwd: 'build' })
    .pipe(plumber({ errorHandler: () => {}}))
    // .pipe(debug())
    .pipe(critical({
      base: 'build/',
      inline: true,
      minify: true,
      timeout: 60000,
      ignore: ['font-face']}
    ))
    .pipe(gulp.dest('./build/')))

  gulp.start('critical')
}