var Request = require('request-stream');
var Stream = require('stream');
var Util = require('util');


module.exports = createStream;


function createStream(url, options) {
    if (!options) options = {};
    
    
    
    var stream = new LogStream(options);
    var req = Request.get(url, {
        headers: {
            'Accept': 'text/event-stream',
        },
    },onResponse);
    
    req.once('close', function () {
        stream.emit('error', new Error('Connection closed'));
        stream.destroy();
    });
    
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
    
    this._buffer;
    this._event;
    
    Stream.Transform.call(this, { readableObjectMode: true });
}

Util.inherits(LogStream, Stream.Transform);

LogStream.prototype._flush = function (cb) {
    if (this._event) this.push(this._event);
    
    return cb();
};

LogStream.prototype._transform = function(chunk, encoding, cb) {
    if (!Buffer.isBuffer(chunk)) {
        chunk = new Buffer(chunk);
    }
    if (this._buffer) {
        chunk = Buffer.concat([this._buffer, chunk]);
    }

    var ptr = 0;
    var start = 0;
    
    for (ptr = 0; ptr < chunk.length; ptr++) {
        if (chunk[ptr] === 10) {
            var line = chunk.slice(start, ptr).toString('utf8');
            var matches = line.match(/^([^:]*):(.*)$/);
            
            if (matches) {
                if (!this._event) {
                    this._event = { event: 'data', };
                }
                
                if (matches[1]) {
                    this._event[matches[1]] = matches[2];
                }
            } else {
                console.error('Line failed to match', line);
            }
            
            if (ptr < chunk.length - 1 && chunk[ptr + 1] === 10) {
                if (this._event.event === 'data') {
                    try {
                        this.push(JSON.parse(this._event.data));
                    } catch (__) { }
                }
                
                this._event = null;
                
                ptr++;
            }
            
            start = ptr + 1;
        }
    }
    
    this._buffer = chunk.slice(start);
    
    return cb();
};

LogStream.prototype.destroy = function () {
    this.emit('close');
    this.unpipe();
};