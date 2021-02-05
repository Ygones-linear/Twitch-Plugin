let token = '';
let tuid = '';

const twitch = window.Twitch.ext;

twitch.onContext(function (context) {
  twitch.rig.log(context);
});

twitch.onAuthorized(function (auth) {
  // save our credentials
  token = auth.token;
  tuid = auth.userId;
  $.ajax(requests.get);
});

function logError(_, error, status) {
  twitch.rig.log('EBS request returned '+status+' ('+error+')');
}

function logSuccess(hex, status) {
  twitch.rig.log('EBS request returned '+hex+' ('+status+')');
}

/* $(function () {
  $('#getQuestions').click(function () {
    twitch.rig.log('clicked !')
  })
}) */

let socket = null

function setupWS () {
  socket = new WebSocket('ws://localhost:8081', 'echo-protocol')
  socket.onerror = function () {
    twitch.rig.log('Erreur WS')
  }

  socket.onopen = function () {
    twitch.rig.log('Connexion OK')
  }

  socket.onclose = function () {
    twitch.rig.log('Connexion fermée')
  }

  socket.onmessage = function (e) {
    if (e.data) {
      const data = JSON.parse(e.data)
      twitch.rig.log("Received new " + e.data.type)
      switch(data.type) {
        case 'newQuestion':
          setupNewQuestion(data.question)
          break
        case 'voteConfirmation':
          voteConfirmation(data.vote)
          break
        default:
          twitch.rig.log(e.data)
      }
    }
  }
}

function vote (resId) {
  const data = {
    type: 'vote',
    vote: resId
  }
  socket.send(JSON.stringify(data))
}

function voteConfirmation (vote) {
  twitch.rig.log(vote, ' vote accepted')
}

function logSomething () {
  twitch.rig.log('Envoi...')
  socket.send('Salut')
}

function getProject () {
  twitch.rig.log('project request')
  const request = {
    type: 'project',
    action: 'GET'
  }
  socket.send(JSON.stringify(request))
}

function setupNewQuestion (question) {
  twitch.rig.log('Received new question !')
  setView('question-template', question)
}

function setView (viewId, data) {
  const template = document.getElementById(viewId).innerHTML
  const rendered = Mustache.render(template, data)
  document.getElementById('dynamic-view').innerHTML = rendered
}
