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

Tasks do dia 1:

deve fazer:
* [ ] `getplayers` -> lista os usuários conectados
* [ ] `setusername` -> "login" do usuário
* [ ] `getmatches` -> lista as partidas
* [ ] `joinmatch` -> ingressar numa partida
* [ ] `creatematch` -> cria uma partida
* [ ] `setready` -> define que está pronto
* [ ] `matchbegin` -> a partida começa

extra:
* [ ] `getnumber` -> gera um numero aleatorio e envia para todos os jogadores (teste)
* [ ] `endturn` -> encerra o turno