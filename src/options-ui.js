$("[data-localization-key]").each(function() {
    $(this).text(tr($(this).attr("data-localization-key")));
})
$('#folder\\.name').change((e) => {
    // console.log(e.currentTarget.id, e.currentTarget.value);
    if (e.currentTarget.value === '') {
        e.currentTarget.value = 'Save-To-Read';
    }
    options.set(e.currentTarget.id, e.currentTarget.value);
})
$('#folder\\.name').each(function() {
    options.get(this.id)
        .then((value) => {
            this.value = value;
        })
})
$('.option-checkbox').click((e) => {
    options.set(e.currentTarget.id, e.currentTarget.checked);
})
$('.option-checkbox').each(function() {
    options.get(this.id)
        .then((value) => {
            this.checked = value;
        })
})
$('.option-radio').click((e) => {
    options.set(e.currentTarget.name, e.currentTarget.value);
    // options.set(e.currentTarget.id, e.currentTarget.checked);
})
$('.option-radio').each(function() {
    options.get(this.name)
        .then((value) => {
            this.checked = this.value === value;
        })
})
