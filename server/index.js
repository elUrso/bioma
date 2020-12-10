let WebSocket = require('ws')

let User = require("./user")
let Match = require("./match")
let Chat = require("./chat")

Match.inject(User)
Chat.inject(User)

let server = new WebSocket.Server({ port: 7234 })

server.on('connection', User.attach)