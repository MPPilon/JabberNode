var http = require("http");
var readline = require("readline");
var Client = require("node-xmpp-client");
var Chalk = require("chalk");

var connectionStatus = false;
var login = "nodeshard";
var domain = "friendshipismagicsquad.com";
var password = "NodeJSShardClient";
var username = "NodeShard";
var chatDomain = "conference";
var mucRoom = "general";

var userList = [[]]; //This will contain the entire list of users

var client = new Client({
  jid: login + "@" + domain,
  password: password,
  preferred: "PLAIN"
});

var cmd = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: ""
});

//This function is called when you want to write to the console
//without interrupting the user input in the terminal
//(You should want to do this as much as possible)

var console_log = function(message) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log(message);
  cmd.prompt(true);
};


client.on("online", function() {
  //This listener checks for when the client goes online
  console.log("I'm online!");
  connectionStatus = true;

  //Currently automatically joining the room
  //TODO: Prompt for room name
  console.log("Sending stanza to join room!");
  var stanza = new Client.Stanza("presence", {
    from: client.jid,
    to: mucRoom + "@" + chatDomain + "." + domain + "/" + username
  });
  setInterval(function() {
    client.send(" ");
  }, 30000);

  client.send(stanza);
});



client.on("stanza", function(stanza) {
  //This listener waits for a stanza from the server,
  //which could be anything really, then handles it
  //according to what kind of stanza it is.
  var body = stanza.getChild("body");
  var user = stanza.attrs.from.substring(findUsername(stanza.attrs.from) + 1,
                                                    stanza.attrs.from.length);

  if (stanza.is("message") && !body) {
    //console.log("Probably a topic message...");
    console_log(stanza.getChildText("subject").toString());
  }
  else if (body) {
    //console.log("A chat message!");
    //cmd.clearLine(); //!!This causes problems.
    //The stanza has a body tag, so it is likely a message.
    //Find the username and prepend it to the body. Ezpz.
    //TODO: Okay clearly I might need to start structuring these better
    //in order to provide better functionality/readability
    if (stanza.attrs.type == "chat") { //PM
      console_log(Chalk.red(user + "> " + stanza.getChildText("body").toString()));
    }
    else {
      if (user == username) {
        console_log(Chalk.yellow(user) + "> " + stanza.getChildText("body").toString());
      }
      else {
        console_log(Chalk.cyan(user) + "> " + stanza.getChildText("body").toString());
      }
    }

  }
  else if (stanza.is("presence")) {
    //console.log("A presence message...");
    //Presence stanzas are sent in response to a user
    //changing some attribute of themselves
    var presenceChangeString = "";
    if (stanza.getChild("status"))
    {
      //This is a status change stanza, either going AFK or coming back
      if (stanza.getChild("show")) //This status change is a user going AFK
        presenceChangeString += "Status change for " + user + ": " + stanza.getChildText("show") + " (" + stanza.getChildText("status").toString() + ")";
      else if (stanza.getChild("priority")) //This status change is a user coming back
        presenceChangeString += "Status change for " + user + ": Here";
      else if (stanza.attrs.type == "unavailable") //Sometimes a user will disconnect and reconnect before the ghost is dropped
        presenceChangeString = "User left room: " + user + " (" + stanza.getChildText("status") + ")";
      else { //I have no idea what this status change is
         presenceChangeString += "Unknown status change for " + user + ".";
         console_log(Chalk.magenta(stanza));
       }
    }
    else if (stanza.attrs.type == "unavailable")
    {
      if (stanza.getChild("x").getChild("item").attrs.nick) {
        presenceChangeString = user + " changed their nickname to " + stanza.getChild("x").getChild("item").attrs.nick.toString();
      }
      else {
        presenceChangeString = "User left room: " + user + ".";
      }
    }
    else
    {
      presenceChangeString = "User joined room: " + user + ".";
    }
    console_log(Chalk.gray(presenceChangeString));
    //console.log(stanza.toString());
  }
  else {
    //If it's not a message or a presence, what could it be?
    console_log ("Error?\n" + stanza.toString());
  }
  if (stanza.attr.type == "error") {
    //Stanzas containing an error attribute are definitely errors
    //from the server, so these should be clearly marked.
    console_log("******ERROR******\n" + stanza.toString() + "\n******ERROR******");
  }
});



client.on("error", function(theError) {
  //Another error catching function for non-stanza errors.
  console_log(theError);
});

process.on("SIGINT", function(code) {
  //SIGINT is invoked when the program is terminated.
  //So, this leaves the room before everything finishes.
  console.log("Leaving the room");
  var stanza = new Client.Stanza("presence", {
    from: client.jid,
    to: mucRoom + "@" + chatDomain + "." + domain + "/" + username,
    type: "unavailable"
  });

  console.log("Sending stanza to leave room!");
  client.send(stanza);

  setTimeout(function() {
    process.exit();
  }, 1000);
});

cmd.prompt(true);
cmd.on("line", function(answer) {
  //line happens when we submit something from the console.
  processInput(answer);
  cmd.prompt(true);
});

var processInput = function(input) {
  //Here is where we process the input that was
  //received from the terminal command line

  if (input[0] == "/") //Check if the input starts with a slash
    processCommand(input); //Process as command if yes
  else
    processMessage(input); //Process as message if no
};

var processCommand = function(cmd) {
  //The input is a command, figure out which one
  var command = getCommandAndParameters(cmd, 2)[0];


  switch(command[0]) {
    case "/login":
      command = getCommandAndParameters(cmd, 3);
      if (command[3]) {
        var stanza = new Client.Stanza("presence", {
          from: client.jid,
          to: mucRoom + "@" + chatDomain + "." + domain + "/" + username,
          type: "unavailable"
        });
        client.send(stanza);
        login = command[1];
        password = command[2];
        domain = command[3];
        var client = new Client({
          jid: login + "@" + domain,
          password: password,
          preferred: "PLAIN"
        });
      }
      else
        console.log("Invalid command: Missing parameters");
      break;
    case "/join":
      command = getCommandAndParameters(cmd, 3);
      if (command[3]) {
        mucRoom = command[1];
        chatDomain = command[2];
        username = command[3];
      }
  }
};

var processMessage = function(msg) {
  //The input isn't a command, so it's a message
  var message = new Client.Stanza("message", {
    to: mucRoom + "@" + chatDomain + "." + domain,
    from: client.jid,
    type: "groupchat"
  });
  message.c("body").t(msg); //I guess this adds the message to the body tag
  //Debug message for the message stanza
  //console.log("This is the sent message stanza:\n" + message.toString());
  client.send(message);
};

var findUsername = function(userDomain) {
  //This function finds the username in a received stanza
  //It does this by searching for the slash in the domain
  //in the "from" attribute of the stanza, and returning the
  //index of it, usually to a substring function.
  var index = 0;
  while (userDomain[index] != "/" && index < 100)
    index++;
  return index;
};

var getCommandAndParameters = function(params, numParams) {
  //This function takes in a string (a command from the input)
  //and spits out an array with those parameters
  //Parameters beyond what are being asked for are ignored
  var returnArray = [];
  var index = 0;
  var ignoreSpace = false;
  for (var i = 0; i < params.length; i++)
  {
    if (params[i] === " " && !ignoreSpace && index + 1 < numParams) {
      index++;
    }
    else if (params[i] === "\x22") {
      if (ignoreSpace)
        ignoreSpace = false;
      else
        ignoreSpace = true;
    }
    else if (i + 1 === params.length) {
      returnArray[index] += cmd[i];
      return returnArray;
    }
    else {
      returnArray[index] += cmd[i];
    }
  }
};
