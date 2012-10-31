module.exports = Decoder

var Stream = require('stream').Stream
  , Buffer = require('buffer').Buffer

var Chunk = require('./chunk')

var INT_BUFFER = new Buffer(4)

function Decoder() {
  Stream.call(this)
  this.init()
}

var cons = Decoder
  , proto = cons.prototype = new Stream

proto.constructor = cons

proto.init = function() {
  this.removeAllListeners()

  this.writable = 
  this.readable = true

  this.reading =
  this.offset = 0

  this.next =
  this.buffer = null

  this.paused = false

  this.queued = []

  this.take(8)
      .then(this.start)

}

proto.take = function(amount) {
  var self = this

  self.reading = amount
  self.offset = 0

  self.buffer = amount === 4 ? INT_BUFFER : new Buffer(amount)

  return {then: function(fn) {
    self.next = fn
  }}
}

proto.start = function() {
  var self = this
    , length
    , type
    , data

  self.emit('data', Chunk.Magic)
  self.take(4)
      .then(enter_chunk_length)

  function enter_chunk_length() {
    len = self.buffer.readUInt32BE(0)

    self.take(4)
        .then(enter_chunk_type)
  }

  function enter_chunk_type() {
    type = self.buffer.readUInt32BE(0)

    self.take(len)
        .then(enter_chunk_data)
  }

  function enter_chunk_data() {
    data = self.buffer

    self.take(4)
        .then(enter_chunk_crc)
  }

  function enter_chunk_crc() {
    var crc = self.buffer.readUInt32BE(0)
      , chunk = new Chunk(type, data, crc, len, self)

    self.paused ?
      self.queued.push(chunk) :
      self.emit('data', chunk)

    self.take(4)
        .then(enter_chunk_length) 
  }
}

proto.write = function(chunk) {
  if(chunk.length >= this.reading) {
    var reading = this.reading

    chunk.copy(this.buffer, this.offset, 0, this.reading)
    this.next()

    return this.write(chunk.slice(reading))
  }

  chunk.copy(this.buffer, this.offset)
  this.offset += chunk.length
  this.reading -= chunk.length

  return !this.paused
}

proto.pause = function() {
  this.paused = true
}

proto.resume = function() {
  this.paused = false
  while(this.queued.length && !this.paused) {
    this.emit('data', this.queued.shift())
  }

  if(this.paused)
    return

  this.emit('drain')
}

proto.end = function(data) {
  if(arguments.length > 0) {
    this.write(data)
  }
  this.emit('end')
  this.init()
}
