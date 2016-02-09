var Request = require('request-stream');
var Stream = require('stream');
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
    
    Stream.Transform.call(this, { readableObjectMode: true });
}

Util.inherits(LogStream, Stream.Transform);

LogStream.prototype._transform = function (chunk, encoding, cb) {
    try {
        var json = JSON.parse(chunk.toString('utf8'));
        
        cb(null, json);
    } catch (e) {
        cb(e);
    }
};

LogStream.prototype.destroy = function () {
    this.emit('close');
    this.unpipe();
    this.abort();
};