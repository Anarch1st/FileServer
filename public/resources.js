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

  return {
    urls: {
      GET_BASE_FILE_URL: './get',
      GET_FILE_UPLOAD_URL: './upload',

      // GET_VIDEO_FILE: '/files/video',
      GET_FILE: './getFile',
      NEW_FOLDER: './create/'
    },
    parseResponse: parseResponse,
    getPathFromRoute: getPathFromRoute,
    constants: {
      CLICK: {
        key: 'Click',
        val: 'click'
      },
      DOWNLOAD: {
        key: 'Download',
        val: 'download'
      },
      DOWNLOAD_FOLDER: {
        key: 'Download as Zip',
        val: 'download_as_zip'
      },
      NEW_FOLDER: {
        key: 'Create Folder',
        val: 'create_folder'
      },
      DELETE: {
        key: 'Delete',
        val: 'delete'
      }
    }
  }
})();