'use strict';
var request = require('requestretry');
var aws = require('aws-sdk');

function updateDynamoStatus(renditionsExist, entityId, action, entityType, versionNumber) {
    console.log('Updating Dynamo[' + renditionsExist + ']');

    var dynamodb = new aws.DynamoDB();

    var tableName = "BrightcoveCallBackEvents";
    var datetime = new Date().toISOString();
    var entityStatus = (renditionsExist) ? "SUCCESS" : "FAIL";
    
    dynamodb.updateItem({   "TableName": tableName,
                            "Key": { "entity" : { "S": entityId },
                                     "notificationDateTime" : {"S": datetime}},
                            "UpdateExpression": "set entityStatus = :entityStatusVal, actionType = :actionVal, entityType = :entityTypeVal, versionNumber = :versionNumber",
                            "ExpressionAttributeValues": { ":entityStatusVal" : { "S" : entityStatus },
                                                           ":actionVal" : { "S" : action },
                                                           ":entityTypeVal" : { "S" : entityType},
                                                           ":versionNumber" : {"S" : versionNumber}}
        }, function(err, data) {
            if (err) {
                console.log(err);
            } else {
                console.log("Updated callback status to [ %s ]", entityStatus);
        }
    })
}

function updateStatusIfRenditions(access_token, entityId, action, entityType, versionNumber) {
    access_token = "Bearer " + access_token;
    var accountId = 2221711291001;
    var sourceRequest = "https://cms.api.brightcove.com/v1/accounts/" + accountId + /videos/ + entityId + "/sources";
    request({
        url: sourceRequest,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': access_token
        },
        timeout: 1000 * 5,
        maxAttempts: 3,
        retryDelay: 5000,
        retryStrategy: request.RetryStrategies.HTTPOrNetworkError // (default) retry on 5xx or network errors
    }, function (err, response, body) {
        if (response) {
            var jsonResponse = JSON.parse(response.body);
            updateDynamoStatus((jsonResponse[0] != null && jsonResponse[0].asset_id != null), entityId, action, entityType, versionNumber);
        } else {
            console.log('Error', err);
            updateDynamoStatus(false, entityId, action, entityType, versionNumber);
        }
    });
}

function getOauthTokenAndCheckRenditionState(action, entityId, entityType, versionNumber) {
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
            var accessToken = JSON.parse(response.body).access_token;
            console.log('OAuth token' + accessToken)
            if (accessToken) {
                updateStatusIfRenditions(accessToken, entityId, action, entityType, versionNumber);
            } else {
                console.log('Error getting oauth token setting FAIL');
                updateDynamoStatus(false, entityId, action, entityType, versionNumber);
            }
        } else {
            console.log('Error getting oauth token setting FAIL', err);
            updateDynamoStatus(false, entityId, action, entityType, versionNumber);
        }
    });
}

exports.handler = function(event, context, callback) {
    console.log("Request received:\n", JSON.stringify(event));
    event.Records.forEach(function (record) {
        if (record.eventName == 'INSERT') {
            var action = record.dynamodb['NewImage']['actionType']['S'];
            var entityId = record.dynamodb['NewImage']['entity']['S'];
            var status = record.dynamodb['NewImage']['entityStatus']['S'];
            var entityType = record.dynamodb['NewImage']['entityType']['S'];
            var versionNumber = record.dynamodb['NewImage']['versionNumber']['N'];

            // Brightcove callbacks need an additional check to see if there are any renditions....
            if (status == "MAYBE_SUCCESS" && action == "CREATE" && entityType == "TITLE") {
                getOauthTokenAndCheckRenditionState(action, entityId, entityType, versionNumber);
            }
        }
    });
    console.log("Successfully processed "+event.Records.length+" records.");
    callback(null, "Successfully processed "+event.Records.length+" records.");
};