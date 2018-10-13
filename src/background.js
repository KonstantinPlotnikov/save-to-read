bookmarks.setBackgroundMode();

browser.pageAction.onClicked.addListener(toggleBookmark);
browser.tabs.onUpdated.addListener(onTabUpdated);
bookmarks.onBookmarksChanged.addListener(onBookmarkChanged);
bookmarks.onFolderChanged.addListener(onFolderChanged);

onFolderChanged();

// --------------------------------------------------------------------------
// FUNCTIONS

function checkTab(tab) {
    let validator = new RegExp('^(http:\/\/|https:\/\/|ftp:\/\/)');
    if (!validator.test(tab.url)) {
        browser.pageAction.hide(tab.id);
        return false;
    }
    return true;
}

function toggleBookmark(tab) {
    if (!checkTab(tab)) {
        return;
    }
    bookmarks.exists(tab.url)
        .then((bookmarkExist) => {
            if (bookmarkExist)
                bookmarks.removeByUrl(tab.url);
            else
                bookmarks.add(tab.title, tab.url);
        });
}

function setPageAction(tabId, bookmarkExist) {
    var pa = browser.pageAction;
    pa.setTitle({ tabId: tabId, title:  (bookmarkExist ? tr("page.remove_bookmark") : tr("page.add_bookmark")) });
    pa.setIcon({ tabId: tabId, path: (bookmarkExist ? "icons/remove.png" : "icons/add.png") });
    pa.show(tabId);
}

function updateTab(tab) {
    if (!checkTab(tab)) {
        return;
    }
    bookmarks.exists(tab.url)
        .then((bookmarkExist) => {
            setPageAction(tab.id, bookmarkExist);
        })
        .catch((error) => {
            browser.pageAction.hide(tab.id);
            console.error("failed to check tab existance: " + error);
        })
}

function onTabUpdated(tabId, changeInfo, tab) {
    updateTab(tab);
}

function onBookmarkChanged(details) {
    browser.tabs.query({})
        .then((tabs) => {
            for (let tab of tabs) {
                if (!checkTab(tab)) {
                    continue;
                }
                if (tab.url == details.url) {
                    updateTab(tab);
                }
            }
        });
}

function onFolderChanged() {
    Promise.all([ bookmarks.list(), browser.tabs.query({}) ])
        .then((results) => {
            let bookmarks = results[0];
            let tabs = results[1];
            let urls = new Set();
            bookmarks.forEach((bookmark) => {
                urls.add(bookmark.url);
            })
            tabs.forEach((tab) => {
                if (!checkTab(tab)) {
                    return;
                }
                setPageAction(tab.id, urls.has(tab.url));
            })
        })
}
