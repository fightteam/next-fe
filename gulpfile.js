/**
 * gulp 构建配置
 */
'use strict';

// 项目配置

var gulp = require('gulp');

// 载入 plugins
var $ = require('gulp-load-plugins')();


var app_dir = "app";
var assets_dir = app_dir + "/assets";
var tmp_dir = ".tmp";
var styles_dir = assets_dir + "/styles";
var scripts_dir = assets_dir + "/scripts";
var dist_dir = "dist";

// 编译sass、less等为css
gulp.task('scss', function () {
    return gulp.src(styles_dir + '/scss/**/*.scss')
        .pipe($.rubySass({
            style: 'expanded',
            precision: 10
        }))
        .pipe($.autoprefixer('last 1 version'))
        .pipe(gulp.dest(tmp_dir + "/assets/styles"))
        .pipe($.size());
});

gulp.task('less', function () {
    return gulp.src([styles_dir +'/less/**/*.less', "!" + styles_dir +"/less/**/_*.less", "!" + styles_dir +"/less/vendors/**", "!" + styles_dir +"/less/base/**"])
    .pipe($.less({
      paths: [ styles_dir + '/bower_components' ]
    }))
    .pipe($.autoprefixer('last 1 version'))
    .pipe(gulp.dest(tmp_dir + "/assets/styles"))
    .pipe($.size());
});

gulp.task('styles', ['less', 'scss']);

// 拷贝js、编译coffeescript等
gulp.task('js', function () {
    return gulp.src(scripts_dir + '/js/**/*.js')
        .pipe($.jshint())
        .pipe($.jshint.reporter(require('jshint-stylish')))
        .pipe(gulp.dest(tmp_dir + '/assets/scripts'))
        .pipe($.size());
});

gulp.task('coffee', function() {
    return gulp.src(scripts_dir + "/coffee/**/*.coffee")
        .pipe($.coffee({bare: true}).on('error', console.log))
        .pipe(gulp.dest(tmp_dir + '/assets/scripts'))
        .pipe($.size());
});

gulp.task('scripts', ['coffee', 'js']);

gulp.task('html', ['styles', 'scripts'], function () {
    var jsFilter = $.filter('**/*.js');
    var cssFilter = $.filter('**/*.css');

    return gulp.src('app/*.html')
        .pipe($.useref.assets({searchPath: "{" + tmp_dir +"," + app_dir + "}"}))
        .pipe(jsFilter)
        .pipe($.uglify())
        .pipe(jsFilter.restore())
        .pipe(cssFilter)
        .pipe($.csso())
        .pipe(cssFilter.restore())
        .pipe($.useref.restore())
        .pipe($.useref())
        .pipe(gulp.dest(dist_dir + "/*.html"))
        .pipe($.size());
});

gulp.task('images', function () {
    return gulp.src(assets_dir + '/images/**/*')
        .pipe($.cache($.imagemin({
            optimizationLevel: 3,
            progressive: true,
            interlaced: true
        })))
        .pipe(gulp.dest(dist_dir + '/images'))
        .pipe($.size());
});

gulp.task('fonts', function () {
    return $.bowerFiles()
        .pipe($.filter('**/*.{eot,svg,ttf,woff}'))
        .pipe($.flatten())
        .pipe(gulp.dest(dist_dir + '/fonts'))
        .pipe($.size());
});

gulp.task('extras', function () {
    return gulp.src([app_dir + '/*.*', "!" + app_dir + "/*.html"], { dot: true })
        .pipe(gulp.dest(dist_dir));
});

gulp.task('clean', function () {
    return gulp.src([tmp_dir, dist_dir])
    .pipe($.clean());
});

gulp.task('build', ['html', 'images', 'fonts', 'extras']);

gulp.task('default', ['clean'], function () {
    gulp.start('build');
});

gulp.task('connect', function () {
    var connect = require('connect');
    var app = connect()
        .use(require('connect-livereload')({ port: 35729 }))
        .use(connect.static(app_dir))
        .use(connect.static(tmp_dir))
        .use(connect.directory(app_dir));

    require('http').createServer(app)
        .listen(9000)
        .on('listening', function () {
            console.log('Started connect web server on http://localhost:9000');
        });
});

gulp.task('serve', ['connect', 'styles'], function () {
    $.livereload();
    require('opn')('http://localhost:9000');
});

// 自动引入bower的依赖组件
gulp.task('wiredep', function () {
    var wiredep = require('wiredep').stream;

    gulp.src( styles_dir + '/**/*.scss')
        .pipe(wiredep({
            directory: assets_dir + '/bower_components'
        }))
        .pipe(gulp.dest(styles_dir));

    gulp.src(app_dir + '/*.html')
        .pipe(wiredep({
            directory: assets_dir + '/bower_components'
        }))
        .pipe(gulp.dest(app_dir));
});

gulp.task('watch', ['connect', 'serve'], function () {
    var server = $.livereload();

    // 监听改变
    gulp.watch([
        app_dir + '/*.html',
        styles_dir + '/**/*.css',
        scripts_dir + '/**/*.js',
        assets_dir + '/images/**/*'
    ]).on('change', function (file) {
        server.changed(file.path);
    });

    gulp.watch(styles_dir + '/scss/**/*.scss', ['scss']);
    gulp.watch(styles_dir + '/less/**/*.less', ['less']);
    gulp.watch(scripts_dir + '/js/**/*.js', ['js']);
    gulp.watch(scripts_dir + '/coffee/**/*.coffee', ['coffee']);
    gulp.watch(assets_dir + '/images/**/*', ['images']);
    gulp.watch('bower.json', ['wiredep']);
});
