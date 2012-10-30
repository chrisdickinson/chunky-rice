var assert = require('assert')
  , spawn = require('child_process').spawn
  , fs = require('fs')
  , Path = require('path')

var input_path = Path.resolve(Path.join(__dirname, 'test.png'))
  , output_path = Path.resolve(Path.join(__dirname, 'out.png'))
  , output_path_2 = Path.resolve(Path.join(__dirname, 'out_2.png'))

function setup() {
  try {
    fs.unlinkSync(output_path)
    fs.unlinkSync(output_path_2)
  } catch(e) {
  }
}

function verify(ready, expected) {
  expected = expected || 0
  var pngcheck = spawn('pngcheck', [output_path])
      .on('exit', function(code) {
        assert.equal(code, expected)
        ready()
      })

  if(false) {
    pngcheck.stdout.pipe(process.stdout)
    pngcheck.stderr.pipe(process.stderr)
  }
}

var rice = require('../index')
  , out = function(x) { return process.stdout.write(x) }

var tests = [
  test_passthrough
, test_addtext
, test_modify
, test_modify_fails
]

run()

function run() {
  if(!tests.length)
    return process.stdout.write('\n')

  var test = tests.shift()
    , now = Date.now()

  setup()

  out(test.name+' - ')
  test(function() {
    out(''+(Date.now() - now)+'ms\n')
    run()
  })
}

// integration tests.

function test_passthrough(ready) {
  var encoder = rice.encode()
    , decoder = rice.decode()

  fs.createReadStream(input_path)
    .pipe(decoder)
    .pipe(encoder)
    .pipe(fs.createWriteStream(output_path))
    .on('close', function() {
      assert.deepEqual(fs.readFileSync(input_path), fs.readFileSync(output_path))
      verify(ready)
    })
}

function test_addtext(ready) {
  var encoder = rice.encode()
    , decoder = rice.decode()

  fs.createReadStream(input_path)
    .pipe(decoder)
      .on('data', function(chunk) {
        if(chunk.type() !== 'IEND')
          return

        decoder.emit('data', rice.text('hello', 'world'))
      })
    .pipe(encoder)
    .pipe(fs.createWriteStream(output_path))
    .on('close', function() {
      var hit = false

      fs.createReadStream(output_path)
        .pipe(decoder)
        .on('data', function(chunk) {
          if(chunk.type() !== 'tEXt')
            return

          hit = true

          assert.equal(chunk.key(), 'hello')
          assert.equal(chunk.value().toString('utf8'), 'world')
        })
        .on('end', function() {
          assert.ok(hit)
          verify(ready)
        })

    })
}

function test_modify(ready) {
  var encoder = rice.encode()
    , decoder = rice.decode()
    , hit = false

  fs.createReadStream(input_path)
    .pipe(decoder)
      .on('data', function(chunk) {
        if(chunk.type() !== 'IEND')
          return

        decoder.emit('data', rice.text('hello', 'world'))
      })
    .pipe(encoder)
    .pipe(fs.createWriteStream(output_path))
    .on('close', modify_text)

  function modify_text() {
    encoder = rice.encode()
    decoder = rice.decode()

    fs.createReadStream(output_path)
      .pipe(decoder)
        .on('data', function(chunk) {
          if(chunk.type() !== 'tEXt')
            return

          hit = true
          chunk.modify(function(ready) {
            return ready(null, new Buffer("hello\x00guys")) 
          })
        })
      .pipe(encoder)
      .pipe(fs.createWriteStream(output_path_2))
      .on('close', assert_modification)
  }

  function assert_modification() {
    hit = false
    encoder = rice.encode()
    decoder = rice.decode()

    fs.createReadStream(output_path_2)
      .pipe(decoder)
      .on('data', function(chunk) {
        if(chunk.type() !== 'tEXt')
          return

        hit = true

        assert.equal(chunk.key(), 'hello')
        assert.equal(chunk.value().toString('utf8'), 'guys')
      })
      .on('end', function() {
        assert.ok(hit)
        verify(ready)
      })
  }
}

function test_modify_fails(ready) {
  assert.throws(function() {
    rice.chunk('anyy', 'asdfasdf').modify(function() {
      // noop
      assert.fail('shouldn\'t ever execute')
    })
  })
  ready()
}
