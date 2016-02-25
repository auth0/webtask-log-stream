var JSONStream = require('json-stream').JSONStream;
var Request = require('request-stream');
var Util = require('util');


module.exports = createStream;


function createStream(url, options) {
    if (!options) options = {};
    
    var stream = new LogStream(options);
    var req = Request.get(url, onResponse);
    
    req.once('socket', function () {
        stream.emit('open');
    });
    
    return stream;
    
    
    function onResponse(err, res) {
        if (err) {
            stream.emit('error', err);
            
            return;
        }
        
        res.pipe(stream);
    }
}

function LogStream(options) {
    if (!options) options = {};
    
    JSONStream.call(this, options);
}

Util.inherits(LogStream, JSONStream);

LogStream.prototype.destroy = function () {
    this.emit('close');
    this.unpipe();
    this.abort();
};