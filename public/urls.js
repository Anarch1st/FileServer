let URLs = (function() {

  function parseResponse(data) {
    return data;
  }

  function getUrlFromRoute(route) {
    if (route && route.length > 0) {
      var url = "";

      for (var path of route) {
        url += path + '/'
      }

      return url.substring(0, url.length-1);
    } else {
      return "";
    }
  }
  return {
    urls: {
      GET_BASE_FILE_URL: '/files/get/',
      GET_FILE_UPLOAD_URL: '/files/upload',

      // GET_VIDEO_FILE: '/files/video',
      GET_FILE: '/files/getFile/',
      NEW_FOLDER: '/files/create/'
    },
    parseResponse: parseResponse,
    getUrlFromRoute: getUrlFromRoute
  }
})();
