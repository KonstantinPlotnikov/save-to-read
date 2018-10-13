var bookmarks = new (function() {
    this.onBookmarksChanged = new Signal();
    this.onFolderChanged = new Signal();
    this.onDelayRemoveChanged = new Signal();
    let delayRemoveList = new Map();
    let isBackgroundMode = false;
    const REMOVE_DELAY = 3000;

    this.setBackgroundMode = function() {
        isBackgroundMode = true;

        let selectFolder = () => {
            Promise.all([options.get('folder.name'),
                         browser.bookmarks.getTree()])
                .then((results) => {
                    let name = results[0];
                    let parent = results[1][0].children[0];
                    for (let child of parent.children)
                    {
                        if ((('type' in child && child.type == 'folder') || (!('type' in child) && !child.url)) && child.title == name)
                        {
                            options.set('folder.id', child.id);
                            console.log('using existing folder with id = ' + child.id);
                            return child;
                        }
                    }
                    return browser.bookmarks.create({ title: name, parentId: parent.id})
                               .then((folder) => {
                                   options.set('folder.id', folder.id);
                                   console.log('created folder with id = ' + folder.id);
                                   return folder;
                                });
                })
        };

        options.get('folder.id')
            .then((id) => { return browser.bookmarks.get(id); })
            .catch((err) => {
                console.log('folder.id is not actual');
                selectFolder();
            });

        let checkChangeId = (id) => {
            options.get('folder.id')
                .then((folderId) => {
                    if (folderId == id) {
                        selectFolder();
                    }
                });
        };
        browser.bookmarks.onMoved.addListener(checkChangeId);
        browser.bookmarks.onRemoved.addListener(checkChangeId);
        options.folder.name.onChanged.addListener(selectFolder);
    };

    this.list = function () {
        let getBookmarks = function() {
            return options.get('folder.id')
                       .then((id) => { return browser.bookmarks.getChildren(id); })
                       .catch((error) => { return getBookmarks(); });
        }

        return getBookmarks()
                    .then((nodes) => {
                        let ret = [];
                        nodes.forEach((node) => {
                            if (('type' in node && node.type != "bookmark") || !node.url) {
                                return;
                            }
                            let bookmark = node;
                            ret.push({
                                id: bookmark.id,
                                url: bookmark.url,
                                title: bookmark.title,
                                dateAdded: bookmark.dateAdded
                            });
                        })
                        return ret;
                    })
    };

    this.add = function (name, url)
    {
        return options.get('folder.id')
                   .then((id) => { return browser.bookmarks.create({title: name, url: url, parentId: id}); });
    };

    this.removeByUrl = function (url)
    {
        return this.getBookmarkId(url)
                   .then((id) => {
                       return this.removeById(id);
                   })
    };

    this.removeById = function (id)
    {
        return browser.bookmarks.remove(id);
    };

    this.getBookmarkId = function (url)
    {
        return Promise.all([options.get('folder.id'),
                            browser.bookmarks.search({ url: url })])
                   .then((results) => {
                       let folderId = results[0];
                       let bookmarks = results[1];
                       for (let bookmark of bookmarks) {
                           if (bookmark.parentId == folderId) {
                               return bookmark.id;
                           }
                       }
                       return null;
                   })
                   .catch((err) => { return null; })
    };

    this.exists = function (url)
    {
        return this.getBookmarkId(url)
                   .then((id) => {
                       return !!id;
                   })
    }

    this.requestDelayRemoveList = function () {
        browser.runtime.sendMessage({ type: 'getDelayRemoveList' });
    }

    this.toggleDelayRemoveById = function (id) {
        browser.runtime.sendMessage({ type: 'toggleDelayRemoveById', id: id });
    }

    this.isOnDelayRemoveList = function (id) {
        return delayRemoveList.has(id);
    }

    browser.runtime.onMessage.addListener((message) => {
        switch (message.type) {
            case 'toggleDelayRemoveById':
                if (!isBackgroundMode) {
                    break;
                }
                if (this.isOnDelayRemoveList(message.id)) {
                    delayRemoveList.delete(message.id);
                    browser.runtime.sendMessage({ type: 'delayRemoveChanged', id: message.id, existInList: false, timeout: 0 });
                }
                else {
                    let timeout = new Date().getTime() + REMOVE_DELAY;
                    delayRemoveList.set(message.id, timeout);
                    browser.runtime.sendMessage({ type: 'delayRemoveChanged', id: message.id, existInList: true, timeout: timeout });
                    setTimeout(() => {
                        let now = new Date().getTime();
                        // TODO: seems here only one ID should be handled -> current one
                        delayRemoveList.forEach((timeout, id) => {
                            if (timeout < now) {
                                bookmarks.removeById(id);
                                delayRemoveList.delete(id);
                            }
                        });
                    }, REMOVE_DELAY + 100);
                }
                break;
            case 'delayRemoveChanged':
                if (isBackgroundMode) {
                    return;
                }
                if (message.existInList) {
                    delayRemoveList.set(message.id, message.timeout);
                }
                else {
                    delayRemoveList.delete(message.id);
                }
                this.onDelayRemoveChanged.execute(message.id, message.existInList);
                break;
            case 'getDelayRemoveList':
                delayRemoveList.forEach((timeout, id) => {
                    browser.runtime.sendMessage({ type: 'delayRemoveChanged', id: id, existInList: true, timeout: timeout });
                })
                break;
        }
    })

    let sendBookmarkChangeNotification = (bookmark, exists) => {
        if (('type' in bookmark && bookmark.type != "bookmark") || !bookmark.url) {
            return;
        }
        this.onBookmarksChanged.execute({
            exists: exists,
            id: bookmark.id,
            url: bookmark.url,
            title: bookmark.title,
            dateAdded: bookmark.dateAdded
        });
    }

    browser.bookmarks.onCreated.addListener((id, bookmark) => {
        options.get('folder.id')
            .then((folderId) => {
                if (bookmark.parentId == folderId) {
                    sendBookmarkChangeNotification(bookmark, true);
                }
            });
    });

    browser.bookmarks.onMoved.addListener((id, moveInfo) => {
        if (moveInfo.parentId == moveInfo.oldParentId) {
            return;
        }
        let folderId;
        options.get('folder.id')
            .then((fid) => {
                folderId = fid;
                if (moveInfo.parentId == folderId || moveInfo.oldParentId == folderId) {
                    return browser.bookmarks.get(id);
                }
            })
            .then((bookmarks) => {
                let bookmark = bookmarks[0];
                delayRemoveList.delete(bookmark.id);
                sendBookmarkChangeNotification(bookmark, bookmark.parentId == folderId)
            })

    })

    browser.bookmarks.onRemoved.addListener((id, removeInfo) => {
        options.get('folder.id')
            .then((folderId) => {
                if (removeInfo.parentId == folderId) {
                    delayRemoveList.delete(id);
                    sendBookmarkChangeNotification(removeInfo.node, false);
                }
            });
    });

    options.folder.id.onChanged.addListener((change) => {
        delayRemoveList.clear();
        this.onFolderChanged.execute(change.value);
    })
})();
