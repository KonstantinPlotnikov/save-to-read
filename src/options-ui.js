document.querySelectorAll("[data-localization-key]").forEach((el) => {
    el.textContent = tr(el.getAttribute("data-localization-key"));
})

document.getElementById('folder.name').addEventListener('change', (ev) => {
    // console.log(e.currentTarget.id, e.currentTarget.value);
    if (ev.currentTarget.value === '') {
        ev.currentTarget.value = 'Save-To-Read';
    }
    options.set(ev.currentTarget.id, ev.currentTarget.value);
});
options.get('folder.name')
.then((value) => {
    document.getElementById('folder.name').value = value;
})

document.querySelectorAll('.option-checkbox').forEach((el) => {
    el.addEventListener('click', (ev) => {
        options.set(el.id, el.checked);
    })
})
document.querySelectorAll('.option-checkbox').forEach((el) => {
    options.get(el.id)
        .then((value) => {
            el.checked = value;
        })
})

document.querySelectorAll('.option-radio').forEach((el) => {
    el.addEventListener('click', (ev) => {
        options.set(el.name, el.value);
    })
})
document.querySelectorAll('.option-radio').forEach((el) => {
    options.get(el.name)
        .then((value) => {
            el.checked = el.value === value;
        })
})
