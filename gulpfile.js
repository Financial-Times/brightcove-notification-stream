var gulp = require('gulp');
var aws = require('aws-sdk');
var runSequence = require('run-sequence');
var concat = require('gulp-concat');
var del = require('del');
var gutil = require('gulp-util');
var jshint = require('gulp-jshint');
var path = require('path');
var rename = require('gulp-rename');
var sequence = require('run-sequence');
var uglify = require('gulp-uglify');
var wrap = require('gulp-wrap');
var zip    = require('gulp-zip');
var lambda = require('gulp-awslambda');
var cloudformation = require('gulp-cloudformation');
const template = require('gulp-template');
var config = { useIAM: true };
var s3 = require('gulp-s3-upload')(config);
var paths = {};

paths.src = {};
paths.src.root = './src';
paths.src.js    = path.join(paths.src.root, 'js/*.js');

paths.build = {};
paths.build.root  = './build';
paths.build.js    = path.join(paths.build.root, 'js');

paths.dist = {};
paths.dist.root = './dist';
paths.dist.js   = path.join(paths.dist.root, 'js');

var isDev = (gutil.env.env == 'dev')
gulp.task('env', function() {
    if ((!isDev) && (!gutil.env.lambdarole) && (!gutil.env.account) && (!gutil.env.lambdauploadrole) && (!gutil.env.region)) {
        gutil.log(gutil.colors.red('--role=, must be a valid aws arn'));
        process.exit(1)
    }
});

gulp.task('lint:js', function() {
    return gulp.src(paths.src.js)
        .pipe(jshint())
        .pipe(jshint.reporter('unix'));

});
gulp.task('lint', ['lint:js']);

gulp.task('compile:clean', function(callback) {
    if (isDev) {
        del([paths.build.root], callback);
    } else {
        del([paths.dist.root], callback);
    }
});

gulp.task('compile:js', function() {
    return gulp.src([ paths.src.js, ])
        .pipe(isDev ? gutil.noop() : concat('index.js'))
        .pipe(isDev ? gutil.noop() : uglify())
        .pipe(gulp.dest(isDev ? paths.build.js : paths.dist.js))
});

gulp.task('compile', function(callback) {
    sequence('compile:clean', ['compile:js'], callback);
});

gulp.task('deploy:cloudformation', function(callback) {
    var cloudformation_template = 'cloudformation/' + gutil.env.env + '/flex-cloudformation-brightcove-stream.json';

    return gulp.src([cloudformation_template])
        .pipe(cloudformation.init({   //Only validates the stack files
            region: gutil.env.region
        }).pipe(cloudformation.deploy({})).on('error', function(error) {
            gutil.log('Unable to deploy api-gw exiting With Error', error);
            throw error;
        }));

});

gulp.task('deploy:lambda-zip', function() {
    gulp.src(['./deploy/index.js', './node_modules/*/**'])
        .pipe(zip('brightcove-notification-stream.zip'))
        .pipe(gulp.dest('.'));
});

gulp.task('deploy:lambda-upload', function() {
    gulp.src('brightcove-notification-stream.zip')
        .pipe(s3({
            Bucket: 'com.ft.video.artefacts'
        }, {
            maxRetries: 5
        }));
});

gulp.task('deploy:cloudformation-template', function() {

    gulp.src('cloudformation/flex-cloudformation-brightcove-stream.json')
        .pipe(template({lambdarole: gutil.env.lambdarole,
            account: gutil.env.account,
            accountforrole: gutil.env.account,
            vpcSecurityGroupId: gutil.env.vpcSecurityGroupId,
            subNetOne: gutil.env.subNetOne,
            subNetTwo: gutil.env.subNetTwo,
            environment: gutil.env.env,
            subNetGroupId: gutil.env.subNetGroupId}))
        .pipe(gulp.dest('cloudformation/' + gutil.env.env));
});

gulp.task('deploy:javascript-template', function() {
    gulp.src('index.js.template')
        .pipe(template({account: gutil.env.account,
            brightCoveClientId: gutil.env.brightCoveClientId,
            brightCoveClientSecret: gutil.env.brightCoveClientSecret,
            brightcoveAccount: gutil.env.brightcoveAccount}))
        .pipe(rename("index.js"))
        .pipe(gulp.dest('deploy/'));
});

gulp.task('deploy', function(callback) {
    sequence('deploy:javascript-template','deploy:cloudformation-template', 'deploy:lambda-zip', 'deploy:lambda-upload', 'deploy:cloudformation', callback);
});

gulp.task('default', function(callback) {
    if  (gutil.env.env == 'dev') {
        sequence('env', 'lint', 'compile', callback);
    } else {
        sequence('env', 'lint', 'compile', 'deploy', callback);
    }
});
