let options = new (function() {
    let option = (name) => { return 'options.' + name; };
    let defaults = {};
    let listeners = {};
    let addOption = (name, defaultValue) => {
        name = option(name);
        defaults[name] = defaultValue;
        listeners[name] = new Signal();
    }
    addOption('folder.name', 'Save-To-Read');
    addOption('folder.id', undefined);
    addOption('view.mode', 'compact'); // full
    addOption('view.tooltip', false); // full
    addOption('view.fullurl', false);
    addOption('sort.by', 'dateAdded');   // title
    addOption('sort.ascending', true);
    addOption('shortcut.bookmark', 'ALT + W');
    addOption('shortcut.sidebar', 'ALT + [');
    addOption('shortcut.popup', 'ALT + ]');
    addOption('shortcut.open', 'ALT + O');
    addOption('bookmark.click.left.remove', false);
    addOption('bookmark.click.left.closePopup', false);
    addOption('browserAction.action', 'sidebar'); // popup, read_last, read_random
    addOption('pageAction.close', false);

    this.set = function(name, value) {
        name = option(name);
        let obj = {};
        obj[name] = value;
        browser.storage.local.set(obj)
            .catch((msg) => { console.error(msg); });
    }

    this.get = function(name) {
        name = option(name);
        if (!defaults.hasOwnProperty(name))
        {
            let msg = `No property with name ${name} exists`;
            console.error(msg);
            throw new ReferenceError(msg);
        }
        let keys = {};
        keys[name] = defaults[name];
        return browser.storage.local.get(keys)
                    .then((result) => { return result[name]; });
    }

    this.addOptionListener = function(name, listener) {
        listeners[option(name)].addListener(listener);
    }

    browser.storage.onChanged.addListener((changes, areaName) => {
        if (areaName != 'local') {
            return;
        }
        for(let option in changes) {
            if (option in listeners) {
                let change = changes[option];
                let value = change.newValue;
                let oldValue = change.oldValue;
                listeners[option].execute({ value : value, oldValue : oldValue });
            }
        }
    });

    // let Option = function(name, defaultValue) {
    //     this.get = function() {
    //         let keys = {};
    //         keys[name] = defaultValue;
    //         return browser.storage.local.get(keys)
    //                    .then((result) => { return result[name]; });
    //     }
    //     this.set = function(value) {
    //         let obj = {};
    //         obj[name] = value;
    //         return browser.storage.local.set(obj)
    //                    .catch((msg) => {
    //                        console.error(msg);
    //                        throw msg;
    //                    });
    //     }
    //     this.onChanged = listeners[name];
    // }
    //
    let Option = function(name) {
        this.get = function() {
            return options.get(name);
        }
        this.set = function(value) {
            return options.set(name, value);
        }
        this.onChanged = listeners[option(name)];
    }

    for (let option in defaults) {
        let path = option.split('.');
        let obj = this;
        path.shift();
        let name = path.pop();
        for (let i in path) {
            if (!obj[path[i]]) {
                obj[path[i]] = {};
            }
            obj = obj[path[i]];
        }
        obj[name] = new Option(path.join('.') + '.' + name);
    }

})();

// let options =
// {
//     folder : {
//         name : 'Save-To-Read',
//         id : ''
//     },
//     order : {
//         by : 'url',
//         direction : 'ascending'
//     }
// }
// browser.storage.local.set({options})
// .then(() => { return browser.storage.local.get('options') })
// .then((item) => { console.log(item); });
