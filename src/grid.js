bookmarks.onFolderChanged.addListener(onFolderChanged);
bookmarks.onBookmarksChanged.addListener(onBookmarksChanged);
options.sort.by.onChanged.addListener(onSortingChanged);
options.sort.ascending.onChanged.addListener(onSortingChanged);
options.view.mode.onChanged.addListener(onViewModeChanged);
window.addEventListener('resize', onResize);
document.querySelector('body').oncontextmenu = () => { return false; };

const REMOVE_DELAY = 3000;
let idsToRemove = {};
let compactMode = true;

let columnDefs = [
    {
        headerName: "Title",
        field: "title",
        cellRenderer: renderTitle
    },
    {
        headerName: "Added",
        field: "dateAdded",
        cellRenderer: renderAge,
        width: 60,
        suppressSizeToFit: true
    }
];
// specify the data
let rowData = [];
// let the grid know which columns and what data to use
let gridOptions = {
    columnDefs: columnDefs,
    rowData: rowData,

    headerHeight: 0,
    suppressRowClickSelection: true,
    suppressCellSelection: true,
    enableSorting: true,
    animateRows: true
};

// create the grid passing in the div to use together with the columns & data we want to use
let gridElement = document.querySelector('#s2r');
new agGrid.Grid(gridElement, gridOptions);

onFolderChanged();
onSortingChanged();
onViewModeChanged();

// --------------------------------------------------------------------------
// FUNCTIONS

function onResize() {
    gridOptions.api.sizeColumnsToFit();
}

function onSortingChanged() {
    Promise.all([options.sort.by.get(),
                 options.sort.ascending.get()])
        .then((results) => {
            let by = results[0];
            let order = results[1];
            if (by === 'title') {
                gridOptions.api.setSortModel([ { colId: 'title', sort: (results[1] ? 'asc' : 'desc') },
                                               { colId: 'dateAdded', sort: 'desc' } ]);
            }
            else {
                gridOptions.api.setSortModel([ { colId: 'dateAdded', sort: (results[1] ? 'desc' : 'asc') },
                                               { colId: 'title', sort: 'asc' } ]);
            }
        })
}

function onFolderChanged() {
    bookmarks.list()
        .then((bookmarks) => {
            idsToRemove = {};
            gridOptions.api.setRowData(bookmarks);
            onResize();
        })
}

function onViewModeChanged()
{
    options.view.mode.get()
        .then((mode) => {
            switch (mode) {
                case 'compact':
                    compactMode = true;
                    gridOptions.rowHeight = 28;
                    gridElement.classList.remove('full-mode');
                    gridElement.classList.add('compact-mode')
                    break;
                case 'full':
                default:
                    compactMode = false;
                    gridOptions.rowHeight = 44;
                    gridElement.classList.remove('compact-mode');
                    gridElement.classList.add('full-mode')
                    break;
            }
            gridOptions.api.resetRowHeights();
            gridOptions.api.refreshCells({ force: true });
        })
}

function onBookmarksChanged(details) {
    if (details.exists) {
        if (!!idsToRemove[details.id]) delete idsToRemove[details.id]; // just in case
        gridOptions.api.updateRowData({ add: [details] });
        onResize();
    }
    else {
        if (!!idsToRemove[details.id]) delete idsToRemove[details.id]; // just in case
        let transaction = { remove: [] };
        gridOptions.api.forEachNode((node, nodeId) => {
            if (node.data.id == details.id) {
                transaction.remove[nodeId] = node.data;
            }
        })
        gridOptions.api.updateRowData(transaction);
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

function renderTitle () {}

renderTitle.prototype.init = function(params) {
    this.gui = document.createElement('div');
    this.gui.innerHTML = '<div class="title-label"></div><div class="url-label"></div>';

    this.title = this.gui.querySelector('.title-label');
    this.url = this.gui.querySelector('.url-label');

    this.gui.style.width = '100%';

    this.refresh(params);

    this.eventListener = (event) => {
        switch (event.button) {
            case 0: // left
                browser.tabs.query({active: true, currentWindow: true})
                    .then((tabs) => {
                        let tab = tabs[0];
                        browser.tabs.update(tab.id, { url: params.node.data.url });
                    });
                break;
            case 1: // middle
                browser.tabs.create({ url: params.node.data.url }).catch((err)=>{console.error(err);});
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
    this.gui.addEventListener('click', this.eventListener);
    this.gui.addEventListener('auxclick', this.eventListener);
};

renderTitle.prototype.getGui = function() {
    return this.gui;
};

renderTitle.prototype.refresh = function(params) {
    this.title.innerHTML = params.node.data.title;
    this.url.innerHTML = params.node.data.url;
    return true;
};

renderTitle.prototype.destroy = function() {
    this.gui.removeEventListener('click', this.eventListener);
    this.gui.removeEventListener('auxclick', this.eventListener);
};

function renderAge () {}

renderAge.prototype.init = function(params) {
    this.gui = document.createElement('div');
    this.gui.innerHTML = '<div class="age-label"></div><img class="remove-btn" src="/icons/remove.png"></img><img class="restore-btn" src="/icons/add.png"></img>';

    this.gui.classList.add('remove-restore');
    this.age = this.gui.querySelector('.age-label');
    this.remover = this.gui.querySelector('.remove-btn');
    this.restorer = this.gui.querySelector('.restore-btn');
    // this.clicker = this.gui.querySelector('.remove-restore');

    this.remover.innerHTML = tr('bookmark.remove');
    this.restorer.innerHTML = tr('bookmark.restore');

    this.refresh(params);

    this.eventListener = () => {
        if (params.node.data.id in idsToRemove) {
            delete idsToRemove[params.node.data.id];
        }
        else {
            let now = new Date().getTime();
            idsToRemove[params.node.data.id] = now;
            setTimeout(removeBookmarks, REMOVE_DELAY + 100/*milliseconds*/);
        }
        this.refresh(params);
    };
    this.gui.addEventListener('click', this.eventListener);
};

renderAge.prototype.getGui = function() {
    return this.gui;
};

renderAge.prototype.refresh = function(params) {
    let dateAdded = params.value;
    let now = new Date().getTime();
    let days = Math.round((now -  dateAdded) / 86400000); //86400000 - number of milliseconds in the twenty-four hours
    let daysString = (days == 0) ? "today" : (days + " days");
    this.age.innerHTML = daysString;
    if (params.node.data.id in idsToRemove) {
        this.gui.classList.remove('remove-mode');
        this.gui.classList.add('restore-mode');
    }
    else {
        this.gui.classList.add('remove-mode');
        this.gui.classList.remove('restore-mode');
    }
    return true;
};

renderAge.prototype.destroy = function() {
    this.gui.removeEventListener('click', this.eventListener);
};
