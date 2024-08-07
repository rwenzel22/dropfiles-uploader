module.exports = function(grunt) {
  grunt.initConfig({
    clean: {
      css: ['dist/']
    },
    copy: {
      main: {
        expand: true,
        cwd: 'src/css/',
        src: '*.css',
        dest: 'dist/'
      }
    },
    cssmin: {
      target: {
        files: [{
          expand: true,
          cwd: 'dist/',
          src: ['*.css'],
          dest: 'dist/',
          ext: '.min.css'
        }]
      }
    },
    jshint: {
      options: {
        reporter: require('jshint-stylish'),
        esversion: 12,
        multistr: true,
      },
      all: ['src/js/dropfilesuploader.js']
    },
    concat: {
      options: {
        separator: ';',
      },
      dist: {
        src: ['src/js/dropfilesuploader.js'],
        dest: 'dist/dropfilesuploader.js',
      },
    },
    uglify: {
      options: {
        mangle: true,
        compress: true
      },
      my_target: {
        files: {
          'dist/dropfilesuploader.min.js': ['dist/dropfilesuploader.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', ['clean', 'copy', 'cssmin', 'concat', 'uglify', 'jshint']);
};
