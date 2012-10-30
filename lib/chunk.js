module.exports = Chunk

var crc32 = require('../vendor/crc32')

function Chunk(type, data, crc, length) {
  this._type = type
  this.data = data
  this.length = length || data.length
  this._crc = crc
  this._backing_store = null
}

var cons = Chunk
  , proto = cons.prototype

proto.crc = function() {
  var buf = this._buffer()

  this._crc = this._crc || crc32(buf.slice(4, buf.length - 4))

  this._backing_store.writeUInt32BE(this._crc, this.data.length + 8)
  return this._crc
}

proto._buffer = function() {
  if(this._backing_store) {
    return this._backing_store
  }

  var buffer = new Buffer(this.data.length + 12)

  buffer.writeUInt32BE(this.data.length, 0)
  buffer.writeUInt32BE(this._type, 4)

  this.data.copy(buffer, 8)

  return this._backing_store = buffer
}

proto.buffer = function() {
  this._buffer()
  this.crc()

  return this._backing_store
}

proto.type = function() {
  return  String.fromCharCode((this._type >> 24) & 0xFF) +
          String.fromCharCode((this._type >> 16) & 0xFF) +
          String.fromCharCode((this._type >> 8) & 0xFF) +
          String.fromCharCode((this._type) & 0xFF)
}

proto.key = function() {
  if(this.type() !== 'tEXt')
    return null

  for(var i = 0, len = this.data.length; i < len; ++i) {
    if(!this.data[i])
      break
  }

  return this.data.slice(0, i).toString('utf8')
}

proto.value = function() {
  if(this.type() !== 'tEXt')
    return null

  for(var i = 0, len = this.data.length; i < len; ++i) {
    if(!this.data[i])
      break
  }

  return this.data.slice(i+1)
}

Chunk.Magic = new Chunk(null, '')
Chunk.Magic.human_type = function() { return 'PNG Magic' }
Chunk.Magic._backing_store = new Buffer([137, 80, 78, 71, 13, 10, 26, 10])
Chunk.Magic.buffer = function() {
  return this._backing_store
}

