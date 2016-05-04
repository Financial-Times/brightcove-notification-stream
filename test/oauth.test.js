var request = require('requestretry');

exports.testOAuth = function(test) {


    var client_id = "c14ad44d-43d4-45e6-a81c-cc7378ca3f55";
    var client_secret = "9BTPw1H0sWfRpOfBTPTildMQyE5RJprIWEFZ67yroNnVHrqrmvKHch68WgcLAp-svH43nWndgUcDlg8MJHQ3AQ";
    var body = "grant_type=client_credentials&client_id=" + client_id + "&client_secret=" + client_secret ;

    var access_token;
    request({
        url: 'https://oauth.brightcove.com/v3/access_token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body,
        maxAttempts: 5,
        retryDelay: 5000,
        retryStrategy: request.RetryStrategies.HTTPOrNetworkError // (default) retry on 5xx or network errors
    }, function(err, response, body){
        if (response) {
            console.log('The number of request attempts: ' + response.attempts);
            //console.log('Response' + response.body)
            access_token = JSON.parse(response.body).access_token
            console.log('access_token[' + access_token + ']');
        }
    });

    
    test.done();
};
