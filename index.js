/**
 * @author xialeistduio<1065890063@qq.com>
 * @date 16-12-16
 */
var EventEmitter = require('events').EventEmitter;
var io = require('socket.io-client');
var debug = require('debug')('pomelo:client');

/**
 * 消息
 * @param id
 * @param route
 * @param body
 * @constructor
 */
var Message = function(id, route, body) {
  this.id = id;
  this.route = route;
  this.body = body;
};
var HEADER = 5;
var Protocol = {};
/**
 *
 * @param byteArray
 * @param start
 * @param end
 * @return {string}
 */
var bt2Str = function(byteArray, start, end) {
  var result = "";
  for (var i = start; i < byteArray.length && i < end; i++) {
    result = result + String.fromCharCode(byteArray[i]);
  }
  return result;
};

/**
 *
 *pomele client encode
 * id message id;
 * route message route
 * msg message body
 * socketio current support string
 *
 */
Protocol.encode = function(id, route, msg) {
  var msgStr = JSON.stringify(msg);
  if (route.length > 255) {
    throw new Error('route maxlength is overflow');
  }
  var byteArray = new Uint16Array(HEADER + route.length + msgStr.length);
  var index = 0;
  byteArray[index++] = (id >> 24) & 0xFF;
  byteArray[index++] = (id >> 16) & 0xFF;
  byteArray[index++] = (id >> 8) & 0xFF;
  byteArray[index++] = id & 0xFF;
  byteArray[index++] = route.length & 0xFF;
  for (var i = 0; i < route.length; i++) {
    byteArray[index++] = route.charCodeAt(i);
  }
  for (var i = 0; i < msgStr.length; i++) {
    byteArray[index++] = msgStr.charCodeAt(i);
  }
  return bt2Str(byteArray, 0, byteArray.length);
};

/**
 *
 *client decode
 *msg String data
 *return Message Object
 */
Protocol.decode = function(msg) {
  var idx, len = msg.length, arr = new Array(len);
  for (idx = 0; idx < len; ++idx) {
    arr[idx] = msg.charCodeAt(idx);
  }
  var index = 0;
  var buf = new Uint16Array(arr);
  var id = ((buf[index++] << 24) | (buf[index++]) << 16 | (buf[index++]) << 8 | buf[index++]) >>> 0;
  var routeLen = buf[HEADER - 1];
  var route = bt2Str(buf, HEADER, routeLen + HEADER);
  var body = bt2Str(buf, routeLen + HEADER, buf.length);
  return new Message(id, route, body);
};

if (typeof Object.create !== 'function') {
  Object.create = function(o) {
    function F() {
    }

    F.prototype = o;
    return new F();
  };
}

var pomelo = Object.create(EventEmitter.prototype);
var socket = null;
var id = 1;
var callbacks = {};
/**
 * 初始化链接
 * @param params
 * @param callback
 */
pomelo.init = function(params, callback) {
  pomelo.params = params;
  if (params.log) {
    process.env.DEBUG = 'pomelo:client';
  }
  var host = params.host;
  var port = params.port;

  var url = 'ws://' + host;
  if (port) {
    url += ':' + port;
  }

  socket = io.connect(url, {'force new connection': true, reconnect: false});

  socket.on('connect', function() {
    debug('connected');
    callback && callback(socket);
  });

  socket.on('reconnect', function() {
    debug('reconnect');
  });

  socket.on('message', function(data){
    if(typeof data === 'string') {
      data = JSON.parse(data);
    }
    if(data instanceof Array) {
      processMessageBatch(pomelo, data);
    } else {
      processMessage(pomelo, data);
    }
  });

  socket.on('error', function(err) {
    debug(err);
  });

  socket.on('disconnect', function(reason) {
    pomelo.emit('disconnect', reason);
  });
};

pomelo.disconnect = function() {
  if(socket) {
    socket.disconnect();
    socket = null;
  }
};

pomelo.request = function(route) {
  if(!route) {
    return;
  }
  var msg = {};
  var cb;
  arguments = Array.prototype.slice.apply(arguments);
  if(arguments.length === 2){
    if(typeof arguments[1] === 'function'){
      cb = arguments[1];
    }else if(typeof arguments[1] === 'object'){
      msg = arguments[1];
    }
  }else if(arguments.length === 3){
    msg = arguments[1];
    cb = arguments[2];
  }
  msg = filter(msg,route);
  id++;
  callbacks[id] = cb;
  var sg = Protocol.encode(id,route,msg);
  socket.send(sg);
};

pomelo.notify = function(route,msg) {
  this.request(route, msg);
};

var processMessage = function(pomelo, msg) {
  if(msg.id) {
    //if have a id then find the callback function with the request
    var cb = callbacks[msg.id];

    delete callbacks[msg.id];
    if(typeof cb !== 'function') {
      debug('[pomeloclient.processMessage] cb is not a function for request ' + msg.id);
      return;
    }

    cb(msg.body);
    return;
  }

  // server push message or old format message
  processCall(msg);

  //if no id then it should be a server push message
  function processCall(msg) {
    var route = msg.route;
    if(!!route) {
      if (!!msg.body) {
        var body = msg.body.body;
        if (!body) {body = msg.body;}
        pomelo.emit(route, body);
      } else {
        pomelo.emit(route,msg);
      }
    } else {
      pomelo.emit(msg.body.route,msg.body);
    }
  }
};

var processMessageBatch = function(pomelo, msgs) {
  for(var i=0, l=msgs.length; i<l; i++) {
    processMessage(pomelo, msgs[i]);
  }
};

function filter(msg,route){
  if(route.indexOf('area.') === 0){
    msg.areaId = pomelo.areaId;
  }

  msg.timestamp = Date.now();
  return msg;
}

module.exports = pomelo;