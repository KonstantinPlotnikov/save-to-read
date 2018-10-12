function Table(element, options) {
    let Renderer = options.renderer;
    let allNodes = [];
    let filteredNodes = [];
    let nodesMap = new Map();
    let getKey = options.getKey ? options.getKey : ((data) => { return data; }) ;
    let compareFunc = options.compare;
    let filterFunc = options.filter;

    this.addRows = function (rowsData) {
        for (let rowData of rowsData) {
            let node = {};
            node.data = rowData;
            node.renderer = new Renderer(rowData);
            node.ui = node.renderer.getUi();
            allNodes.push(node);
            nodesMap[getKey(node.data)] = node;
            // element.appendChild(node.ui);
        }
        this.sort();
    }

    this.sort = function() {
        if (compareFunc && allNodes.length >= 2) {
            allNodes.sort((e1, e2) => { return compareFunc(e1.data, e2.data); });
        }

        this.filter();
    }

    this.filter = function () {
        filteredNodes = allNodes.filter((e) => { return filterFunc ? filterFunc(e.data) : true; });

        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        for (let node of filteredNodes) {
            element.appendChild(node.ui);
        }
    }

    this.removeRow = function (key) {
        let node = nodesMap[key];
        if (!node) {
            return; // throw?
        }
        node.renderer.destroy();
        element.removeChild(node.ui);
        for (let i = 0, length = allNodes.length; i < length; ++i) {
            if (allNodes[i] === node) {
                allNodes.splice(i, 1);
                break;
            }
        }
        nodesMap.delete(key);
        this.filter();
    }

    this.clear = function() {
        for (let node of allNodes) {
            node.renderer.destroy();
        }
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
        nodesMap.clear();
        allNodes = [];
        filteredNodes = [];
    }
}
