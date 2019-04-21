// Gulp 3.9.1
// =====================================================================

// TODO:
// - setup SVG settings

// FIXME:
// - plugin 'gulp-changed' don't working for task 'webp'

// Load plugins
var gulp = require('gulp');
var plumber = require('gulp-plumber');
var sass = require('gulp-sass');
var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer');
var postcssObjectFit = require('postcss-object-fit-images');
var minify = require('gulp-csso');
var htmlmin = require('gulp-htmlmin');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var pipeline = require('readable-stream').pipeline;
var rename = require('gulp-rename');
var del = require('del');
var changed = require('gulp-changed');
var imagemin = require('gulp-imagemin');
var webp = require('imagemin-webp');
var svgstore = require('gulp-svgstore');
var ghPages = require('gulp-gh-pages');
var browserSync = require('browser-sync').create();
var runSequence = require('run-sequence');

// Dev Style
// Compile SASS into CSS & auto-inject into browsers
gulp.task('devStyle', function () {
  return gulp.src('src/sass/style.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(plumber.stop())
    .pipe(gulp.dest('src/css'))
    .pipe(browserSync.stream());
});

// Prod Style
// Compile SASS into CSS, add Autoprefixer, Minify CSS, Move to Build & auto-inject into browsers
gulp.task('prodStyle', function () {
  return gulp.src('src/sass/style.scss')
    .pipe(plumber())
    .pipe(sass())
    .pipe(postcss([
      autoprefixer(),
      postcssObjectFit()
    ]))
    .pipe(plumber.stop())
    .pipe(minify())
    .pipe(gulp.dest('build/css'))
    .pipe(browserSync.stream());
});

// Minify HTML
gulp.task('html', function () {
  return gulp.src('src/*.html', !'src/_TEMPLATE.html')
    .pipe(htmlmin({
      collapseBooleanAttributes: true,
      collapseWhitespace: true,
      html5: true,
      minifyCSS: true,
      minifyJS: true,
      processConditionalComments: true,
      removeComments: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true
    }))
    .pipe(gulp.dest('build'));
});

// Concat and Minify Polyfills JS files
gulp.task('polyfills', function () {
  return gulp.src('src/js/polyfills/*.js')
    .pipe(concat('polyfills-bundle.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('build/js'));
});

// Minify JS
gulp.task('script', function () {
  return pipeline(
    gulp.src('src/js/*.js', !'src/js/polyfills/*.js'),
    uglify(),
    gulp.dest('build/js')
  );
});

// Optimize Images
gulp.task('images', function () {
  return gulp.src('src/img/**/*.{png,jpg,svg}')
    .pipe(changed('build/img'))
    .pipe(imagemin([
      imagemin.optipng({
        optimizationLevel: 3
      }),
      imagemin.jpegtran({
        progressive: true
      }),

      // TODO:
      // - setup SVG settings (need Practice for Real Projects)
      imagemin.svgo({
        plugins: [{
          removeViewBox: false
        }]
      })
    ]))
    .pipe(gulp.dest('build/img'));
});

// Convert images to WebP
gulp.task('webp', ['images'], function () {
  return gulp.src('src/img/**/*.{png,jpg}')
    .pipe(changed('build/img/**/*.webp')) /* FIXME: don't working */
    .pipe(imagemin([
      webp({
        quality: 75
      })
    ]))
    .pipe(rename({
      extname: '.webp'
    }))
    .pipe(gulp.dest('build/img'));
});

// TODO:
// - setup SVG settings (need Practice for Real Projects)

// Dev Sprite - Combine SVG files into SVG Sprite
gulp.task('devSprite', function () {
  return gulp.src('src/img/svg-sprite/*.svg')
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename('sprite.svg'))
    .pipe(gulp.dest('src/img'));
});

// TODO:
// - setup SVG settings (need Practice for Real Projects)

// Prod Sprite - Combine SVG files into SVG Sprite
gulp.task('prodSprite', function () {
  return gulp.src('build/img/svg-sprite/*.svg')
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename('sprite.svg'))
    .pipe(gulp.dest('build/img'));
});

// TODO:
// - Merge tasks 'copy' and 'copyFavicons'

// Copy files
gulp.task('copy', function () {
  return gulp.src([
    'src/fonts/**/*.{woff,woff2}'
  ], {
      base: 'src'
    })
    .pipe(gulp.dest('build'));
});

// Copy Favicons files
gulp.task('copyFavicons', function () {
  return gulp.src([
    'src/favicons/*'
  ])
    .pipe(gulp.dest('build'));
});

// Delete files
gulp.task('clean', function () {
  return del('build');
});

// Dev Server
gulp.task('devServer', function () {
  browserSync.init({
    server: './src',
    notify: false,
    open: true,
    cors: true,
    ui: false
  });

  // Watch files
  gulp.watch('src/sass/**/*.scss', ['devStyle']);
  gulp.watch('src/*.html')
    .on('change', browserSync.reload);
  gulp.watch('src/js/*.js')
    .on('change', browserSync.reload);
  gulp.watch('src/img/**/*')
    .on('change', browserSync.reload);
  gulp.watch('src/img/svg-sprite/*.svg', ['devSprite'])
    .on('change', browserSync.reload);
});

// Prod Server
gulp.task('prodServer', function () {
  browserSync.init({
    server: './build',
    notify: false,
    open: true,
    cors: true,
    ui: false
  });

  // Watch files
  gulp.watch('src/sass/**/*.scss', ['prodStyle']);
  gulp.watch('src/*.html', ['html'])
    .on('change', browserSync.reload);
  gulp.watch('src/js/*.js', ['script'])
    .on('change', browserSync.reload);
  gulp.watch('src/img/**/*', ['images', 'webp'])
    .on('change', browserSync.reload);
  gulp.watch('src/img/svg-sprite/*.svg', ['prodSprite'])
    .on('change', browserSync.reload);
});

// Deploy to Github Pages
// =====================================================================

gulp.task('deployGithub', function () {
  return gulp.src('./build/**/*')
    .pipe(ghPages());
});

// Complex Tasks
// =====================================================================

// DEV
gulp.task('dev', function (done) {
  runSequence(
    'clean',
    'devStyle',
    'devSprite',
    done
  );
});

// PROD
gulp.task('build', function (done) {
  runSequence(
    'clean',
    'html',
    'prodStyle',
    'polyfills',
    'script',
    'images',
    'webp',
    'prodSprite',
    'copy',
    'copyFavicons',
    done
  );
});
