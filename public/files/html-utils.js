import {
  html
} from '../files/assets/@polymer/polymer/polymer-element.js';
import '../files/assets/@polymer/paper-spinner/paper-spinner.js'

function getTemplate() {
  return html `
  <style>
    .file {
      color: blue;
    }
    .dir {
      color: red;
    }
    #outerDiv {
      flex: 1;
      width: 99%;
      margin-top: 10px;
      margin-bottom: 10px;
      text-align: center;
      border: 1px solid grey;
      border-radius: 5px;
    }
    @keyframes rowanim {
      0% {background: #ffff00}
      25% {background: #00ff99}
      50% {background: #6699ff}
      75% {background: #ff6699}
      100% {background: #ffff00}
    }
    .list {
      width: 100%;
      table-layout: fixed;
    }
    .list tr:nth-child(odd) {
      background: #EEEEEE;
    }
    .list tr:nth-child(even) {
      background: white;
    }
    .list tr:hover {
      animation: rowanim 12s linear 0s infinite normal;
      color: black;
    }
    .list th {
      color: white;
      background-color: black;
    }
    .list td {
      overflow: hidden;
    }
    #header {
      text-align: center;
      width: 80%;
      display: flex;
      align-items: flex-start;
      justify-content: space-around;
      min-height: 40px;
    }
    h1 {
      text-align: center;
      margin-bottom: 0;
    }
    #backButton {
      background: url('../files/images/back_black.png') no-repeat center center;
      margin-right: 40px;
    }
    #forwardButton {
      background: url('../files/images/forward_black.png') no-repeat center center;
      margin-left: 40px;
      visibility: hidden;
    }
    #seperator {
      border-bottom: 2px solid black;
      width: 80%;
      margin-top: 10px;
      margin-bottom: 5px;
    }
    #body {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
    embed {
      background-color: #EEEEEE;
    }
  </style>

  <h1 id="headingText"></h1>

  <div id="body">
  <div id="header">
    <form id="uploadForm" action="/files/upload" method="post" enctype="multipart/form-data">
      <input id="uploadPath" type="hidden" name="path">
      <input type="file" name="files" multiple>
      <input type="submit" value="Upload">
    </form>
    <div id="buttons">
      <paper-button id="backButton"></paper-button>
      <paper-button id="forwardButton"></paper-button>
    </div>
    <div></div>
  </div>

  <div id="seperator"></div>

  <div id='outerDiv'></div>
</div>


  <iron-ajax id="fileList"
      on-response="handleFilesList"
      on-error="handleError">
      </iron-ajax>
  <iron-ajax id="file"
      on-response="handleFile"
      on-error="handleError">
      </iron-ajax>`;
}

function showFileList(element, fileList, callback, sizeFormatter, timeFormatter) {

  element.innerHTML = "";

  let table = document.createElement('table');
  table.classList.add('list');

  var col = document.createElement('col');
  col.setAttribute('width', '50%');
  table.append(col);

  col = document.createElement('col');
  col.setAttribute('width', '25%');
  table.append(col);

  col = document.createElement('col');
  col.setAttribute('width', '25%');
  table.append(col);

  table.append(_getRowHeader());
  for (var val of fileList) {
    table.append(_getHTMLElement(val, callback, sizeFormatter, timeFormatter));
  }

  element.append(table);
}

function _getRowHeader() {
  let headerRow = document.createElement('tr');

  headerRow.append(_createElementWithText('th', 'Name'));
  headerRow.append(_createElementWithText('th', 'Size'));
  headerRow.append(_createElementWithText('th', 'Modified'));

  return headerRow;
}

function _getHTMLElement(obj, callback, sizeFormatter, timeFormatter) {

  let row = document.createElement('tr');

  row.append(_createElementWithText('td', obj.name));
  row.append(_createElementWithText('td', sizeFormatter(obj.size)));
  row.append(_createElementWithText('td', timeFormatter(obj.times.modify)));

  row.classList.add(obj.isFile ? 'file' : 'dir');

  row.addEventListener('click', e => {
    callback(obj);
  });
  return row;
}

function _createElementWithText(ele, text) {
  let temp = document.createElement(ele);
  let t = document.createTextNode(text);
  temp.append(t);

  return temp;
}

function showFile(element, info, url, isVideo) {

  element.innerHTML = '';

  if (isVideo) {
    var src = document.createElement('source');
    src.setAttribute('src', url);
    src.setAttribute('type', info.mime);

    var player = document.createElement('video');
    player.setAttribute('controls', 'controls');
    player.append(src);

    element.append(player);
  } else {
    var embed = document.createElement('embed');
    embed.setAttribute('src', url);
    embed.setAttribute('width', info.width || (element.offsetWidth - 10));
    console.log(element.offsetWidth);
    embed.setAttribute('height', info.height || window.innerHeight - 60);
    element.append(embed);
  }
}

function showSpinner(element) {
  if (!element) {
    return;
  }

  element.innerHTML = "";

  let spinner = document.createElement('paper-spinner');
  spinner.setAttribute('active', true);
  spinner.style.margin = "10px";

  element.append(spinner);
}

export {
  getTemplate,
  showFileList,
  showFile,
  showSpinner
};