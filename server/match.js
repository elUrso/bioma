let router = {}

let inject = (User) => {
    for(key in router) {
        User.router[key] = router[key]
    }
}

let createMatch = (id, client, args)  => {
    
}
router['creatematch'] = createMatch

(() => {
    module.exports.inject = inject
})()