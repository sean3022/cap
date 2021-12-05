var https = require('https');
var path = require('path');
var fs = require('fs');
const SocketServer = require('ws').Server;
const PORT = 1935;
const config = {
        key: fs.readFileSync('/etc/letsencrypt/live/test.koreacentral.cloudapp.azure.com/privkey.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/live/test.koreacentral.cloudapp.azure.com/cert.pem')
};

var server = https.createServer(config).listen(PORT,() => console.log(`Listening on ${PORT}`))
const wss = new SocketServer({ server: server });
var roomConfig = {};


function initRoomConfig(room){
	if(roomConfig[room] == undefined)
	{
		roomConfig[room] = {};
		roomConfig[room].userCount = 0;
		roomConfig[room].User = [];
		roomConfig[room].UserName = [];
		roomConfig[room].Host = "";
		roomConfig[room].Client = [];
	}
}

function addRoomUser(room,user)
{
	roomConfig[room].userCount = roomConfig[room].userCount + 1;
	roomConfig[room].User.push(user);
	var conf = {userID:`${user}`, userName:""};
	roomConfig[room].UserName.push(conf); 
	if(roomConfig[room].userCount == 1)
	{
		roomConfig[room].Host = user;
		return "Host";
	}
	else
	{
		roomConfig[room].Client.push(user);
		return "Client";
	}
}


function saveRoomUserName(room,userID,userName)
{
	if(roomConfig[room].UserName.length)
	{	
		for(var i=0;i<roomConfig[room].UserName.length;i++)
		{
			if(roomConfig[room].UserName[i].userID != userID && roomConfig[room].UserName[i].userName == userName)
			{
				console.log(roomConfig[room].UserName[i]);
				return true;
			}
		}
		for(var i=0;i<roomConfig[room].UserName.length;i++)
		{
			if(roomConfig[room].UserName[i].userID == userID)
			{
				roomConfig[room].UserName[i].userName = userName;
				return false;
			}
		}
	}

	roomConfig[room].UserName.push({ userID:`${userID}`,userName: `${userName}`});
	return false;
}

function removeRoomUser(room,user)
{
	roomConfig[room].userCount=roomConfig[room].userCount - 1;
	roomConfig[room].User.splice(roomConfig[room].User.findIndex((userID)=>userID==user),1);
	roomConfig[room].UserName.splice(roomConfig[room].UserName.findIndex((userName)=>userName.userID==user),1);
	if(user == roomConfig[room].Host)
	{
		return true;
	}
	else
	{
		roomConfig[room].Client.splice(roomConfig[room].Client.findIndex((userID)=>userID==user),1);
	}
	if(roomConfig[room].userCount <= 0)
	{
		delete roomConfig[room];
	}
	return false;
}

wss.on('connection', ws => {
        console.log('Client connected')

        ws.on('message', message => {
                var client_data = JSON.parse(message);
                if(client_data != undefined) {
                        console.log(client_data);
                        switch(client_data.cmd){					
				case "saveconfig":{
					let clients = wss.clients;
					fs.writeFile('./test.txt', `${client_data.args[0]}：${client_data.args[1]}\n`, { flag: 'a+' }, err => {
						if (err) {
							console.error(err)
							return
						}
					})
					var isExist = saveRoomUserName(client_data.args[2],client_data.args[3],client_data.args[0]);
					console.log(roomConfig);
					clients.forEach(client => {
						if(!isExist)
							client.send(JSON.stringify({cmd: "receiveMessage", args:[client_data.args[2],`${client_data.args[0]}：${client_data.args[1]}`]}));
						else
						{
							console.log(roomConfig[room]);
							client.send(JSON.stringify({cmd: "RegistUserName",args: [client_data.args[3],`UserName ${client_data.args[0]} is exist!!`]}));
						}
					});
				}break;
				case "ConnectRoom":{
					let clients = wss.clients;
					var room = client_data.args[0];
					var userID = client_data.args[1];
					if(room != '')
					{
						initRoomConfig(room);
						var usertype = addRoomUser(room,userID);
						clients.forEach(client => {
							client.send(JSON.stringify({cmd: 'ConnectRoom',args:[userID,usertype]}));
						});

						console.log(roomConfig);
					}
						
				}break;
				case "LeaveRoom":{
					var clients = wss.clients;
					var room = client_data.args[0];
					var userID = client_data.args[1];
					var userName = roomConfig[room].UserName.find((user)=> user.userID == userID);
					console.log(userName);
					var hostleaved = removeRoomUser(room,userID);
					if(hostleaved)
					{
						clients.forEach(client => {
							client.send(JSON.stringify({cmd: 'HostLeaved'}));
						});
					}
					else
					{
						if(userName.userName != "")
						clients.forEach(client => {
							client.send(JSON.stringify({cmd: 'ClientLeaved', args: [userName.userName]}));
						});
					}
				}break;
			}
		}


	});

	ws.on('close', () => {
		console.log('Close connected')
	});
});
