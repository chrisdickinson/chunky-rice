# chunky-rice
### A streaming PNG chunk decoder / encoder

```javascript

var rice = require('./index')
  , decoder = rice.decode()
  , encoder = rice.encode()

// read a PNG and output a new PNG with metadata
fs.createReadStream('in.png')
  .pipe(decoder)
    .on('data', function(chunk) {
      if(chunk.type() !== 'IEND') {
        return
      }

      // emit a "tEXt" chunk containing metadata
      // before IEND
      decoder.emit('data', rice.text('key', JSON.stringify({
        'hello': 'world'
      })))
    })
  .pipe(encoder)
  .pipe(fs.createWriteStream('out.png'))

```

`chunky-rice` is a module that provides a decoder that takes
binary data and outputs `Chunk` objects (allowing you to manipulate
a PNG on the fly); as well as a encoder that takes these `Chunk` objects
and turns them back into a binary stream.

Both the encoder and decoder are [through](https://github.com/dominictarr/stream-spec#through-sync-writable-and-readable-aka-filter) streams.

`chunky-rice` provides porcelin methods for generating your own chunks,
and also, loves you unconditionally.

---

## API

### rice = require('chunky-rice')

Returns the `rice` module.

### rice.decode() -> Decoder instance

Creates a binary-to-Chunk through stream. Pausable and resumable.

### rice.encode() -> Encoder instance

Creates a Chunk-to-binary through stream. Pausable and resumable.

### rice.chunk(string type, Buffer data) -> Chunk

Creates a Chunk of the provided type with the provided data. CRC and length data is
not necessary -- `data` should only contain the chunk data!

### rice.text(string key, string value) -> Chunk

Creates a [tEXt chunk](http://www.w3.org/TR/PNG-Chunks.html#C.tEXt) with a key of `key`
and a value of `value`.

### Chunk#type() -> string

Returns the string representation of the chunk type.

### Chunk#key() -> string or null

If the chunk is a `tEXt` chunk, returns the key data.

Otherwise returns `null`.

### Chunk#value() -> Buffer or null

If the chunk is a `tEXt` chunk, returns the value data.

Otherwise returns `null`.

### Chunk#crc() -> integer

Cached. If not pre-computed, recomputes the CRC of the provided data and type and writes
it to the Chunk's backing store.

### Chunk#buffer() -> buffer

Cached. Returns the buffer representing the full data of the chunk (to include the 4 byte
length, 4 byte type, data segment, and 4 byte CRC).

### Chunk#modify(function(ready))

Modify an in-flight chunk -- only available on chunks sent via decoder `data` events.

Automatically calls `decoder.pause()` on its source stream, and `decoder.resume()` once
the ready callback has been called.

```javascript
    var zlib = require('zlib')

    fs.createReadStream('thing.png')
      .pipe(rice.decoder())
        .on('data', function(chunk) {
          if(chunk.type() !== 'IDAT')
            return

          chunk.modify(function(ready) {
            zlib.inflate(chunk.data, function(err, data) {
              if(err) return ready(err)

              data[0] = 1000
              zlib.deflate(data, function(err, data) {
                if(err) return ready(err)

                // ready accepts (error, Buffer data)
                ready(null, data)            
              })
            })    
          })
        })
    .pipe(rice.encoder())
    .pipe(fs.createWriteStream('thing_out.png'))

```


---------

## License

MIT.

 
