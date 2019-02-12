const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');
const request = require('request');
const archiver = require('archiver');
const multer = require('multer');
const util = require('util');
const debug = require('debug')('file-server');
const {
  exec
} = require('child_process');

const httpServer = http.createServer(app);

let basePath;
let tempPath;

if (process.env.NODE_ENV === 'production') {
  app.use('/', express.static(path.join(__dirname, '../public/build/default')));
  basePath = '/media/pi';
  tempPath = '/media/pi/PartA/temp';
} else {
  app.use('/', express.static(path.join(__dirname, '../public/build/dev')));
  basePath = '/home/saii';
  tempPath = '/home/saii/temp';
}

app.use(express.json());

let storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let filePath = basePath + req.body.path;
    debug('Upload file location %s', filePath);
    cb(null, filePath)
  },
  filename: function (req, file, cb) {
    debug('Upload file %s', file.originalname);
    cb(null, file.originalname);
  }
});

let upload = multer({
  storage: storage
});

app.post('/upload', upload.array('files'), function (req, res) {
  debug('Files uploaded');
  res.redirect('./#' + req.body.path);
  res.end();
});

app.get('/video/*', function (req, res) {
  let filePath = basePath + decodeURI(req.url.substring(6));
  debug('Video file path: %s', filePath);

  var stat;
  try {
    stat = fs.statSync(filePath);
  } catch (e) {
    console.log(e);
  }
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ?
      parseInt(parts[1], 10) :
      fileSize - 1
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, {
      start,
      end
    });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    debug('headers: %O', head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    }
    debug('headers: %O', head);
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

app.get('/getFile/*', function (req, res) {
  let filePath = basePath + decodeURI(req.url.substring(8));

  debug('Get file stat: %s', filePath);
  exec('file -b -i ' + filePath, function (err, stdout, stderr) {
    const parts = stdout.split(';');
    // res.setHeader('Content-Type', parts[0]);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.log(err);
      }
    });

  });

});

app.get('/get/*', function (req, res) {
  let filePath = basePath + decodeURI(req.url.substring(4));
  const pathStat = fs.lstatSync(filePath);

  debug('Get file: %s', filePath);
  if (pathStat.isSymbolicLink()) {
    debug('%s symbolicLink', filePath);
    res.send({
      type: 'link',
      data: pathStat
    });
  } else if (pathStat.isFile()) {
    debug('%s file', filePath);
    fs.access(filePath, fs.constants.R_OK, (err) => {
      if (err) {
        res.send('Insufficient Read permission');
      } else {
        exec('file -b -i "' + filePath + '"', function (err, stdout, stderr) {
          const parts = stdout.split(';');

          let sendObj = {
            'mime': parts[0],
            'encoding': parts[1].substring(1, parts[1].length - 1)
          };
          if (parts[0].split('/')[0] === 'image') {
            const dim = sizeOf(filePath);
            sendObj.width = dim.width;
            sendObj.height = dim.height;
          }
          debug('%s stats %o', filePath, sendObj);
          res.send({
            type: 'file',
            data: sendObj
          });
        });
        return;
      }
    });
  } else {
    fs.readdir(filePath, function (err, files) {
      debug('%s folder', filePath);
      if (err) {
        delete err.path;
        res.send(err);
      } else {
        let obj = [];

        // Async all lstat operations
        let lstat = util.promisify(fs.lstat);

        let promiseArray = files
          // Add only if not hidden file or has valid user header
          .filter(file => ((req.headers.user && req.headers.user !== 'false') || file.substring(0, 1) !== '.'))
          .map(async (file) => {
            let stat = await lstat(filePath + '/' + file);
            return {
              'name': file,
              'isFile': stat.isFile(),
              'isLink': stat.isSymbolicLink(),
              'size': stat.size,
              'times': {
                'birth': stat.birthtime,
                'access': stat.atime,
                'modify': stat.mtime,
                'change': stat.ctime
              },
              'userId': stat.uid
            }
          })
          .map(promise => {
            // Dont let a single lstat call fail the whole. Hence wrap then in another promise
            // which catches the error
            return promise.catch(err => err);
          });

        Promise.all(promiseArray).then(arrObj => {
          let validResults = arrObj.filter(obj => !(obj instanceof Error));
          res.send({
            type: 'folder',
            data: validResults
          });

          arrObj.filter(obj => (obj instanceof Error)).forEach(err => debug('Error lstating: %o', err))
        });
      }
    });
  }
});

app.get('/create/*', function (req, res) {
  let filePath = basePath + decodeURI(req.url.substring(4));

  debug('New folder');
  fs.mkdir(filePath, (err) => {
    if (err) {
      res.send(err);
    } else {
      res.send("Success");
    }
  })
});

app.get('/download/*', (req, res) => {
  let filePath = basePath + decodeURI(req.url.substring(9));
  const pathStat = fs.lstatSync(filePath);

  debug('Download %s', filePath);
  if (pathStat.isSymbolicLink()) {
    res.send('Not yet supported');
  } else if (pathStat.isFile()) {
    res.download(filePath);
  } else {
    let folderName = filePath.split('/').pop();
    let tempFilePath = `${tempPath}/${folderName}.tar.gzip`
    let output = fs.createWriteStream(tempFilePath);
    let archive = archiver('tar', {
      gzip: true,
      gzipOptions: {
        level: 9
      }
    });

    output.on('close', function () {
      console.log(archive.pointer() + ' total bytes');
      res.download(tempFilePath, (err) => {
        if (err) {
          console.error(err);
        }
        fs.unlink(tempFilePath, (err) => {
          if (err) {
            console.error(err);
          }
        })
      });
    });

    archive.on('warning', function (err) {
      console.log(err);
    });

    // good practice to catch this error explicitly
    archive.on('error', function (err) {
      console.error(err);
    });
    archive.pipe(output);
    archive.directory(filePath, folderName);
    archive.finalize();
  }
})

app.get('/', function (req, res) {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, '../public/build/default/explore.html'));
  } else {
    res.sendFile(path.join(__dirname, '../public/build/dev/explore.html'));
  }
});

httpServer.listen(process.env.PORT || 8030, function () {
  console.log("Server started on port: " + httpServer.address().port);
});