var gulp = require('gulp'),
    apidoc = require('gulp-apidoc');

var path = {
	routes: 'routes/*.js',
	docs: 'docs/'
};

gulp.task('apidoc', function(){
  apidoc.exec({
    src: 'routes/',
    dest: path.docs
  });
});

// Build, test and generate docs, every time we update the code
gulp.task('watch', function() {
  gulp.watch(path.routes, ['apidoc']);
});