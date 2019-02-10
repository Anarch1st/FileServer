const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');
const request = require('request');
const archiver = require('archiver');
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

app.post('/upload', function (req, res) {
  for (var file of req.body.files) {
    var actualPath = basePath;
    if (req.body.path) {
      actualPath = actualPath + req.body.path;
    }
    actualPath = actualPath + '/' + file.originalname;
    fs.rename(file.path, actualPath, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
  res.end();
});

app.get('/video/*', function (req, res) {
  let filePath = basePath + decodeURI(req.url.substring(6));

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
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

app.get('/getFile/*', function (req, res) {
  let filePath = basePath + decodeURI(req.url.substring(8));

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

  if (pathStat.isSymbolicLink()) {
    res.send({
      type: 'link',
      data: pathStat
    });
  } else if (pathStat.isFile()) {
    fs.access(filePath, fs.constants.R_OK, (err) => {
      if (err) {
        res.send('Insufficient Read permission');
      } else {
        exec('file -b -i "' + filePath + '"', function (err, stdout, stderr) {
          const parts = stdout.split(';');
          console.log(parts);
          var sendObj = {
            'mime': parts[0],
            'encoding': parts[1].substring(1, parts[1].length - 1)
          };
          if (parts[0].split('/')[0] === 'image') {
            const dim = sizeOf(filePath);
            sendObj.width = dim.width;
            sendObj.height = dim.height;
          }
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
      if (err) {
        delete err.path;
        res.send(err);
      } else {
        var obj = [];

        for (var file of files) {

          if (file.substring(0, 1) === '.') {
            continue;
          }
          const stat = fs.lstatSync(filePath + '/' + file);

          // console.log(stat);
          obj.push({
            'name': file,
            'isFile': stat.isFile(),
            'size': stat.size,
            'times': {
              'birth': stat.birthtime,
              'access': stat.atime,
              'modify': stat.mtime,
              'change': stat.ctime
            },
            'userId': stat.uid
          });
        };
        res.send({
          type: 'folder',
          data: obj
        });
      }
    });
  }
});

app.get('/create/*', function (req, res) {
  let filePath = basePath + decodeURI(req.url.substring(4));

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