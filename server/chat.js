let router = {}
let User = {}

let inject = (tgt) => {
    for (key in router) {
        tgt.router[key] = router[key]
    }
    User = tgt
}

let sendMessage = (id, client, args) => {
    let name = User.getName(id)
    let message = args.join(" ")
    client.send("ok")
    User.broadcast(`message ${name} ${message}`)
}
router['sendmessage'] = sendMessage;

(() => {
    module.exports.inject = inject
})()