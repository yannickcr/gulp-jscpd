'use strict';

require('coffee-script/register');
var path             = require('path');
var util             = require('util');
var gutil            = require('gulp-util');
var through          = require('through2');
var jscpd            = require('jscpd');
var logger           = require('jscpd/node_modules/winston');
var TokenizerFactory = require('jscpd/src/tokenizer/TokenizerFactory');
var Mapper           = require('jscpd/src/map').Map;
var Strategy         = require('jscpd/src/strategy').Strategy;
var Report           = require('jscpd/src/report').Report;

logger.info = function() {};

module.exports = function(opts) {
  opts = opts || {};
  var cwd = opts.path || '.';
  var config = jscpd.prototype.readConfig(cwd + '/.cpd.yaml');
  opts = util._extend({
    'min-lines' : 5,
    'min-tokens': 70,
    languages   : jscpd.prototype.LANGUAGES,
    output      : null,
    path        : null,
    verbose     : false,
    debug       : false
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
    output: opts.output
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
      var clone = '';

      ['firstFile', 'secondFile'].forEach(function(num) {
        var file = err[num];
        clone +=
          path.dirname(file) + path.sep +
          gutil.colors.green(path.basename(file)) + ':' +
          gutil.colors.blue(err[num + 'Start'] + '…') +
          gutil.colors.blue(err[num + 'Start'] + err.linesCount) +
          '\n';
      });
      if (opts.verbose) {
        clone += '\n' + err.getLines();
      }
      result.push(clone);
    });

    if (result.length > 0) {
      var output = gutil.colors.red(
        'Found ' + result.length + ' exact clones with ' + map.numberOfDuplication +
        ' duplicated lines in ' + map.numberOfFiles + ' files\n\n'
      );
      output += result.join('\n') + '\n';
      output += gutil.colors.red(
        map.getPercentage() + '% (' + map.numberOfDuplication + ' lines) ' +
        'duplicated lines out of ' + map.numberOfLines + ' total lines of code'
      );
      this.emit('error', new gutil.PluginError('gulp-jscpd', output, {
        showStack: false
      }));
    }

    return cb();
  });
};
