module.exports = Encoder

var Stream = require('stream').Stream

function Encoder() {
  Stream.call(this)

  this.writable = 
  this.readable = true

  this.paused = false

  this.state = null
}

var cons = Encoder
  , proto = cons.prototype = new Stream

proto.constructor = cons

proto.write = function(chunk) {
  this.emit('data', chunk.buffer())

  return !paused
}

proto.pause = function() {
  this.paused = true
}

proto.resume = function() {
  this.paused = false
  this.emit('drain')
}

proto.end = function(data) {
  if(arguments.length > 0) {
    this.write(data)
  }
  this.emit('end')
}
