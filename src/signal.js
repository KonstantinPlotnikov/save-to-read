function Signal() {
    let listeners = new Set();

    this.addListener = function (listener)
    {
        listeners.add(listener);
    }

    this.removeListener = function (listener)
    {
        listeners.delete(listener);
    }

    this.hasListener = function (listener)
    {
        return listeners.has(listener);
    }

    this.execute = function (...args)
    {
        listeners.forEach((listener) => listener(...args));
    }
}
