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
        observer: '_fileSelected'
      },
      route: {
        type: Object,
        observer: '_routeChanged'
      },
      videoTags: {
        type: Array,
        value: ['video/mp4', 'video/webm', 'video/ogg']
      }
    }
  }

  _fileSelected() {
    if (this.selectedFile && this.selectedFile.name) {
      let newURL = (this.route.path.length > 1) ? `#${this.route.path}/${this.selectedFile.name}` : `#/${this.selectedFile.name}`
      history.pushState({}, this.selectedFile.name, newURL);
      window.dispatchEvent(new CustomEvent('location-changed'));
    }
  }

  _routeChanged() {
    if (this.route.path.length > 0) {
      let xhr = this.$.file;

      let url = this.route.path;
      console.log(url);
      this.$.uploadPath.value = url;
      xhr.url = this._resources.urls.GET_BASE_FILE_URL + url;

      HTML.showSpinner(this.$.outerDiv);
      xhr.generateRequest();
    } else {
      history.pushState({}, '/', '#/');
      window.dispatchEvent(new CustomEvent('location-changed'));
    }
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
      } else if (action === this._resources.constants.DOWNLOAD.key ||
        action === this._resources.constants.DOWNLOAD_FOLDER.key) {
        let downloader = this.$.fileDownload;
        downloader.href = this._resources.urls.GET_FILE_DOWNLOAD_URL + this.route.path + '/' + encodeURI(obj.name);
        downloader.download = obj.name;
        downloader.click();
      } else {
        console.log(`${obj.name} ${action}`);
      }
    }.bind(this), sizeFunc, timeFunc);
  }

  handleError(err) {
    console.log(err);
  }

  handleFile(data) {
    let response = data.detail.response;
    if (!response) {
      console.log('No response');
      return;
    }

    switch (response.type) {
      case 'file':
        const info = response.data;
        const url = this._resources.urls.GET_FILE + this.route.path;
        HTML.showFile(this.$.outerDiv, info, url, this.videoTags.includes(info.mime));
        break;

      case 'folder':
        this.set('fileList', this._resources.parseResponse(response.data));
        break;

      case 'link':
        console.log('Link not yet supported');
        break;
      default:
        console.log(`Unsupported ${response.type}`);
    }
  }
}
customElements.define('file-list', FileList)