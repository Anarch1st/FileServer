import {
  PolymerElement
} from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-ajax/iron-ajax.js';
import '@polymer/paper-button/paper-button.js';
import moment from 'moment';
import * as HTML from './html-utils.js';


export class FileList extends PolymerElement {
  constructor() {
    super();
    this.boundHashLocationListener = this._hashLocationChanged.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('hashchange', this.boundHashLocationListener);

    if (location.hash && location.hash.length >= 0) {
      let hashUrl = location.hash.substring(1, location.hash.length);
      let rout = hashUrl.split('/');

      if (rout[1] && rout[1].length >= 0) {
        this.set('route', rout.slice(1, rout.length));
      }
      this._hashLocationChanged();
    } else {
      location.hash = '/';
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('hashchange', this.boundHashLocationListener);
  }

  static get template() {
    return HTML.getTemplate();
  }

  static get properties() {
    return {
      _resources: {
        type: Object,
        value: Resources
      },
      fileList: {
        type: Array,
        observer: '_fileListUpdated'
      },
      selectedFile: {
        type: Object,
        value: {
          'isFile': false
        },
        observer: '_fileSelected'
      },
      route: {
        type: Array
      },
      videoTags: {
        type: Array,
        value: ['video/mp4', 'video/webm', 'video/ogg']
      }
    }
  }

  static get observers() {
    return [
      '_routeChanged(route.splices)'
    ]
  }

  _fileSelected() {
    if (this.selectedFile && this.selectedFile.name) {
      if (this.route) {
        this.push('route', this.selectedFile.name);
      } else {
        this.set('route', [this.selectedFile.name]);
      }
    }
  }

  _routeChanged() {
    location.hash = this._resources.getPathFromRoute(this.route);
  }

  _hashLocationChanged() {
    let xhr = null;
    if (this.selectedFile && this.selectedFile.isFile) {
      xhr = this.$.file;
    } else {
      xhr = this.$.fileList;
    }

    let url = location.hash.substring(1, location.hash.length);
    console.log(url);
    this.$.uploadPath.value = url;
    xhr.url = this._resources.urls.GET_BASE_FILE_URL + url;

    HTML.showSpinner(this.$.outerDiv);
    xhr.generateRequest();
  }

  _fileListUpdated() {
    const sizeFunc = (size) => {
      var ret = size;
      if (ret > 1000000000) {
        ret = (ret / 1073741824).toFixed(2) + ' gb';
      } else if (ret > 1000000) {
        ret = (ret / 1048576).toFixed(2) + ' mb';
      } else if (ret > 1000) {
        ret = (ret / 1024).toFixed(2) + ' kb';
      } else {
        ret = ret + ' b';
      }
      return ret;
    }

    const timeFunc = (time) => {
      return moment(time).format('Do MMM YY');
    }

    HTML.showFileList(this.$.outerDiv, this.fileList, function(obj, action) {
      if (action === this._resources.constants.CLICK.key) {
        this.set('selectedFile', obj)
      }
      // else if (action === this._resources.constants.DOWNLOAD) {
      console.log(`${obj.name} ${action}`);
      // } else if (action === this._resources.constants.CREATE_FOLDER) {
      //   console.log(`${obj.name} ${action}`);
      // } else if (action === this._resources.constants.DELETE) {
      //   console.log(`${obj.name} ${action}`);
      // }
    }.bind(this), sizeFunc, timeFunc);
  }


  handleFilesList(data) {
    this.set('fileList', this._resources.parseResponse(data.detail.response));
  }

  handleError(err) {
    console.log(err);
  }

  handleFile(data) {
    const info = data.detail.response;
    console.log(info.mime);
    var outerDiv = this.$.outerDiv;

    if (data === null || data.mime === null || data.mime === false) {
      console.log('invalid');
      return;
    }

    const url = this._resources.urls.GET_FILE + this._resources.getPathFromRoute(this.route);

    HTML.showFile(this.$.outerDiv, info, url, this.videoTags.includes(info.mime));
  }
}
customElements.define('file-list', FileList)