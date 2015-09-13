'use strict';

require('coffee-script/register');
var path             = require('path');
var util             = require('util');
var gutil            = require('gulp-util');
var through          = require('through2');
var winston          = require('winston');
var jscpd            = require('jscpd');
var TokenizerFactory = require('jscpd/src/tokenizer/TokenizerFactory');
var Mapper           = require('jscpd/src/map').Map;
var Strategy         = require('jscpd/src/strategy').Strategy;
var Report           = require('jscpd/src/report').Report;

winston.remove(winston.transports.Console); // Silent jscpd logging messages

module.exports = function(opts) {
  opts = opts || {};
  var cwd = opts.path || '.';
  var config = jscpd.prototype.readConfig(cwd + '/.cpd.yaml') || jscpd.prototype.readConfig(cwd + '/.cpd.yml') || {}
  opts = util._extend({
    'min-lines' : 5,
    'min-tokens': 70,
    reporter    : 'xml',
    languages   : jscpd.prototype.LANGUAGES,
    output      : null,
    path        : null,
    verbose     : false,
    debug       : false,
    silent      : false
  }, opts);
  opts = util._extend(opts, config);
  if (config.path) {
    opts.path = path.normalize(cwd + path.sep + config.path);
    cwd = opts.path;
  }
  opts.extensions = TokenizerFactory.prototype.getExtensionsByLanguages(opts.languages);

  var result   = [];
  var map      = new Mapper();
  var strategy = new Strategy(opts.languages);
  var report   = new Report({
    verbose: opts.verbose,
    output: opts.output,
    reporter: opts.reporter
  });

  if (opts.debug) {
    gutil.log('----------------------------------------');
    gutil.log('Options:');
    for (var name in opts) {
      var opt = opts[name];
      gutil.log(name + ' = ' + opt);
    }
    gutil.log('----------------------------------------');
    gutil.log('Files:');
  }

  return through.obj(function(file, enc, cb) {
    if (file.isNull()) {
      this.push(file);
      return cb();
    }
    if (file.isStream()) {
      this.emit('error', new gutil.PluginError('gulp-jscpd', 'Streaming not supported'));
      return cb();
    }
    if (opts.debug) {
      gutil.log(file.path);
    } else {
      strategy.detect(map, file.path, opts['min-lines'], opts['min-tokens']);
    }

    this.push(file);
    cb();
  }, function(cb) {
    if (opts.debug) {
      gutil.log('----------------------------------------');
      gutil.log('Run without debug option for start detection process');
      return cb();
    }
    report.generate(map);
    map.clones.forEach(function(err) {
      var clone = 'Lines ' +
        gutil.colors.cyan(err.firstFileStart) + '-' +
        gutil.colors.cyan(err.firstFileStart + err.linesCount);
      if (err.firstFile !== err.secondFile) {
        clone += ' in ' + gutil.colors.magenta(path.relative('.', err.firstFile));
      }
      clone += ' are duplicates of lines ' +
        gutil.colors.cyan(err.secondFileStart) + '-' +
        gutil.colors.cyan(err.secondFileStart + err.linesCount) + ' in ' +
        gutil.colors.magenta(path.relative('.', err.secondFile));
      if (opts.verbose) {
        clone += '\n\n' + err.getLines() + '\n';
      }
      result.push(clone);
    });

    if (result.length > 0) {
      var output = gutil.colors.red(
        'Found ' + result.length + ' exact clones with ' + map.numberOfDuplication +
        ' duplicated lines in ' + map.numberOfFiles + ' files\n\n'
      );
      output += result.join('\n') + '\n\n';
      output += gutil.colors.red(
        map.getPercentage() + '% (' + map.numberOfDuplication + ' lines) ' +
        'duplicated lines out of ' + map.numberOfLines + ' total lines of code'
      );
      if (!opts.silent) {
        this.emit('error', new gutil.PluginError('gulp-jscpd', output, {
          showStack: false
        }));
      }
    }

    return cb();
  });
};
