/* jshint expr:true */
'use strict';

var path   = require('path');
var fs     = require('fs');
var jscpd  = require('../');
var gutil  = require('gulp-util');
var chai   = require('chai');
var expect = chai.expect;

gutil.log = function() {};

describe('gulp-jscpd', function() {
  it('exists', function() {
    expect(jscpd).to.be.a('function');
  });

  it('should not throw an error on valid files', function(done) {
    var stream = jscpd();

    stream.on('data', function() {});

    stream.on('error', function() {
      expect(true).not.to.be.ok;
    });

    stream.on('end', done);

    stream.write(new gutil.File({
      base    : __dirname,
      path    : path.join(__dirname, '/fixtures/fixture_1.js'),
      contents: fs.readFileSync(path.join(__dirname, '/fixtures/fixture_1.js'))
    }));

    stream.end();
  });

  it('should throw an error on code duplication', function(done) {
    var stream = jscpd();

    stream.on('error', function() {
      expect(true).to.be.ok;
      done();
    });

    stream.write(new gutil.File({
      base    : __dirname,
      path    : path.join(__dirname, '/fixtures/fixture_1.js'),
      contents: fs.readFileSync(path.join(__dirname, '/fixtures/fixture_1.js'))
    }));

    stream.write(new gutil.File({
      base    : __dirname,
      path    : path.join(__dirname, '/fixtures/fixture_2.js'),
      contents: fs.readFileSync(path.join(__dirname, '/fixtures/fixture_2.js'))
    }));

    stream.end();
  });

  it('should not process the files in debug mode', function(done) {
    var stream = jscpd({
      debug: true
    });

    stream.on('data', function() {});

    stream.on('error', function() {
      expect(true).not.to.be.ok;
    });

    stream.on('end', done);

    stream.write(new gutil.File({
      base    : __dirname,
      path    : path.join(__dirname, '/fixtures/fixture_1.js'),
      contents: fs.readFileSync(path.join(__dirname, '/fixtures/fixture_1.js'))
    }));

    stream.write(new gutil.File({
      base    : __dirname,
      path    : path.join(__dirname, '/fixtures/fixture_2.js'),
      contents: fs.readFileSync(path.join(__dirname, '/fixtures/fixture_2.js'))
    }));

    stream.end();
  });

  it('should output duplicated code in verbose mode', function(done) {
    var stream = jscpd({
      verbose: true
    });

    stream.on('data', function() {});

    stream.on('error', function(err) {
      expect(err.message).to.match(/function\(/);
      done();
    });

    stream.write(new gutil.File({
      base    : __dirname,
      path    : path.join(__dirname, '/fixtures/fixture_1.js'),
      contents: fs.readFileSync(path.join(__dirname, '/fixtures/fixture_1.js'))
    }));

    stream.write(new gutil.File({
      base    : __dirname,
      path    : path.join(__dirname, '/fixtures/fixture_2.js'),
      contents: fs.readFileSync(path.join(__dirname, '/fixtures/fixture_2.js'))
    }));

    stream.end();
  });

  it('should not throw an error if the file content is null', function(done) {
    var stream = jscpd();

    stream.on('data', function() {});

    stream.on('error', function() {
      expect(true).not.to.be.ok;
    });

    stream.on('end', done);

    stream.write(new gutil.File());

    stream.end();
  });

  it('should throw an error if the file content is a stream', function(done) {
    var stream = jscpd();

    stream.on('data', function() {});

    stream.on('error', function(err) {
      expect(err.message).to.equal('Streaming not supported');
      done();
    });

    stream.write(new gutil.File({
      contents: process.stdin
    }));

    stream.end();
  });
});
