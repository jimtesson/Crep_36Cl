module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      dist: {
        src: ['js/src/*.js'],
        dest: 'js/build.js'
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'js/src/*.js'],
      options: {
        // options here to override JSHint defaults
        globals: {
          jQuery: true,
          console: true,
          module: true,
          document: true
        }
      }
    },
    uglify: {
      app: {
        files:{
          'js/build.min.js': ['js/build.js']
        }
      }
    },
    less: {
        template:{
          files: {
            'styles/css/template.css' : ['styles/less/template.less']
          },
          options:{
            compress: true
          }
        }
    },
    watch: {
      js:{
        files: ['<%= jshint.files %>'],
        tasks: ['jshint','concat']
      },
      css:{
        files: [ 'styles/less/*'],
        tasks: ['less']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-less');




  grunt.registerTask('default', ['jshint','concat', 'uglify', 'less']);

};