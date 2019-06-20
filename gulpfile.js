var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var ngAnnotate = require('gulp-ng-annotate');
var del = require('del');
var less = require('gulp-less');
var istanbul = require('gulp-istanbul');
var mocha = require('gulp-mocha');
var karma = require('karma');


var paths = {
  scripts: ['assets/js/linguine.module.js', 'assets/js/corpora/corpora.module.js', 'assets/js/analysis/analysis.module.js', 'assets/js/**/*.js'],
  stylesheets: 'assets/stylesheets/**/*.less',
  images: 'assets/img/*'
};

clean = function(){
  return del(['public/js', 'public/css']);
};

scripts = function(){
  return gulp.src(paths.scripts)
    .pipe(ngAnnotate())
    .pipe(uglify())
    .pipe(concat('app.min.js'))
    .pipe(gulp.dest('public/js'));
};

scripts_dev = function(){
  return gulp.src(paths.scripts)
    .pipe(ngAnnotate())
    .pipe(concat('app.min.js'))
    .pipe(gulp.dest('public/js'));
};

stylesheets = function(){
  return gulp.src(paths.stylesheets)
    .pipe(less())
    .pipe(gulp.dest('public/css'));
};

images = function() {
  return gulp.src(paths.images)
    .pipe(gulp.dest('public/img'));
};


watch = function(){
  gulp.watch(paths.scripts, { ignoreInitial: false }, scripts_dev);
  gulp.watch(paths.stylesheets, { ignoreInitial: false }, stylesheets);
  gulp.watch(paths.images, { ignoreInitial: false }, images);
};

mocha_tests = function () {
  return gulp.src(['models/*.js', 'routes/*.js', 'app.js'])
    .pipe(istanbul())
    .on('finish', function () {
      gulp.src(['test/**/*.js', '!test/angular/**/*.js'])
        .pipe(mocha())
        .pipe(istanbul.writeReports())
    });
};

/**
 * Run test once and exit
 */
karma_tests = function (done) {
  var server = new karma.Server({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done);
  return server.start();
};

exports.clean = clean;

exports.test = gulp.series(mocha_tests, karma_tests);

exports.build = gulp.series(scripts, stylesheets, images);

exports.default = watch;
