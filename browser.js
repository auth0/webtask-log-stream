/* eslint-env browser */

'use strict';

var Stream = require('stream');

class WebtaskLogStream extends Stream.Readable {
    constructor(url, opts) {
        if (!opts) opts = {};

        super({ objectMode: true });

        this._destroyed = false;
        this._eventSource = new EventSource(url);
        this._opened = false;
        this._timeout = opts.timeout;
        this._timeoutTimer = null;

        this._eventSource.onerror = this._onError.bind(this);
        this._eventSource.onmessage = this._onMessage.bind(this);
        this._eventSource.onopen = this._onOpen.bind(this);
        this._eventSource.addEventListener('ping', this._onPing.bind(this));

        this._resetTimeout();
    }

    destroy() {
        this._destroyed = true;
        this._eventSource.close();

        if (this._timeoutTimer) clearTimeout(this._timeoutTimer);

        this.emit('close');
    }

    _onError() {
        this._destroyed = true;
        this._eventSource.close();

        if (this._timeoutTimer) clearTimeout(this._timeoutTimer);

        if (this.listeners('error').length) {
            const error =
                this._eventSource.readyState === 0
                    ? new Error('Connection lost')
                    : new Error('Connection error');
            this.emit('error', error);
        }
    }

    _onMessage(e) {
        this._resetTimeout();

        const msg = decode(e.data);
        if (typeof msg !== 'undefined') this.push(msg);
    }

    _onOpen() {
        this._resetTimeout();
        this.emit('open');
    }

    _onPing() {
        this._resetTimeout();
    }

    _onTimeout() {
        this._destroyed = true;
        this._eventSource.close();

        if (this.listeners('error').length) {
            const msg = this._opened
                ? 'Connectivity timed out after ' +
                  this._timeout +
                  'ms inactivity'
                : 'Connection timed out after ' + this._timeout + 'ms';
            const error = new Error(msg);
            error.code = 'E_TIMEDOUT';

            this.emit('error', error);
        }
    }

    _resetTimeout() {
        if (!this._timeout) {
            return;
        }

        if (this._timeoutTimer) {
            clearTimeout(this._timeoutTimer);
        }

        this._timeoutTimer = setTimeout(
            this._onTimeout.bind(this),
            this._timeout
        );
    }
}

module.exports = function createStream(url, opts) {
    return new WebtaskLogStream(url, opts);
};

function decode(data) {
    try {
        return JSON.parse(data);
    } catch (err) {
        return undefined;
    }
}
