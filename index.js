'use strict';
var request = require('requestretry');
var aws = require('aws-sdk');

function updateDynamoStatus(renditionsExist, entityId, action, entityType, versionNumber, context) {
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
                context.fail();
            } else {
                console.log("Updated callback status to [ %s ]", entityStatus);
                context.succeed();
        }
    })
}

function updateStatusIfRenditions(access_token, entityId, action, entityType, versionNumber, context) {
    access_token = "Bearer " + access_token;
    var accountId = 2221711291001;
    var sourceRequest = "https://cms.api.brightcove.com/v1/accounts/" + accountId + /videos/ + entityId + "/sources";
    console.log('Request [' + sourceRequest + ']');
    request({
        url: sourceRequest,
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': access_token
        },
        timeout: 1000,
        maxAttempts: 3,
        retryDelay: 5000,
        retryStrategy: request.RetryStrategies.HTTPOrNetworkError // (default) retry on 5xx or network errors
    }, function (err, response, body) {
        if (response) {
            var jsonResponse = JSON.parse(response.body);
            console.log('Brightcove JSON[' + jsonResponse + ']');
            updateDynamoStatus((jsonResponse[0] != null && jsonResponse[0].asset_id != null), entityId, action, entityType, versionNumber, context);
        } else {
            console.log('Error', err);
            updateDynamoStatus(false, entityId, action, entityType, versionNumber, context);
        }
    });
}

function getOauthTokenAndCheckRenditionState(action, entityId, entityType, versionNumber, context) {
    var client_id = "XXX";
    var client_secret = "YYYY";
    var body = "grant_type=client_credentials&client_id=" + client_id + "&client_secret=" + client_secret ;

    console.log("Getting Token and Checking Rendition State");

    var access_token;
    request({
        url: 'https://oauth.brightcove.com/v3/access_token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body,
        timeout: 1000,
        maxAttempts: 3,
        retryDelay: 5000,
        retryStrategy: request.RetryStrategies.HTTPOrNetworkError // (default) retry on 5xx or network errors
    }, function(err, response, body){
        if (response) {
            var accessToken = JSON.parse(response.body).access_token;
            console.log('OAuth token [' + accessToken + ']');
            if (accessToken) {
                updateStatusIfRenditions(accessToken, entityId, action, entityType, versionNumber, context);
            } else {
                console.log('Error getting oauth token setting FAIL');
                updateDynamoStatus(false, entityId, action, entityType, versionNumber, context);
            }
        } else {
            console.log('Error getting oauth token setting FAIL', err);
            updateDynamoStatus(false, entityId, action, entityType, versionNumber, context);
        }
    });
}

exports.handler = function(event, context, callback) {
    console.log("Request received:\n", JSON.stringify(event));
    event.Records.forEach(function (record) {
        if (record.eventName == 'INSERT') {
            console.log("Insert event");
            var action = record.dynamodb['NewImage']['actionType']['S'];
            console.log("Action [" + action + "]");
            var entityId = record.dynamodb['NewImage']['entity']['S'];
            console.log("EntityId [" + entityId + "]");
            var status = record.dynamodb['NewImage']['entityStatus']['S'];
            console.log("EntityId [" + entityId + "]");
            var entityType = record.dynamodb['NewImage']['entityType']['S'];
            var versionNumber = record.dynamodb['NewImage']['versionNumber']['N'];

            // Brightcove callbacks need an additional check to see if there are any renditions....
            if (status == "MAYBE_SUCCESS" && action == "CREATE" && entityType == "TITLE") {
                getOauthTokenAndCheckRenditionState(action, entityId, entityType, versionNumber, context);
            } else {
                console.log('Ignoring status [' + status + '] for entity [' + entityId + '] and type [' + entityType + '] no need to update');
                context.succeed();
            }
        }
    });
};
