'use strict';

/**
 * Module dependencies.
 */
var Mocha = require('mocha'),
    Suite = require('mocha/lib/suite'),
    Test = require('mocha/lib/test');
/**
 * @param {Suite} suite Root suite.
 */
module.exports = Mocha.interfaces.metadata_ui =  function(suite) {
  var suites = [suite];

  suite.on('pre-require', function(context, file, mocha) {
    var common = require('mocha/lib/interfaces/common')(suites, context, mocha);

    context.before = common.before;
    context.after = common.after;
    context.beforeEach = common.beforeEach;
    context.afterEach = common.afterEach;
    context.run = mocha.options.delay && common.runWithSuite(suite);

    // Parse arguments for describe and it
    var _parseArgs = function(args) {
      var testData = {};
      if (args.length < 2) {
        throw new Error('Not enough arguments passed.');
      }
      if (typeof args[0] !== 'string') {
        throw new Error('First argument must be a string.');
      }
      testData.title = args[0];
      if (args.length === 2) { // No metadata, describe(title, fn), or metadata as an object, describe(title, obj)
        if (typeof args[1] === 'object') {
          if (args[1].metadata && typeof args[1].metadata === 'object') {
            testData.metadata = args[1].metadata;
            if (args[1].tests && typeof args[1].tests === 'function') {
              testData.fn = args[1].tests;
            } else if (args[1].test && typeof args[1].test === 'function') {
              testData.fn = args[1].test;
            } else {
              throw new Error('If passing an object as the second parameter, it must be of the form { <object>, <function> }');
            }
          } else {
            throw new Error('If passing an object as the second parameter, it must be of the form { <object>, <function> }');
          }
        } else if (typeof args[1] === 'function') {
          testData.fn = args[1];
        } else {
          throw new Error('Incorrect usage. Parameters must be either "<string>, { <object>, <function> }" or "<string>, <function>"');
        }
      } else if (args.length === 3) { // Metadata as a param: describe(title, meta, fn)
        if (args[1] && typeof args[1] === 'object'
          && args[2] && typeof args[2] === 'function') {
          testData.metadata = args[1];
          testData.fn = args[2];
        } else {
          throw new Error('If passing three parameters, they must be of the form "<string>, <object>, <function>"');
        }
      } else if (args.length > 3) {
        throw new Error('Too many arguments passed.');
      }

      return testData;
    };

    // Helper function for suite creation
    var _create = function(opts) {
      var testData = _parseArgs(opts.args);

      // Creating the Suite object
      var newSuite = Suite.create(suites[0], testData.title);
      newSuite.pending = Boolean(opts.pending);
      newSuite.file = file;
      suites.unshift(newSuite);
      if (opts.isOnly) {
        newSuite.parent._onlySuites = newSuite.parent._onlySuites.concat(newSuite);
        mocha.options.hasOnly = true;
      }
      newSuite.metadata = testData.metadata || {};
      if (typeof testData.fn === 'function') {
        testData.fn.call(newSuite);
        suites.shift();
      } else if (typeof testData.fn === 'undefined' && !newSuite.pending) {
        throw new Error('Suite "' + newSuite.fullTitle() + '" was defined but no callback was supplied. Supply a callback or explicitly skip the suite.');
      }

      return newSuite;
    };

    /**
     * Describe a "suite" with the given `title`
     * and callback `fn` containing nested suites
     * and/or tests.
     */

    context.describe = context.context = function() {
      return _create({
        args: arguments
      });
    };

    /**
     * Pending describe.
     */

    context.xdescribe = context.xcontext = context.describe.skip = function(title, fn) {
      return _create({
        args: arguments,
        pending: true
      });
    };

    /**
     * Exclusive suite.
     */

    context.describe.only = function(title, fn) {
      return _create({
        args: arguments,
        isOnly: true
      });
    };

    /**
     * Describe a specification or test-case
     * with the given `title` and callback `fn`
     * acting as a thunk.
     */

    context.it = context.specify = function() {
      var testData = _parseArgs(arguments);

      var testSuite = suites[0];
      if (testSuite.isPending()) {
        testData.fn = null;
      }
      var test = new Test(testData.title, testData.fn);
      test.file = file;
      testSuite.addTest(test);
      test.metadata = testData.metadata || testSuite.metadata;
      return test;
    };

    /**
     * Exclusive test-case.
     */

    context.it.only = function(title, fn) {
      return common.test.only(mocha, context.it(title, fn));
    };

    /**
     * Pending test case.
     */

    context.xit = context.xspecify = context.it.skip = function(title) {
      context.it(title);
    };

    /**
     * Number of attempts to retry.
     */
    context.it.retries = function(n) {
      context.retries(n);
    };
  });
};
