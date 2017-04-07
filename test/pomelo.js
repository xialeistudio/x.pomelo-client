/**
 * @author xialeistduio<1065890063@qq.com>
 * @date 16-12-16
 */
'use strict';
require('mocha');
var pomelo = require('../index');
var should = require('should');


describe('pomelo', function() {
  it('connect', function(done) {
    pomelo.init({
      host: '127.0.0.1',
      port: 3010
    }, function() {
      done();
    });
  });
  it('request', function(done) {
    pomelo.request("connector.entryHandler.entry", "hello pomelo", function(data) {
      should(data.code).be.exactly(200);
      done();
    });
  });
  it('notify', function() {
    pomelo.notify('connector.entryHandler.entry', 'hello pomelo');
  });
});