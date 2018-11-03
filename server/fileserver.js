const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const fs = require('fs');
const sizeOf = require('image-size');
const request = require('request');
const { exec } = require('child_process');

const httpServer = http.createServer(app);

app.use('/',express.static(path.join(__dirname, '../public/files')));
app.use(express.json());
app.use('/', function(req, rs, next) {
  console.log(req.originalUrl);
  next();
})
var basePath;
if(process.env.NODE_ENV === "production") {
  basePath = '/media/pi';
}else {
  basePath = '/home/saii';
}

app.post('/upload', function(req, res) {
  for (var file of req.body.files){
    var actualPath = basePath;
    if (req.body.path) {
      actualPath = actualPath + '/' + req.body.path;
    }
    actualPath = actualPath + '/' +file.originalname;
    fs.rename(file.path, actualPath, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
  res.end();
});

app.get('/video/*', function(req, res) {
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
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize-1
    const chunksize = (end-start)+1;
    const file = fs.createReadStream(filePath, {start, end});
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

app.get('/getFile/*', function(req, res) {
  let filePath = basePath + decodeURI(req.url.substring(8));

  exec('file -b -i '+filePath, function(err, stdout, stderr){
    const parts = stdout.split(';');
    // res.setHeader('Content-Type', parts[0]);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.log(err);
      }
    });

  });

});

app.get('/get/*', function(req, res) {
  let filePath = basePath + decodeURI(req.url.substring(4));
  const pathStat = fs.statSync(filePath);

  if(pathStat.isFile()) {
    fs.access(filePath, fs.constants.R_OK, (err) => {
      if (err) {
        res.send('Insufficient Read permission');
      } else {
        exec('file -b -i '+filePath, function(err, stdout, stderr){
          const parts = stdout.split(';');
          var sendObj = {'mime': parts[0], 'encoding': parts[1].substring(1,parts[1].length-1)};
          if (parts[0].split('/')[0] === 'image') {
            const dim = sizeOf(filePath);
            sendObj.width = dim.width;
            sendObj.height = dim.height;
          }
          res.send(sendObj);
        });
        return;
      }
    });
  } else {
    fs.readdir(filePath, function(err, files) {
      if (err) {
        delete err.path;
        res.send(err);
      } else {
        var obj = [];

        for (var file of files) {

          if (file.substring(0,1) === '.') {
            if (req.headers.user === 'Anonymous') {
              continue;
            }
          }
          const stat = fs.statSync(filePath+'/'+file);
          obj.push({
            'name': file,
            'isFile': stat.isFile(),
            'size' : stat.size,
            'times' : {
              'birth' : stat.birthtime,
              'access' : stat.atime,
              'modify' : stat.mtime,
              'change' : stat.ctime
            },
            'userId' : stat.uid
          });
        };
        res.send(obj);
      }
    });
  }
});

app.get('/create/*', function(req, res) {
  let filePath = basePath + decodeURI(req.url.substring(4));

  fs.mkdir(filePath, (err) => {
    if (err) {
      res.send(err);
    } else {
      res.send("Success");
    }
  })
});

app.get('/explore', function(req, res) {
  res.sendFile(path.join(__dirname, '../public/files/explore.html'));
});

function registerSelf() {
  const postData = {
		path: 'files',
		ip: 'http://localhost:8030',
		name: 'files'
	}
	request.post('http://localhost:8000/register', {form: postData}, function(err, res, body) {
		if (res && res.statusCode && (res.statusCode === 200 || res.statusCode === 204)) {
			console.log("Successfully registered");
		} else {
			console.log("Will retry");
			setTimeout(registerSelf, 2000);
		}
	});
}

httpServer.listen(process.env.PORT || 8030, function() {
	registerSelf();
	console.log("Server started on port: "+httpServer.address().port);
});
