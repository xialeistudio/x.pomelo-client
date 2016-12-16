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
      port: 3014
    }, function() {
      done();
    });
  });
  it('request', function(done) {
    pomelo.request('gate.gateHandler.queryEntry', 'hello pomelo', function(data) {
      should(data.code).be.exactly(0);
      done();
    });
  });
  it('notify', function() {
    pomelo.notify('gate.gateHandler.queryEntry', 'hello pomelo');
  });
});