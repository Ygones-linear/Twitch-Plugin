$(function () {
    // when we click the cycle button
    $('#getQuestions').click(function () {
        if(!token) { return twitch.rig.log('Not authorized'); }
        $.ajax(requests.set);
    });
    })
    $('#cycle').click(function () {
    if(!token) { return twitch.rig.log('Not authorized'); }
      twitch.rig.log('Requesting a color cycle');
      twitch.rig.log('USER ID : ', tuid)
      $.ajax(requests.set);
    });
  });
  