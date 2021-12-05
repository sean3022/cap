//import express 和 ws 套件
const express = require('express')
const SocketServer = require('ws').Server
const fs = require('fs')

const content = 'Some content!'

//指定開啟的 port
const PORT = 1935

//創建 express 的物件，並綁定及監聽 1935 port ，且設定開啟後在 console 中提示
const server = express()
    .listen(PORT, () => console.log(`Listening on ${PORT}`))

//將 express 交給 SocketServer 開啟 WebSocket 的服務
const wss = new SocketServer({ server })

var cmd;
var arg;
//當 WebSocket 從外部連結時執行
wss.on('connection', ws => {
    console.log('Client connected')
	
	ws.on('message', message => {
		var client_data = JSON.parse(message);
		if(client_data != undefined) {
			console.log(client_data);
			switch(client_data.cmd.toLowerCase()){
				case "saveconfig":{
					let clients = wss.clients;
					fs.writeFile('./test.txt', `${client_data.args[0]}：${client_data.args[1]}\n`, { flag: 'a+' }, err => {
					  if (err) {
						console.error(err)
						return
					  }
					  //file written successfully
					})
					clients.forEach(client => {
						client.send(`${client_data.args[0]}：${client_data.args[1]}`);
					});
				}break;
			}
		}
			
		
	});

	ws.on('close', () => {
		console.log('Close connected')
	});
});

