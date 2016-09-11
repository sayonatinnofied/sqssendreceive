var SQS = (function(){

	var access_key_id = 'AKIAJPLUN3HSVWTJ4NKQ';
	var secret_access_key = '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';
	var region = 'us-west-2';
	var sqs_api_version = '2012-11-05';
	var send_queue_url = "https://sqs.us-west-2.amazonaws.com/692480644307/smartenginerequestnew";
	var receive_queue_url = "https://sqs.us-west-2.amazonaws.com/692480644307/smartengineresponsenew";
	var retry_count = 3;
	var retry_interval = 2000;
	var wait_time_seconds = 5;

	function generateUniqueId(requesttype) {
        var min=100,max=999;
        return 'REQ'+(Math.floor(Math.random() * (max - min + 1)) + min).toString()+requesttype.toUpperCase();
    }

    function resetCount(){
    	retry_count = 3;
    }

	(function configure(){
		AWS.config.update({
			accessKeyId: access_key_id, 
			secretAccessKey: secret_access_key
		});
		AWS.config.region = region;
		console.log("AWS: ",AWS);
	})();

	var sqs = new AWS.SQS({apiVersion: sqs_api_version});

	console.log("SQS: ",sqs);

	var sendQueueMessage = function(messageKeyValue, message, callback){

		var params = {
			MessageBody: message, /* required */
			QueueUrl: send_queue_url, /* required */
			DelaySeconds: 0,
			MessageAttributes: {
				messageKey: { 
					DataType: 'String', 
					StringValue: messageKeyValue
				}
			}
		};

		sqs.sendMessage(params, function(err, data) {
			if (err) {  // an error occurred
				console.log(err, err.stack); 
			}
			else { // successful response
				console.log("Message sent.");
				console.log(data); 
				if(callback)
					callback();
			} 
		});

	}

	var receiveQueueMessage = function(messageKeyValue, callback){
		var params = {
		  QueueUrl: receive_queue_url, /* required */
		  MaxNumberOfMessages: 1,
		  AttributeNames: ['All'],
		  VisibilityTimeout: 1,
		  WaitTimeSeconds: wait_time_seconds,
		  MessageAttributeNames:['messageKey']
		};

		sqs.receiveMessage(params, function(err, data) {

			if (err) {  // an error occurred
	  			console.log(err, err.stack); 
	  		}
	  		else { // successful response
		    	if (data.Messages.length) {
					// Get the first message (should be the only one since we said to only get one above)
	  				var message = data.Messages[0];
	  				var messageKey = message.MessageAttributes['messageKey'].StringValue;
	  				console.log("Message Key Received: ", messageKey);
	  				if(messageKey === messageKeyValue.toUpperCase()) { 
	  					resetCount();
		  				var receiptHandle  = message.ReceiptHandle;
		  				if(receiptHandle) {
		  					removeQueueMessage(receiptHandle);
		  				} 
		  				if (callback) {
		  					callback(message);
		  				}
	  				} else {
	  					if(retry_count--) {
		  					console.log("Received message doesn't match the message key. Retrying again in 2s...");
		  					setTimeout(function(){
		  						receiveQueueMessage(messageKeyValue, callback);
		  					}, retry_interval);
		  				} else {
		  					console.log("Unable to fetch the message. Maximum retry limit reached.");
		  					resetCount();
		  				}
	  				}
				} else {
					if(retry_count--) {
	  					console.log("No message received. Retrying again in 2s...");
	  					setTimeout(function(){
	  						receiveQueueMessage(messageKeyValue, callback);
	  					}, retry_interval);
	  				} else {
	  					console.log("Unable to fetch the message. Maximum retry limit reached.");
	  					resetCount();
	  				}
				}
	  		} 
		});
	}

	var removeQueueMessage = function(receiptHandle){

		console.log("Message to be deleted");

		var params = {
		  QueueUrl: receive_queue_url, /* required */
		  ReceiptHandle: receiptHandle /* required */
		};
		sqs.deleteMessage(params, function(err, data){
			if (err) {  // an error occurred
				console.log(err, err.stack); 
			}
			else { // successful response
				console.log("Message deleted.");
				console.log(data); 
			}   
		});
	}


	SQS = {
		sendQueueMessage:function(requestType, message, callback){
			if(message && message.trim()){

				console.log("Message to be sent: ",message);
				if (!requestType) {
					requestType = "Default";
				};
				var messageKeyValue = generateUniqueId(requestType);
				console.log("Message key: ", messageKeyValue);

				sendQueueMessage(messageKeyValue, message.trim(), callback);

			} else {
				console.log("Can't send empty message.")
			}
		},

		receiveQueueMessage:function(messageKey, callback){
			receiveQueueMessage(messageKey, callback);
		},

		sendSqsRequest:function(requestType, message, callback){
			if(message && message.trim()){

				console.log("Message to be sent: ",message);
				if (!requestType) {
					requestType = "Default";
				};
				var messageKeyValue = generateUniqueId(requestType);
				console.log("Message key: ", messageKeyValue);

				sendQueueMessage(messageKeyValue, message.trim());

				receiveQueueMessage(messageKeyValue, callback);

			} else {
				console.log("Can't send empty message.")
			}	
		}
	};

	return SQS;

})();


var sendMessage = function(){
	var message = document.getElementById("input-text").value;
	var messageKey = "getmessage";
	console.log("Message fetched: ",message);

	SQS.sendSqsRequest(messageKey, message, function(message){
		var body = message.Body;
		document.getElementById("input-text").value = body;
		console.log("Message: ",body);
	});
};

var receiveMessage = function(){
	var messageKey = document.getElementById("input-text").value; 
	if (!messageKey) {
		messageKey = "Default"
	}; 
	console.log("Request key: ",messageKey);
	SQS.receiveQueueMessage(messageKey, function(message){
		var body = message.Body;
		document.getElementById("input-text").value = body;
		console.log("Message: ",body);
	});
};



