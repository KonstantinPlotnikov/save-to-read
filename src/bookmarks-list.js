bookmarks.onFolderChanged.addListener(onFolderChanged);
bookmarks.onBookmarksChanged.addListener(onBookmarksChanged);
options.sort.by.onChanged.addListener(onSortingChanged);
options.sort.ascending.onChanged.addListener(onSortingChanged);
options.view.mode.onChanged.addListener(onViewModeChanged);
document.querySelector('body').oncontextmenu = () => { return false; };

const REMOVE_DELAY = 3000;
let idsToRemove = {};
let compactMode = true;
let sort = { byTitle : false, order: 1 };

// create the grid passing in the div to use together with the columns & data we want to use
let tableElement = document.getElementById('s2r');
let tableOptions = {
    renderer: renderRow,
    getKey: (data) => { return data.id; },
    compare: compareBookmarks
}
let table = new Table(tableElement, tableOptions);

onFolderChanged();
onSortingChanged();
onViewModeChanged();

// --------------------------------------------------------------------------
// FUNCTIONS

function compareBookmarks(b1, b2)
{
    let title = b1.title.localeCompare(b2.title);
    let age = b2.dateAdded - b1.dateAdded;
    if (sort.byTitle) {
        return (title == 0) ? age : (title * sort.order);
    }
    else {
        return (age == 0) ? title : (age * sort.order)
    }
}

function onSortingChanged() {
    Promise.all([options.sort.by.get(),
                 options.sort.ascending.get()])
        .then((results) => {
            sort.byTitle = results[0] == 'title';
            sort.order = results[1] ? 1 : -1;
            table.sort();
        })
}

function onFolderChanged() {
    bookmarks.list()
        .then((bookmarks) => {
            idsToRemove = {};
            table.clear();
            table.addRows(bookmarks);
        })
}

function onViewModeChanged()
{
    options.view.mode.get()
        .then((mode) => {
            switch (mode) {
                case 'compact':
                    compactMode = true;
                    tableElement.classList.remove('full-mode');
                    tableElement.classList.add('compact-mode')
                    break;
                case 'full':
                default:
                    compactMode = false;
                    tableElement.classList.remove('compact-mode');
                    tableElement.classList.add('full-mode')
                    break;
            }
        })
}

function onBookmarksChanged(details) {
    if (details.exists) {
        if (!!idsToRemove[details.id]) delete idsToRemove[details.id]; // just in case
        table.addRows([details]);
    }
    else {
        if (!!idsToRemove[details.id]) delete idsToRemove[details.id]; // just in case
        let transaction = { remove: [] };
        table.removeRow(details.id);
    }
}

function removeBookmarks()
{
    let now = new Date().getTime();
    for (let id in idsToRemove) {
        if (now - idsToRemove[id] > REMOVE_DELAY/*milliseconds*/) {
            bookmarks.removeById(id);
            delete idsToRemove[id];
        }
    }
}

// --------------------------------------------------------------------------
// RENDERER


let newRow = (() => {
    let templateContainer = document.getElementById('row-template');
    let template = templateContainer.content.children[0];
    return () => {
        return template.cloneNode(true);
    };
})();

function renderRow(data) {
    let ui = newRow();
    let title = ui.querySelector('.title-label');
    let url = ui.querySelector('.url-label');
    let age = ui.querySelector('.age-label');
    let remover = ui.querySelector('.remove-btn');
    let restorer = ui.querySelector('.restore-btn');

    let openLink = function (event) {
        switch (event.button) {
            case 0: // left
                browser.tabs.query({active: true, currentWindow: true})
                    .then((tabs) => {
                        let tab = tabs[0];
                        browser.tabs.update(tab.id, { url: data.url });
                    });
                break;
            case 1: // middle
                browser.tabs.create({ url: data.url });
                break;
            case 2: // right
                event.preventDefault();
                event.stopImmediatePropagation();
                break;
            default:
                console.error('unknown mouse event');
                break;
        }
    };

    let updateMode = function () {
        if (data.id in idsToRemove) {
            ui.classList.remove('remove-mode');
            ui.classList.add('restore-mode');
        }
        else {
            ui.classList.add('remove-mode');
            ui.classList.remove('restore-mode');
        }
    }

    let toggleState = function () {
        if (data.id in idsToRemove) {
            delete idsToRemove[data.id];
        }
        else {
            let now = new Date().getTime();
            idsToRemove[data.id] = now;
            setTimeout(removeBookmarks, REMOVE_DELAY + 100/*milliseconds*/);
        }
        updateMode();
    };

    this.getUi = function () {
        return ui;
    }

    this.update = function () {
        let dateAdded = data.dateAdded;
        let now = new Date().getTime();
        let days = Math.round((now -  dateAdded) / 86400000); //86400000 - number of milliseconds in the twenty-four hours
        let daysString = (days == 0) ? "today" : (days + " days");

        title.textContent = data.title;
        url.textContent = data.url;
        age.textContent = daysString;
        remover.textContent = tr('bookmark.remove');
        restorer.textContent = tr('bookmark.restore');

        updateMode();
    }

    this.destroy = function () {
        title.removeEventListener('click', openLink);
        title.removeEventListener('auxclick', openLink);
        url.removeEventListener('click', openLink);
        url.removeEventListener('auxclick', openLink);
        remover.removeEventListener('click', toggleState);
        restorer.removeEventListener('click', toggleState);
    }

    title.addEventListener('click', openLink);
    title.addEventListener('auxclick', openLink);
    url.addEventListener('click', openLink);
    url.addEventListener('auxclick', openLink);
    remover.addEventListener('click', toggleState);
    restorer.addEventListener('click', toggleState);

    this.update();
}


// function renderTitle () {}
//
// renderTitle.prototype.init = function(params) {
//     this.gui = document.createElement('div');
//     this.gui.innerHTML = '<div class="title-label"></div><div class="url-label"></div>';
//
//     this.title = this.gui.querySelector('.title-label');
//     this.url = this.gui.querySelector('.url-label');
//
//     this.gui.style.width = '100%';
//
//     this.refresh(params);
//
//     this.eventListener = (event) => {
//         switch (event.button) {
//             case 0: // left
//                 browser.tabs.query({active: true, currentWindow: true})
//                     .then((tabs) => {
//                         let tab = tabs[0];
//                         browser.tabs.update(tab.id, { url: params.node.data.url });
//                     });
//                 break;
//             case 1: // middle
//                 browser.tabs.create({ url: params.node.data.url }).catch((err)=>{console.error(err);});
//                 break;
//             case 2: // right
//                 event.preventDefault();
//                 event.stopImmediatePropagation();
//                 break;
//             default:
//                 console.error('unknown mouse event');
//                 break;
//         }
//     };
//     this.gui.addEventListener('click', this.eventListener);
//     this.gui.addEventListener('auxclick', this.eventListener);
//     this.gui.addEventListener('mouseenter', ()=>{
//         console.log('pe');
//         window.status = "string";
//         console.log('ep');
//     });
// };
//
// renderTitle.prototype.getGui = function() {
//     return this.gui;
// };
//
// renderTitle.prototype.refresh = function(params) {
//     this.title.innerHTML = params.node.data.title;
//     this.url.innerHTML = params.node.data.url;
//     return true;
// };
//
// renderTitle.prototype.destroy = function() {
//     this.gui.removeEventListener('click', this.eventListener);
//     this.gui.removeEventListener('auxclick', this.eventListener);
// };
//
// function renderAge () {}
//
// renderAge.prototype.init = function(params) {
//     this.gui = document.createElement('div');
//     this.gui.innerHTML = '<div class="age-label"></div><img class="remove-btn" src="/icons/remove.png"></img><img class="restore-btn" src="/icons/add.png"></img>';
//
//     this.gui.classList.add('remove-restore');
//     this.age = this.gui.querySelector('.age-label');
//     this.remover = this.gui.querySelector('.remove-btn');
//     this.restorer = this.gui.querySelector('.restore-btn');
//     // this.clicker = this.gui.querySelector('.remove-restore');
//
//     this.remover.innerHTML = tr('bookmark.remove');
//     this.restorer.innerHTML = tr('bookmark.restore');
//
//     this.refresh(params);
//
//     this.eventListener = () => {
//         if (params.node.data.id in idsToRemove) {
//             delete idsToRemove[params.node.data.id];
//         }
//         else {
//             let now = new Date().getTime();
//             idsToRemove[params.node.data.id] = now;
//             setTimeout(removeBookmarks, REMOVE_DELAY + 100/*milliseconds*/);
//         }
//         this.refresh(params);
//     };
//     this.gui.addEventListener('click', this.eventListener);
// };
//
// renderAge.prototype.getGui = function() {
//     return this.gui;
// };
//
// renderAge.prototype.refresh = function(params) {
//     let dateAdded = params.value;
//     let now = new Date().getTime();
//     let days = Math.round((now -  dateAdded) / 86400000); //86400000 - number of milliseconds in the twenty-four hours
//     let daysString = (days == 0) ? "today" : (days + " days");
//     this.age.innerHTML = daysString;
//     if (params.node.data.id in idsToRemove) {
//         this.gui.classList.remove('remove-mode');
//         this.gui.classList.add('restore-mode');
//     }
//     else {
//         this.gui.classList.add('remove-mode');
//         this.gui.classList.remove('restore-mode');
//     }
//     return true;
// };
//
// renderAge.prototype.destroy = function() {
//     this.gui.removeEventListener('click', this.eventListener);
// };
