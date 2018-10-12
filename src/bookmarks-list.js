let tableElement = document.getElementById('s2r');
let filterElement = document.getElementById('filter');

bookmarks.onFolderChanged.addListener(onFolderChanged);
bookmarks.onBookmarksChanged.addListener(onBookmarksChanged);
options.sort.by.onChanged.addListener(onSortingChanged);
options.sort.ascending.onChanged.addListener(onSortingChanged);
options.view.mode.onChanged.addListener(onViewModeChanged);
document.body.oncontextmenu = () => { return false; };
filterElement.addEventListener('input', onFilterChange);

const REMOVE_DELAY = 3000;
let idsToRemove = {};
let compactMode = true;
let sort = { byTitle : false, order: 1 };
let filterString = '';

let tableOptions = {
    renderer: renderRow,
    getKey: (data) => { return data.id; },
    compare: compareBookmarks,
    filter: filterBookmarks
}
let table = new Table(tableElement, tableOptions);

filterElement.placeholder = tr('list.filter');

onFolderChanged();
onSortingChanged();
onViewModeChanged();

// --------------------------------------------------------------------------
// FUNCTIONS

function compareBookmarks(data1, data2)
{
    let title = data1.title.localeCompare(data2.title);
    let age = data2.dateAdded - data1.dateAdded;
    if (sort.byTitle) {
        return (title == 0) ? age : (title * sort.order);
    }
    else {
        return (age == 0) ? title : (age * sort.order)
    }
}

function filterBookmarks(data) {
    if (filterString.length === 0) {
        return true;
    }
    return data.title.toLowerCase().includes(filterString) || data.url.toLowerCase().includes(filterString);
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

function onFilterChange (event) {
    filterString = filterElement.value.toLowerCase();
    table.filter();
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
