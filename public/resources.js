let Resources = (function() {

  class FileObject {
    constructor(params) {
      this.name = params.name;
      this.isFile = params.isFile;
      this.size = params.size;
      this.times = params.times;
      this.userId = params.userId;
    }
  }

  function parseResponse(data) {
    let fileObjs = [];
    data.forEach((item) => {
      fileObjs.push(new FileObject(item));
    })
    return fileObjs;
  }

  function getPathFromRoute(route) {
    let path = '/';
    if (route && route.length > 0) {
      for (let r of route) {
        path += r + '/'
      }
      path = path.substring(0, path.length - 1);
    }

    return path;
  }

  function getRouteFromPath(path) {
    let r = path.split('/');
    let route = []

    if (r[1] && r[1].length >= 0) {
      route = r.slice(1, r.length);
    }

    return route;
  }

  return {
    urls: {
      GET_BASE_FILE_URL: './get',
      GET_FILE_UPLOAD_URL: './upload',
      GET_FILE_DOWNLOAD_URL: './download',

      // GET_VIDEO_FILE: '/files/video',
      GET_FILE: './getFile',
      NEW_FOLDER: './create/'
    },
    parseResponse: parseResponse,
    getPathFromRoute: getPathFromRoute,
    getRouteFromPath: getRouteFromPath,
    constants: {
      CLICK: {
        text: 'Click',
        key: 'click'
      },
      DOWNLOAD: {
        text: 'Download',
        key: 'download'
      },
      DOWNLOAD_FOLDER: {
        text: 'Download as Zip',
        key: 'download_as_zip'
      },
      NEW_FOLDER: {
        text: 'Create Folder',
        key: 'create_folder'
      },
      DELETE: {
        text: 'Delete',
        key: 'delete'
      }
    }
  }
})();