import {
  html
} from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-spinner/paper-spinner.js'
import '@polymer/app-route/app-location.js'

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
      color: #FCF8DE;
      background-color: #00303C;
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
      align-items: center;
      justify-content: space-around;
      min-height: 40px;
      margin-top: 10px;
    }
    h1 {
      text-align: center;
      margin-bottom: 0;
    }
    #backButton {
      background: url('./images/back_black.png') no-repeat center center;
      margin-right: 40px;
    }
    #forwardButton {
      background: url('./images/forward_black.png') no-repeat center center;
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
    .menu {
      width: 150px;
      box-shadow: 3px 3px 5px #888888;
      border-style: solid;
      border-width: 1px;
      border-color: grey;
      border-radius: 2px;
      padding-left: 5px;
      padding-right: 5px;
      padding-top: 3px;
      padding-bottom: 3px;
      position: fixed;
      background: white;
      z-index: 100;
      display: none;
    }
    .menu-item {
      height: 20px;
      color: black;
    }
    .menu-item:hover {
      background-color: #6CB5FF;
      cursor: pointer;
    }
    embed {
      background-color: #EEEEEE;
    }
  </style>

  <div id="body">
  <app-location route="{{route}}" use-hash-as-path></app-location>

  <div id="header">
    <form id="uploadForm" action="/files/upload" method="post" enctype="multipart/form-data">
      <input id="uploadPath" type="hidden" name="path">
      <input type="file" name="files" multiple>
      <input type="submit" value="Upload">
    </form>
  </div>

  <div id="seperator"></div>

  <div id='outerDiv'></div>

  <iron-ajax id="file"
      on-response="handleFile"
      on-error="handleError">
      </iron-ajax>

  <a id="fileDownload">
      `;
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
    callback(obj, Resources.constants.CLICK.key);
  });

  addContextMenu(row, obj, callback);
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

let menuDisplayed = false;
let displayedContextMenu = null;

function addContextMenu(elem, obj, callback) {
  let contextMenu = _createContextMenuFor(obj, callback);
  elem.append(contextMenu);

  elem.addEventListener("contextmenu", function() {
    arguments[0].preventDefault();

    if (menuDisplayed) {
      displayedContextMenu.style.display = 'none';
      menuDisplayed = false;
    }

    let left = arguments[0].clientX;
    let top = arguments[0].clientY;

    contextMenu.style.left = left + "px";
    contextMenu.style.top = top + "px";
    contextMenu.style.display = "block";

    menuDisplayed = true;
    displayedContextMenu = contextMenu;
  }, false);

  document.addEventListener("click", function() {
    if (menuDisplayed == true) {
      displayedContextMenu.style.display = "none";
    }
  }, true);
}

function _createContextMenuFor(obj, callback) {
  let menu = document.createElement('div');
  menu.classList.add('menu');

  if (obj.isFile) {
    let download = _createElementWithText('div', Resources.constants.DOWNLOAD.text);
    download.classList.add('menu-item');
    download.addEventListener('click', e => {
      e.stopPropagation();
      callback(obj, Resources.constants.DOWNLOAD.key)
    });
    menu.append(download);
  } else {
    let download = _createElementWithText('div', Resources.constants.DOWNLOAD_FOLDER.text);
    download.classList.add('menu-item');
    download.addEventListener('click', e => {
      e.stopPropagation();
      callback(obj, Resources.constants.DOWNLOAD_FOLDER.key)
    });
    menu.append(download);
  }

  let folder = _createElementWithText('div', Resources.constants.NEW_FOLDER.text);
  folder.classList.add('menu-item');
  folder.addEventListener('click', e => {
    e.stopPropagation();
    callback(obj, Resources.constants.NEW_FOLDER.val)
  });
  menu.append(folder);

  if (obj.isFile) {
    let del = _createElementWithText('div', Resources.constants.DELETE.text);
    del.classList.add('menu-item');
    del.addEventListener('click', e => {
      e.stopPropagation();
      callback(obj, Resources.constants.DELETE.val)
    });
    menu.append(del);
  }

  return menu;
}
export {
  getTemplate,
  showFileList,
  showFile,
  showSpinner
};