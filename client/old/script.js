let socket = 0
let hanlderQueue = []
let router = {}

let connect = (onopen) => {
    let username = document.querySelector("#usernameInputField").value
    if (socket == 0) {
        socket = new WebSocket("ws://localhost:7832")
        socket.onopen = (e) => {
            rpc(`setusername ${username}`, (e) => {
                let reply = e.data
                if (reply.startsWith("err")) {
                    alert(reply)
                    socket.close()
                } else {
                    alert("login complete")
                }
            })
        }
        socket.onmessage = (e) => { consume(e) }
        socket.onclose = (e) => {
            console.log("Disconnected")
            socket = 0
        }
    } else {
        alert("a connection is already open")
    }
}

let rpc = (msg, handler) => {
    if (socket != 0) {
        socket.send(msg)
        hanlderQueue.push(handler)
    }
}

let consume = (e) => {
    console.log(e)
    let split = e.data.split(" ")
    if (split.shift() != "!") {
        let handler = hanlderQueue.shift()
        handler(e)
    } else {
        dispatch(split)
    }
}

let dispatch = (args) => {
    let command = args.shift()
    if (command in router) {
        router[command](args)
    } else {
        alert("err unknown command sent from server")
    }
}

let getPlayers = () => {
    if (socket != 0) {
        let ul = document.querySelector("#playersOnline>ul")
        rpc("getplayers", (e) => {
            let players = e.data.split(" ")
            players.shift()
            players.sort()
            ul.innerHTML = renderPlayerList(players)
        })
    } else {
        alert("Please, login before")
    }
}

let renderPlayerList = (players) => {
    let ret = ""
    players.forEach(username => {
        ret = `${ret}<li>${username}</li>`
    })
    return ret
}

let createMatch = () => {
    if (socket != 0) {
        let name = document.querySelector("#matchInputField").value
        rpc(`creatematch ${name}`, (e) => {
            let reply = e.data.split(" ")
            let result = reply.shift()
            if (result == "err") alert(e.data)
            else {
                let match = document.querySelector("#match")
                let text = document.querySelector("#match>p")
                text.innerHTML = name
                // show match UI
                match.style.display = "block"
            }
        })
    } else {
        alert("Please, login before")
    }
}

let getMatches = () => {
    if (socket != 0) {
        let ul = document.querySelector("#lobby>ul")
        rpc(`getmatches`, (e) => {
            let matches = e.data.split(" ")
            matches.shift()
            console.log(renderMatchList(matches))
            ul.innerHTML = renderMatchList(matches)
        })
    } else {
        alert("Please, login before")
    }
}

let renderMatchList = (matches) => {
    let ret = ""
    pair(matches).forEach((x) => {
        ret = `${ret}<li>${x[0]} (${x[1]}/2) <a href="#" onclick="joinMatch('${x[0]}')">join</a></li>`
    })
    return ret
}

let pair = (list) => {
    let ret = []
    let i = 0
    while (i + 1 < list.length) {
        ret.push([list[i], list[i + 1]])
        i = i + 2
    }
    return ret
}

let joinMatch = (match) => {
    if (socket != 0) {
        rpc(`joinmatch ${match}`, (e) => {
            let reply = e.data.split(" ")
            let result = reply.shift()
            if (result == "err") alert(e.data)
            else {
                let matchDiv = document.querySelector("#match")
                let text = document.querySelector("#match>p")
                text.innerHTML = match
                // show match UI
                matchDiv.style.display = "block"
            }
        })
    } else {
        alert("Please, login before")
    }
}

let leaveMatch = () => {
    if (socket != 0) {
        rpc("leavematch", (e) => {
            let reply = e.data.split(" ")
            let result = reply.shift()
            if (result == "err") alert(e.data)
            else {
                let matchDiv = document.querySelector("#match")
                // hide match UI
                matchDiv.style.display = "none"
            }
        })
    } else {
        alert("Please, login before")
    }
}

let setReady = () => {
    if (socket != 0) {
        // adicionar as cartas (#cardlist)
        // inpiração
        // let name = document.querySelector("#matchInputField").value
        let cards = document.querySelector("#cardlist").value
        rpc(`setready ${cards}`, (e) => {
            let reply = e.data.split(" ")
            let result = reply.shift()
            if (result == "err") alert(e.data)
            else {
                let matchDiv = document.querySelector("#match")
                let waitDiv = document.querySelector("#wait")
                // hide match UI
                matchDiv.style.display = "none"
                waitDiv.style.display = "block"
            }
        })
    } else {
        alert("Please, login before")
    }
}

let matchBegin = (_) => {
    let setup = document.querySelector("#setup")
    let game = document.querySelector("#game")
    setup.style.display = "none"
    game.style.display = "block"
}
router["matchbegin"] = matchBegin

let beginTurn = (_) => {
    let commands = document.querySelector("#commands")
    commands.style.display = "block"
}
router["beginturn"] = beginTurn

let addToLog = (args) => {
    let log = document.querySelector("#log")
    log.innerHTML = `${log.innerHTML}<p>${args.join(" ")}</p>`
}
router["gamelog"] = addToLog

let endTurn = () => {
    if (socket != 0) {
        rpc("endturn", (e) => {
            let commands = document.querySelector("#commands")
            commands.style.display = "none"
        })
    } else {
        alert("Please, login before")
    }
}

let getNumber = () => {
    if (socket != 0) {
        rpc("getnumber", (_) => { })
    } else {
        alert("Please, login before")
    }
}

// setup card detail

let showDetail = (e) => {
    document.querySelector("#carddetail").style.display = "block"
    document.querySelector("#carddetail").innerHTML = e.toElement.innerHTML
}

let hideDetail = (e) => {
    document.querySelector("#carddetail").style.display = "none"
}

document.querySelectorAll(".card").forEach( x => {
    x.onmouseenter = showDetail
    x.onmouseleave = hideDetail
})

// draw card

let drawCard = (args) => {
    let card = new Card(args[0])
    document.querySelector("#playerhand").appendChild(card.view)
}
router['drawcard'] = drawCard

class Card {
    constructor(cardid) {
        this.view = document.createElement("div")
        this.view.classList.add("card")
        this.view.onmouseenter = showDetail
        this.view.onmouseleave = hideDetail
    }
}