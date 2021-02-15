let token = '';
let tuid = '';

const twitch = window.Twitch.ext;

twitch.onContext(function (context) {
  twitch.rig.log(context);
})

twitch.onAuthorized(function (auth) {
  // save our credentials
  token = auth.token;
  tuid = auth.userId;
  // $.ajax(requests.get);
})

function logError(_, error, status) {
  twitch.rig.log('EBS request returned '+status+' ('+error+')');
}

function logSuccess(hex, status) {
  twitch.rig.log('EBS request returned '+hex+' ('+status+')');
}

let socket = null

function setupWS () {
  twitch.rig.log('Setting up WebSocket')
  if (!socket) {
    socket = new WebSocket('ws://localhost:8081', 'echo-protocol')
  } else {
    twitch.rig.log('WebSocket already exists')
  }
  socket.onerror = function (e) {
    twitch.rig.log('Erreur WS')
    console.log(e)
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
      if (data.type) {
          twitch.rig.log("Received new " + data.type)
          switch(data.type) {
          case 'newQuestion':
            setupNewQuestion(data.question)
            break
          case 'voteConfirmation':
            voteConfirmation(data.vote)
            break
          case 'voteRejected':
            twitch.rig.log('Vote rejected')
            // voteRejection()
            break
          default:
            twitch.rig.log(e.data)
        }
      } else {
        twitch.rig.log("Received new unidentified data " + e)
      }
    }
  }
}

function vote (resId = 0) {
  const checkedValue = document.querySelector('input[name="response"]:checked').value
  twitch.rig.log(checkedValue)
  const data = {
    type: 'vote',
    vote: checkedValue ? checkedValue : resId,
    userId: 0,
    token: token
  }
  socket.send(JSON.stringify(data))
}

function voteConfirmation (vote) {
  twitch.rig.log('Vote accepted')
  setView('vote-success-template', {})
}

function logSomething () {
  twitch.rig.log('Envoi...')
  socket.send('Salut')
}

function getProject () {
  twitch.rig.log('project request')
  setView('loading-template')
  const request = {
    type: 'project',
    action: 'GET'
  }
  socket.send(JSON.stringify(request))
}

function setupNewQuestion (question) {
  twitch.rig.log('Received new question !')
  setView('question-template', question)
  questionTime()
}

function setView (viewId, data = {}) {
  twitch.rig.log('Setting view : ', viewId)
  const template = document.getElementById(viewId).innerHTML
  if (template) {
    // twitch.rig.log('Template found')
  } else {
    // twitch.rig.log('Template not found')
  }
  const rendered = Mustache.render(template, data)
  if (rendered) {
    // twitch.rig.log('Rendered')
  } else {
    // twitch.rig.log('No render')
  }
  document.getElementById('dynamic-view').innerHTML = rendered
}

function questionTime () {
  const time = 30000
  let timeLeft = time
  const refreshInterval = 250
  const timerBarElem = document.getElementById('timer-bar')
  const timerInterval = setInterval(() => {
    timeLeft = timeLeft - refreshInterval
    // timerLeft / time = x / 100
    console.log(timeLeft)
    if (timeLeft <= 0) {
      endQuestionTime()
    } else {
        const percent = timeLeft * 100 / time
        console.log(percent + '%')
        timerBarElem.style.width = percent + '%'
    }
  }, refreshInterval)
  const endQuestionTime = () => {
    clearInterval(timerInterval)
    timerBarElem.style.width = '0%'
    vote()
  }
}
