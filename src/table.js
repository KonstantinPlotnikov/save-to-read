function Table(element, options) {
    let Renderer = options.renderer;
    let nodes = [];
    let nodesMap = new Map();
    let getKey = options.getKey ? options.getKey : ((data) => { return data; }) ;
    this.compare = options.compare;

    this.addRows = function (rowsData) {
        for (let rowData of rowsData) {
            let node = {};
            node.data = rowData;
            node.renderer = new Renderer(rowData);
            node.ui = node.renderer.getUi();
            nodes.push(node);
            nodesMap[getKey(node.data)] = node;
            element.appendChild(node.ui);
        }
        this.sort();
    }

    this.sort = function() {
        if (!this.compare || nodes.length < 2) {
            return;
        }
        nodes.sort((e1, e2) => { return this.compare(e1.data, e2.data); });
        for (let i = nodes.length-2; i >= 0; --i) {
            element.insertBefore(nodes[i].ui, nodes[i+1].ui);
        }
    }

    this.removeRow = function (key) {
        let node = nodesMap[key];
        if (!node) {
            return; // throw?
        }
        node.renderer.destroy();
        element.removeChild(node.ui);
        for (let i = 0, length = nodes.length; i < length; ++i) {
            if (nodes[i] === node) {
                nodes.splice(i, 1);
                break;
            }
        }
        nodesMap.delete(key);
    }

    this.clear = function() {
        for (let node of nodes) {
            node.renderer.destroy();
        }
        for (let child of element.children) {
            element.removeChild(child);
        }
        nodesMap.clear();
        nodes = [];
    }
}
