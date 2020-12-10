let WebSocket = require('ws')

let static = require('node-static');
let http = require('http');

let file = new(static.Server)("client");

http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(80);



let User = require("./user")
let Match = require("./match")
let Chat = require("./chat")

Match.inject(User)
Chat.inject(User)

let server = new WebSocket.Server({ port: 7234 })

server.on('connection', User.attach)