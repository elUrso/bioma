let WebSocket = require('ws')

let User = require("./user")

let server = new WebSocket.Server({ port: 7832 })

server.on('connection', User.attach)