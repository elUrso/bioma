let socket = 0
let hanlderQueue = []
let router = {}
let messageSound = new Audio('audio/clearly-602.mp3')

// add enter detection on login

document.querySelector("#usernameInputField").onkeydown = (e) => {
    if(e.key === "Enter") connect();
}

document.querySelector("#messageField").onkeydown = (e) => {
    if(e.key === "Enter") sendMessage();
}

// update server name to current location

document.querySelector("#serverInputField").value = window.location.hostname

let connect = () => {
    let server = document.querySelector("#serverInputField").value
    let username = document.querySelector("#usernameInputField").value
    if (socket == 0) {
        socket = new WebSocket(`ws://${server}:7234`)
        socket.onopen = (e) => {
            rpc(`setusername ${username}`, (e) => {
                let reply = e.data
                if (reply.startsWith("err")) {
                    alert(reply)
                    socket.close()
                } else {
                    loginComplete()
                }
            })
        }
        socket.onmessage = (e) => { consume(e) }
        socket.onclose = (e) => {
            resetUIState()
            console.log("Disconnected")
            socket = 0
        }
        socket.onerror = (e) => {
            console.log("Could not connect")
            alert("Não foi possível se conectar ao servidor")
        }
    } else {
        alert("a connection is already open")
    }
}

let loginComplete = () => {
    updateMatches()
    showLobby()
}

let showLobby = () => {
    document.querySelector("#loginView").style.display = "none"
    document.querySelector("#sessionView").style.display = "flex"
    document.querySelector("#lobby").style.display = "flex"
    document.querySelector("#matchSetup").style.display = "none"
    document.querySelector("#logoutIcon").onclick = logout
}

let showMatchSetup = () => {
    document.querySelector("#loginView").style.display = "none"
    document.querySelector("#sessionView").style.display = "flex"
    document.querySelector("#lobby").style.display = "none"
    document.querySelector("#matchSetup").style.display = "flex"
    document.querySelector("#logoutIcon").onclick = leaveMatch
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
        let ul = document.querySelector("#usersList")
        rpc("getplayers", (e) => {
            let players = e.data.split(" ")
            players.shift()
            players.sort()
            ul.innerHTML = renderPlayerList(players.sort())
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
                showMatchSetup()
            }
        })
    } else {
        alert("Please, login before")
    }
}

let getMatches = () => {
    if (socket != 0) {
        let ul = document.querySelector("#matchList")
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
        if(x[1] == "2") {
            ret = `${ret}<li>${x[0]} (${x[1]}/2)`
        } else {
            ret = `${ret}<li>${x[0]} (${x[1]}/2) <a href="#" onclick="joinMatch('${x[0]}')">join</a></li>`
        }
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
                showMatchSetup()
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
                showLobby()
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

// global chat

let globalIsOpen = false

let showChat = () => {
    document.querySelector("#globalChatIcon").style.backgroundColor = "khaki"
    document.querySelector("#globalChat").style.display = "flex"
    let list = document.querySelector("#globalMessages")
    list.scrollTop = list.scrollHeight
    globalIsOpen = true
}

let hideChat = () => {
    document.querySelector("#globalChat").style.display = "none"
    globalIsOpen = false
}

let sendMessage = () => {
    let field = document.querySelector("#messageField")
    let message = field.value
    rpc(`sendmessage ${message}`, ()=>{})
    field.value = ""
}

let recvMessage = (args) => {
    let name = args.shift()
    let name_entry = document.createElement("div")
    name_entry.classList.add("user")
    name_entry.innerHTML = name

    if(name == "SYSTEM" && args[0] === "User") {
        getPlayers()
    }

    let message = args.join(" ")
    let message_entry = document.createElement("div")
    message_entry.classList.add("message")
    message_entry.innerHTML = message

    let entry = document.createElement("div")
    entry.classList.add("message")
    entry.appendChild(name_entry)
    entry.appendChild(message_entry)

    let list = document.querySelector("#globalMessages")
    list.appendChild(entry)
    list.scrollTop = list.scrollHeight

    if(!globalIsOpen) {
        document.querySelector("#globalChatIcon").style.backgroundColor = "red"
        messageSound.play()
    }
}
router["message"] = recvMessage

// reset UI state

let resetUIState  = () => {
    document.querySelector("#loginView").style.display = "flex"
    document.querySelector("#sessionView").style.display = "none"
    document.querySelector("#globalMessages").innerHTML = ""
    document.querySelector("#logoutIcon").onclick = logout
}

// logout

let logout = () => {
    socket.close()
}

// handle match update
let updateMatches = (args) => {
    getMatches()
}
router["update_matches"] = updateMatches