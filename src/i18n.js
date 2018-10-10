function tr(messageName, substitutions)
{
    if (!messageName) {
        // console.error("tr() called with incorrect messageName");
        return '';
    }
    let ret = browser.i18n.getMessage(messageName, substitutions);
    // console.log(ret);
    // console.log(ret ? ret : messageName);
    return ret ? ret : messageName;
}
