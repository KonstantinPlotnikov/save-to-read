function defineReadonlyProperty(object, name, val)
{
    Object.defineProperty(object, name, { value: val, writable: false });
}
