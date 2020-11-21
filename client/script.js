let socket = 0
let hanlderQueue = []

let connect = (onopen) => {
    let username = document.querySelector("#usernameInputField").value
    if(socket == 0) {
        socket = new WebSocket("ws://192.168.0.7:7832")
        socket.onopen = (e) => {
            rpc(`setusername ${username}`, (e) => {
                let reply = e.data
                if(reply.startsWith("err")) {
                    alert("Username already in use")
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
        console.log("a connection is already open")
    }
}

let rpc = (msg, handler) => {
    if(socket != 0) {
        socket.send(msg)
        hanlderQueue.push(handler)
    }
}

let consume = (e) => {
    console.log(e)
    let handler = hanlderQueue.shift()
    handler(e)
}

let getPlayers = () => {
    if(socket != 0) {
        rpc("getplayers", (e) => {
            let players = e.data.split(" ")
            players.shift()
            players.sort()
            document.querySelector("#playersOnline>ul").innerHTML = renderPlayerList(players)
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