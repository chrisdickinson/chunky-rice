var Chunk = require('./lib/chunk')
  , Decoder = require('./lib/decode')
  , Encoder = require('./lib/encode')


module.exports = {
  decode: function() { return new Decoder }
, encode: function() { return new Encoder }
, chunk: make_chunk
, text: text
}

function make_chunk(type, data) {
  return new Chunk(new Buffer(type).readUInt32BE(0), new Buffer(data))
}


function text(key, data) {
  var keylen = Math.min(79, Buffer.byteLength(key))
    , buffer = new Buffer(keylen + 1 + Buffer.byteLength(data))

  buffer.write(key, 0, keylen)
  buffer[keylen] = 0
  buffer.write(data, keylen + 1)

  return make_chunk('tEXt', buffer)
}

