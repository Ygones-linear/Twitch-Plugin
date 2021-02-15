const fs = require('fs');
const Hapi = require('hapi');
const path = require('path');
const Boom = require('boom');
const ext = require('commander');
const jsonwebtoken = require('jsonwebtoken');
const http = require('http');
const axios = require ('axios');


// WEBSOCKET

const WebSocketServer = require('websocket').server;
const { log } = require('console');

// const request = require('request');

// The developer rig uses self-signed certificates.  Node doesn't accept them
// by default.  Do not use this in production.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Use verbose logging during development.  Set this to false for production.
const verboseLogging = true;
const verboseLog = verboseLogging ? console.log.bind(console) : () => { };

// Service state variables
const bearerPrefix = 'Bearer ';             // HTTP authorization headers have this prefix

const STRINGS = {
  secretEnv: usingValue('secret'),
  clientIdEnv: usingValue('client-id'),
  serverStarted: 'Server running at %s',
  secretMissing: missingValue('secret', 'EXT_SECRET'),
  clientIdMissing: missingValue('client ID', 'EXT_CLIENT_ID'),
  cyclingColor: 'Cycling color for c:%s on behalf of u:%s',
  sendColor: 'Sending color %s to c:%s',
  invalidAuthHeader: 'Invalid authorization header',
  invalidJwt: 'Invalid JWT'
};

ext.
  version(require('../package.json').version).
  option('-s, --secret <secret>', 'Extension secret').
  option('-c, --client-id <client_id>', 'Extension client ID').
  parse(process.argv);

const secret = Buffer.from(getOption('secret', 'ENV_SECRET'), 'base64');
const clientId = getOption('clientId', 'ENV_CLIENT_ID');

const serverOptions = {
  host: 'localhost',
  port: 8081,
  routes: {
    cors: {
      origin: ['*']
    }
  }
};
const serverPathRoot = path.resolve(__dirname, '..', 'conf', 'server');
if (fs.existsSync(serverPathRoot + '.crt') && fs.existsSync(serverPathRoot + '.key')) {
  serverOptions.tls = {
    // If you need a certificate, execute "npm run cert".
    cert: fs.readFileSync(serverPathRoot + '.crt'),
    key: fs.readFileSync(serverPathRoot + '.key')
  };
}
// const server = new Hapi.Server(serverOptions);

const server = http.createServer(function (request, response) {
  console.log((new Date()) + ' Received request for ' + request.url);
  response.writeHead(404);
  response.end();
})

server.listen(8081, function() {
  console.log((new Date()) + ' Server is listening on port 8081');
});

wsServer = new WebSocketServer({
  httpServer: server,
  // You should not use autoAcceptConnections for production
  // applications, as it defeats all standard cross-origin protection
  // facilities built into the protocol and the browser.  You should
  // *always* verify the connection's origin and decide whether or not
  // to accept it.
  autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  console.log('ORIGIN CHECK : ', origin)
  return true;
}

const connexions = []

function broadcast (message) {
  console.log('Broadcasting...')
  console.log(connexions.length + ' active connections ...')
  if (connexions.length > 0) {
    connexions.forEach(c => {
      c.send(message)
    })
  }
}

wsServer.on('request', function(request) {
  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject()
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.')
    return;
  }
  var connection = request.accept('echo-protocol', request.origin)
  console.log((new Date()) + ' Connection accepted.')
  if (connexions.indexOf(connection) === -1) {
    connexions.push(connection)
  }
  connection.on('message', function(message) {
      if (message.type === 'utf8') {
          console.log('Received Message: ' + message.utf8Data)
          const data = JSON.parse(message.utf8Data)
          switch(data.type) {
            case 'vote':
              handleUserVote(connection, data)
              break
            case 'project':
              if (data.action === 'GET') {
                getProject()
              }
              break
          }
          // connection.send(message.utf8Data)
      }
      else if (message.type === 'binary') {
          console.log('WRONG PAYLOAD TYPE')
          // connection.sendBytes(message.binaryData)
      }
  });
  connection.on('close', function(reasonCode, description) {
      console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.')
  });
});

function usingValue (name) {
  return `Using environment variable for ${name}`
}

function missingValue (name, variable) {
  const option = name.charAt(0)
  return `Extension ${name} required.\nUse argument "-${option} <${name}>" or environment variable "${variable}".`
}

// Get options from the command line or the environment.
function getOption (optionName, environmentName) {
  const option = (() => {
    if (ext[optionName]) {
      return ext[optionName]
    } else if (process.env[environmentName]) {
      console.log(STRINGS[optionName + 'Env'])
      return process.env[environmentName]
    }
    console.log(STRINGS[optionName + 'Missing'])
    process.exit(1)
  })();
  console.log(`Using "${option}" for ${optionName}`)
  return option
}

// Verify the header and the enclosed JWT.
function verifyAndDecode (header) {
  if (header.startsWith(bearerPrefix)) {
    try {
      const token = header.substring(bearerPrefix.length)
      return jsonwebtoken.verify(token, secret, { algorithms: ['HS256'] })
    }
    catch (ex) {
      throw Boom.unauthorized(STRINGS.invalidJwt)
    }
  }
  throw Boom.unauthorized(STRINGS.invalidAuthHeader)
}

function verifyAndDecodeToken (token) {
  if (token) {
    try {
      return jsonwebtoken.verify(token, secret, { algorithms: ['HS256'] })
    }
    catch (ex) {
      throw Boom.unauthorized(STRINGS.invalidJwt)
    }
  }
  throw Boom.unauthorized(STRINGS.invalidAuthHeader)
}

///////////////////////////////////////////////

//

function getCurrentQuestionHandler (req) {
  const payload = verifyAndDecode(req.headers.authorization)
  verboseLog('Current question asked : ', payload)
  return 'BatKwak le BG'
}

function handleUserVote (connection, vote) {
  console.log('vote : ', vote)
  if (vote.token) {
    const allowed = verifyAndDecodeToken(vote.token)
    if (allowed) { // token vérifié
      // @todo: vérifier que l'user ne vote pas 2 fois
      const response = {
        type: 'voteConfirmation',
        vote: vote
      }
      connection.send(JSON.stringify(response))
    } else { // le token n'a pas pu être vérifié
      const response = {
        type: 'voteRejected',
        message: 'Token verification failed...'
      }
      connection.send(JSON.stringify(response))
      return
    }
  } else { // la requête ne contient pas de token
    const response = {
      type: 'voteRejected',
      message: 'Missing token...'
    }
    connection.send(JSON.stringify(response))
      return
  }
}

function getProject () {
  console.log('GETTING PROJECTS')
  axios.get('https://api.goneslive.fr/projects').then(r => {
    console.log('SUCCESS : ', r.data[0].questions)
    setQuestion(r.data[0].questions[0])
  }).catch(e => {
    console.log('ERROR : ', e)
  })
}

let currentQuestion = null
function setQuestion (question) {
  if (!!question) {
    currentQuestion = question
    const data = {
      type: 'newQuestion',
      question: question
    }
    broadcast(JSON.stringify(data))
  }
}
