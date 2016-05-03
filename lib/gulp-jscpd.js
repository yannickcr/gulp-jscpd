'use strict';

require('coffee-script/register');
var path             = require('path');
var util             = require('util');
var gutil            = require('gulp-util');
var through          = require('through2');
var winston          = require('winston');
var TokenizerFactory = require('jscpd/lib/tokenizer/TokenizerFactory');
var Mapper           = require('jscpd/lib/map').Map;
var Strategy         = require('jscpd/lib/strategy').Strategy;
var Report           = require('jscpd/lib/report').Report;

var optionsPreprocessor = require('jscpd/lib/preprocessors/options');

winston.remove(winston.transports.Console); // Silent jscpd logging messages

module.exports = function(opts) {
  opts = util._extend({
    'min-lines' : 5,
    'min-tokens': 70,
    reporter    : 'xml',
    languages   : Object.keys(TokenizerFactory.prototype.LANGUAGES),
    output      : null,
    path        : null,
    verbose     : false,
    debug       : false,
    silent      : false,
    'xsl-href'  : null
  }, opts);
  opts = optionsPreprocessor({options: opts});
  var result   = [];
  var map      = new Mapper();
  var strategy = new Strategy(opts);
  var report   = new Report({
    verbose: opts.verbose,
    output: opts.output,
    reporter: opts.reporter,
    'xsl-href': opts['xsl-href']
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
