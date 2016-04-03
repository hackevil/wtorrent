'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _middleware = require('./middleware');

var _webtorrent = require('webtorrent');

var _webtorrent2 = _interopRequireDefault(_webtorrent);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _jade = require('jade');

var _jade2 = _interopRequireDefault(_jade);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _express2.default)();
var PORT = process.env.PORT || 9000;
var client = new _webtorrent2.default();

var DOWNLOAD_PATH = __dirname + '/downloads/';

app.use(_bodyParser2.default.json()); // for parsing application/json
app.use(_bodyParser2.default.urlencoded({ extended: false })); // for parsing application/x-www-form-urlencoded
app.use(_express2.default.static(__dirname + '/public'));
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');

function download(link, cb) {

  client.add(link, function (torrent) {
    var message = 'Client is downloading: ' + torrent.infoHash;
    console.log(message);
    cb(message);

    torrent.on('download', function (chunkSize) {
      console.log('chunk size: ' + chunkSize);
      console.log('total downloaded: ' + torrent.downloaded);
      console.log('download speed: ' + torrent.downloadSpeed);
      console.log('progress: ' + torrent.progress);
      console.log('======');
    });

    torrent.on('done', function () {
      console.log('torrent finished downloading');

      torrent.files.forEach(function (file) {
        console.log('  downloaded:  ' + file.name);
        file.getBuffer(function callback(err, buffer) {
          var path = DOWNLOAD_PATH + file.name;

          _fs2.default.writeFile(path, buffer, function () {
            console.log('  file saved:  ' + file.name);
          });
        });
      });
    });
  });
}

function getFileNames(path, cb) {
  _fs2.default.readdir(path, function (err, files) {
    if (err) throw err;

    // filter out the .keep file from the list
    var filteredFiles = files.filter(function (file) {
      if (file != '.keep') return file;
    });

    cb(filteredFiles);
  });
}

app.get('/', function (req, res) {
  res.render('index');
});

// POST /torrent
app.post('/torrent', _middleware.logger, function (req, res) {
  var torrent = req.body.torrent;

  download(torrent, function (response) {
    res.render('index', { response: response });
  });
});

// GET /file
app.get('/file', _middleware.logger, function (req, res) {
  var files = getFileNames(DOWNLOAD_PATH, function (files) {
    res.render('index', { files: files });
  });
});

// GET /file/:name
app.get('/file/:name', _middleware.logger, function (req, res, next) {
  var name = req.params.name;


  var options = {
    root: __dirname + '/downloads/',
    dotfiles: 'deny',
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true
    }
  };

  res.sendFile(name, options, function (err) {
    if (err) {
      console.log(err);
      res.status(err.status).end();
    } else {
      console.log('Sent:', name);
    }
  });
});

// DELETE /file/:name
app.delete('/file/:name', _middleware.logger, function (req, res) {
  var name = req.params.name;

  var path = DOWNLOAD_PATH + name;
  _fs2.default.unlink(path, function (err) {
    if (err) throw err;
    console.log('Successfully deleted ' + name);
    res.status(200).send('Successfully deleted ' + name);
  });
});

// Handle 404
app.use(function (req, res, next) {
  res.status(404).send('Sorry can\'t find that!');
});

// Handle errors
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, function () {
  console.log('Listening on port ' + PORT + '...');
});