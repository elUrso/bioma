Cliente->Servidor
`commando argumentos`
sempre tem resposta (ok, err)

Servidor->Cliente
Repostas e mensagens
`resposta`
`! evento`

Cliente
rpc(mensagem, handler)


ping()
timeout {
    se recebeu o pong
        ping
        gera outro timeout
    senão matar a conexão
}
pong() <- recebi um pong
