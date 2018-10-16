const gulp = require('gulp');
const nodemon = require('nodemon');

gulp.task('default', function(){
	nodemon({
		script: 'server/fileserver.js',
		ignore: ['public/*', 'node_modules/*']
	})
	.on('restart', function() {
		console.log("server restarted");
	})
});
