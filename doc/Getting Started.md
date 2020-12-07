# Getting Started

O jogo usa uma arquitetura de cliente + servidor.
O cliente é construido em html5 e geralemente está disponível na porta 7233.
O servidor é construido em nodeJS e geralemnte está disponível na porta 7234.

O sistema de teste pode ser acessado pelo link: silva.moe:7233

## Subindo o sistema

Você precisa de 2 terminais, python3 e nodeJS.

Em um termminal é so rodar `npm start`
E em outro dar um cd em `client` e depois rodar `python3 -m http.server 7233`
ou `live-server --port=7233` para acelerar o desenvolvimento.
