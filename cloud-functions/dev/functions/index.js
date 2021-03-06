const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);
var firestore = admin.firestore();

// for drive access
const { google } = require('googleapis');
const fs = require('fs');

exports.testDrive = functions.https.onRequest((request, response) => {

    console.log('called test drive function');

    const jwtClient = new google.auth.JWT(
        key.client_email,
        null,
        key.private_key,
        ['https://www.googleapis.com/auth/drive'],
        null
    );

    jwtClient.authorize((authErr) => {
        if (authErr) {
            console.log(authErr);
            return;
        }

        console.log('autherized ');
        const drive = google.drive({ version: 'v3', auth: jwtClient });
        // Make an authorized requests

        var fileMetadata = {
            'name': 'RootShared',
            'mimeType': 'application/vnd.google-apps.folder'
        };

        drive.files.create({
            resource: fileMetadata,
            fields: 'id'
        }, function (err, file) {
            if (err) {
                // Handle error
                console.error(err);
            } else {
                console.log('Folder Id: ', file.data.id);

                const fileId = file.data.id;

                var permission = {
                    'type': 'user',
                    'role': 'writer',
                    'emailAddress': 'darshan.narayanaswamy@tsgforce.com'
                };

                drive.permissions.create({
                    resource: permission,
                    fileId: fileId,
                    fields: 'id',
                }, function (err, res) {
                    if (err) {
                        // Handle error...
                        console.error(err);
                        //   permissionCallback(err);
                    } else {
                        console.log('Permission ID: ', res.data.id);
                        //   permissionCallback();
                    }
                });
            }
        });

    });

    return;

});


exports.usersUpdate = functions.firestore.document('users/{uid}').onUpdate(event => {

    const fileID = '1bzsEZWsQny90E2ZkEYz_35jhbCfMCVcr';
    const uid = event.params.uid;
    console.log('on update called for user id ', uid);

    var document = event.data.data();

    var isAllowed = document.checkEditor;
    var previousDocument = event.data.previous.data();
    var prevIsAllowed = previousDocument.checkEditor;

    const jwtClient = new google.auth.JWT(
        key.client_email,
        null,
        key.private_key,
        ['https://www.googleapis.com/auth/drive'],
        null
    );

    jwtClient.authorize((authErr) => {
        if (authErr) {
            console.log(authErr);
            return;
        }

        console.log('autherized ');
        const drive = google.drive({ version: 'v3', auth: jwtClient });
        // Make an authorized requests

        if (isAllowed !== null) {
            var email = document.email;

            var permission = {
                'type': 'user',
                'role': 'writer',
                'emailAddress': email
            };

            if (isAllowed && !prevIsAllowed) {
                console.log('user is allowed to access ');

                drive.permissions.create({
                    resource: permission,
                    fileId: fileID,
                    fields: 'id',
                }, function (err, res) {
                    if (err) {
                        // Handle error...
                        console.error(err);
                        //   permissionCallback(err);
                    } else {
                        console.log('Permission ID: ', res.data.id);
                        var permissionId = res.data.id;

                        userDocRef = firestore.doc('users/' + uid);
                        var transaction = firestore.runTransaction(mTransaction => {
                            return mTransaction.get(userDocRef)
                                .then(userDoc => {
                                    mTransaction.update(userDocRef, {
                                        'permissionId': permissionId
                                    });
                                })
                        }).then(result => {
                            console.log('Transaction for permission log success');
                        }).catch(err => {
                            console.error('Transaction error for permission log ', err);
                        })
                    }
                });


            } else {
                console.log('removing user access');

                var permissionID = document.permissionId;

                drive.permissions.delete({
                    fileId: fileID,
                    permissionId: permissionID
                }, function (err, res) {
                    if (err) {
                        console.error(err);
                    } else {
                        console.log('successfully removed permission');
                    }
                });

            }
        }

    });

    return "OK";

});

exports.createStudentFolder = functions.firestore.document('studentLogs/{studentId}').onCreate(event => {
    const studentId = event.params.studentId;
    const fileID = '1bzsEZWsQny90E2ZkEYz_35jhbCfMCVcr';

    console.log('on create called for student id ', studentId);

    var document = event.data.data();
    console.log('doc ', document);
    var studentName = document.studentName;

    // create student folder

    const jwtClient = new google.auth.JWT(
        key.client_email,
        null,
        key.private_key,
        ['https://www.googleapis.com/auth/drive'],
        null
    );

    jwtClient.authorize((authErr) => {
        if (authErr) {
            console.log(authErr);
            return;
        }

        console.log('autherized ');
        const drive = google.drive({ version: 'v3', auth: jwtClient });
        // Make an authorized requests

        var fileMetadata = {
            'name': studentName,
            parents: [fileID],
            'mimeType': 'application/vnd.google-apps.folder'
        };

        drive.files.create({
            resource: fileMetadata,
            fields: 'id'
        }, function (err, file) {
            if (err) {
                // Handle error
                console.error(err);
            } else {
                console.log('Folder Id: ', file.data.id);

                var folderId = file.data.id;
                // store this folder id in student doc

                studentDocRef = firestore.doc('studentLogs/' + studentId);
                var transaction = firestore.runTransaction(mTransaction => {
                    return mTransaction.get(studentDocRef)
                        .then(studentDoc => {
                            mTransaction.update(studentDocRef, {
                                folderId: folderId
                            });
                        })
                }).then(result => {
                    console.log('Transaction for added foler log success');
                }).catch(err => {
                    console.error('Transaction error for folder log ', err);
                })

            }
        });


    });
    return "OK";

});


exports.helloWorld = functions.https.onRequest((request, response) => {

    const payload = {
        notification: {
            title: 'New message!',
            body: `Darshan sent you a new message`,
            icon: 'https://goo.gl/Fz9nrQ'
            // "click_action" : "https://dummypage.com"
        }
    }

    const db = admin.firestore();
    const userRef = db.collection('users');

    userRef.get()
        .then(querySnapshot => {
            let tokens = [];
            querySnapshot.forEach(userDoc => {
                if (userDoc.data().fcmTokens) {
                    tokens = tokens.concat(Object.keys(userDoc.data().fcmTokens));
                }
            });
            if (!tokens.length) {
                throw new Error('User does not have any tokens!');
            }
            console.log('tokens ', tokens)
            return admin.messaging().sendToDevice(tokens, payload)
                .then((response) => {
                    // Response is a message ID string.
                    console.log('Successfully sent message:', response);
                })
                .catch((error) => {
                    console.log('Error sending message:', error);
                });
        })
        .catch(err => console.log(err))

    response.send("Hello from Firebase!");
});

function checkBelowThreshold(modifiedQuantity, thresholdValue, itemId, itemName) {
    if (modifiedQuantity <= thresholdValue) {
        sendAlert(itemId, itemName);
    }
}

function sendAlert(itemId, itemName) {
    const payload = {
        notification: {
            title: itemName + ' are in Danger!',
            body: itemName + ' are running out of stock',
            icon: 'https://goo.gl/Fz9nrQ',
            click_action: "http://localhost:4200/item-details/" + itemId
        }
    }

    const db = admin.firestore();
    const userRef = db.collection('users');

    userRef.get()
        .then(querySnapshot => {
            let tokens = [];
            querySnapshot.forEach(userDoc => {
                if (userDoc.data().fcmTokens) {
                    tokens = tokens.concat(Object.keys(userDoc.data().fcmTokens));
                }
            });
            if (!tokens.length) {
                throw new Error('User does not have any tokens!');
            }
            console.log('tokens ', tokens)
            return admin.messaging().sendToDevice(tokens, payload)
                .then((response) => {
                    // Response is a message ID string.
                    console.log('Successfully sent message:', response);
                })
                .catch((error) => {
                    console.log('Error sending message:', error);
                });
        })
        .catch(err => console.log(err))
}


exports.itemsCreateLog = functions.firestore.document('logs/{logId}').onCreate(event => {
    const logId = event.params.logId;

    console.log('on create called for log id ', logId);

    var document = event.data.data();

    // category,itemId,logType,quantity
    console.log('doc ', document);

    var category = document.category;
    var itemId = document.itemId;
    var logType = document.logType;
    var quantity = document.quantity;
    var timestamp = document.date;

    if (category !== "Inventory") {
        return "NOT INVENTORY LOG";
    }

    if (logType === "Issued") {
        quantity = quantity * -1;
    }

    itemDocRef = firestore.doc('items/' + itemId);
    var transaction = firestore.runTransaction(mTransaction => {
        return mTransaction.get(itemDocRef)
            .then(itemDoc => {
                var modifiedQuantity = itemDoc.data().itemQuantity + quantity;
                checkBelowThreshold(modifiedQuantity, itemDoc.data().thresholdValue, itemDoc.data().itemId, itemDoc.data().itemName);
                mTransaction.update(itemDocRef, {
                    itemQuantity: modifiedQuantity,
                    lastModified: timestamp
                });
            })
    }).then(result => {
        console.log('Transaction for added log success');
    }).catch(err => {
        console.error('Transaction error for add log ', err);
    })

    return "OK";

});

exports.itemsDeleteLog = functions.firestore.document('logs/{logId}').onDelete(event => {

    const logId = event.params.logId;
    console.log('on delete called for log id ', logId);

    var previousDocument = event.data.previous.data();

    if (previousDocument) {

        console.log('previuos doc ', previousDocument);

        var category = previousDocument.category;
        var itemId = previousDocument.itemId;
        var logType = previousDocument.logType;
        var quantity = previousDocument.quantity;
        var timestamp = previousDocument.date;

        if (category !== "Inventory") {
            return "NOT INVENTORY LOG";
        }

        if (logType === "Issued") {
            quantity = quantity * -1;
        }

        itemDocRef = firestore.doc('items/' + itemId);
        var transaction = firestore.runTransaction(mTransaction => {
            return mTransaction.get(itemDocRef)
                .then(itemDoc => {
                    var modifiedQuantity = itemDoc.data().itemQuantity - quantity;
                    checkBelowThreshold(modifiedQuantity, itemDoc.data().thresholdValue, itemDoc.data().itemId, itemDoc.data().itemName);
                    mTransaction.update(itemDocRef, {
                        itemQuantity: modifiedQuantity,
                        lastModified: timestamp
                    });
                })
        }).then(result => {
            console.log('Transaction for delete log success');
        }).catch(err => {
            console.error('Transaction error for delete log ', err);
        })

        return "OK";
    }

    return "FAILED AT FETCHING PREVIOUS DOC";
});

exports.itemsUpdateLog = functions.firestore.document('logs/{logId}').onUpdate(event => {

    const logId = event.params.logId;
    console.log('on update called for log id ', logId);

    var previousQuantity = 0;
    var previousDocument = event.data.previous.data();

    if (previousDocument) {
        console.log('previuos doc ', previousDocument);

        if (previousDocument.category !== "Inventory") {
            return "NOT INVENTORY LOG";
        }

        if (previousDocument.logType === "Issued") {
            previousQuantity = previousDocument.quantity * -1;
        } else {
            previousQuantity = previousDocument.quantity;
        }
    }

    var document = event.data.data();

    var category = document.category;
    var itemId = document.itemId;
    var logType = document.logType;
    var quantity = document.quantity;
    var timestamp = document.date;

    if (logType === "Issued") {
        quantity = quantity * -1;
    }

    itemDocRef = firestore.doc('items/' + itemId);
    var transaction = firestore.runTransaction(mTransaction => {
        return mTransaction.get(itemDocRef)
            .then(itemDoc => {
                var modifiedQuantity = itemDoc.data().itemQuantity - previousQuantity + quantity;
                checkBelowThreshold(modifiedQuantity, itemDoc.data().thresholdValue, itemDoc.data().itemId, itemDoc.data().itemName);
                mTransaction.update(itemDocRef, {
                    itemQuantity: modifiedQuantity,
                    lastModified: timestamp
                });
            })
    }).then(result => {
        console.log('Transaction for update log success');
    }).catch(err => {
        console.error('Transaction error for update log ', err);
    })

    return "OK";

});

exports.notifyNewUser = functions.auth.user().onCreate((event) => {

    const user = event.data;

    const email = user.email;
    const displayName = user.displayName;
    console.log('user ', displayName, ' logged in');

    sendUserAddedAlert(displayName);

    return "OK";

});

function sendUserAddedAlert(displayName) {
    const payload = {
        notification: {
            title: displayName + ' just logged',
            body: 'grant user previlages for ' + displayName,
            icon: 'https://goo.gl/Fz9nrQ',
            click_action: 'http://localhost:4200/AccessControl'
        }
    }

    const db = admin.firestore();
    const userRef = db.collection('users');

    userRef.get()
        .then(querySnapshot => {
            let tokens = [];
            querySnapshot.forEach(userDoc => {
                if (userDoc.data().fcmTokens && userDoc.data().checkAdmin) {
                    tokens = tokens.concat(Object.keys(userDoc.data().fcmTokens));
                }
            });
            if (!tokens.length) {
                throw new Error('User does not have any tokens!');
            }
            console.log('tokens ', tokens)
            return admin.messaging().sendToDevice(tokens, payload)
                .then((response) => {
                    // Response is a message ID string.
                    console.log('Successfully sent message:', response);
                })
                .catch((error) => {
                    console.log('Error sending message:', error);
                });
        })
        .catch(err => console.log(err))
}

const db = admin.firestore();
exports.getItemDetails = functions.https.onRequest((req, res) => {

    console.log("request method", req.method);
    var reqArray = req.body.queryResult.parameters;
    const item = reqArray['item_name'];
    var date = reqArray['date'];
    //var temp = reqArray['conjunction'];
    var conjuct = temp[0];
    //var exprtime = reqArray['expression-time'];
    //var verbTemp = reqArray['verb'];
    var send = verbTemp[2];
    var how = verbTemp[1];
    var avg = verbTemp[0];
    console.log('date is', date);
    var yestPrev = new Date(date);
    var yestPost = new Date(date);
    var daysPrior = 1;
    var oneMonth = 30;
    var oneYear = 365;
    var daysLeft, perDay, a = 0;
    var currentDate = new Date(Date.now());
    var aMonth = new Date(Date.now());
    var aYear = new Date(Date.now());
    //  console.log('req date',currentDate);
    yestPost.setDate(yestPost.getDate() + daysPrior);
    //yestPost = yestPost.toISOString();
    aMonth.setDate(aMonth.getDate() - oneMonth);
    aYear.setDate(aYear.getDate() - oneYear);
    //aMonth = aMonth.toISOString();
    console.log('req date', currentDate, 'and', aMonth, aYear);
    console.log('datee is prev', yestPrev);
    console.log('datee is', yestPost);
    var action_type = req.body.queryResult['action'];
    console.log('action type', action_type);
    var temp = "Added";
    var temps = "Issued";
    let itemValuu = 0;
    let itemCost = 0;
    let countVar = 0;
    var unitVal, itemIdValuu, adder;
    const db = admin.firestore();
    // if(action_type === 'quantity' ){


    if (action_type === 'getWhenWillItemRunOut') {//conjuct === 'when' && 


        db.collection("items").where("itemName", "==", item).get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    itemIdVal = doc.data().itemId;
                    unitVal = doc.data().unit;
                    itemVal = doc.data().itemQuantity;
                    console.log('111111111111111111st', itemIdVal);
                    db.collection("logs").where("itemId", "==", itemIdVal).where('logType', '==', temps).where('date', '>=', aMonth).where('date', '<=', currentDate).orderBy('date').get()
                        .then((querySnapshot) => {

                            querySnapshot.forEach((doc1) => {

                                console.log('111111111111111111ssst', doc1.data());

                                // doc.data() is never undefined for query doc snapshots
                                itemValuu = itemValuu + doc1.data().quantity;
                                console.log('total is :', itemValuu);
                                adder = doc1.data().addedBy;
                                console.log('docccc', doc1);
                                console.log('value is', itemIdVal, itemVal, itemValuu, adder);
                                //unitVal = doc.data().cost;
                                console.log('meowwww', doc1.data().date, aMonth);
                                countVar = countVar + 1;
                                console.log('count var :', countVar);
                            });

                            perDay = Math.ceil(itemValuu / countVar);

                            console.log('perday', perDay);

                            daysLeft = Math.ceil(itemVal / perDay);
                            console.log('daysleft', daysLeft);

                            if (req.method === 'POST') {
                                const body = req.body;
                                console.log('body ', body);
                                var reply = " You will run out of " + item + " in " + daysLeft + " days ";
                                res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type
                                res.send(JSON.stringify({
                                    "speech": reply, "displayText": reply
                                    //"speech" is the spoken version of the response, "displayText" is the visual version
                                }));
                            } else {
                                res.status(500).send('Not a valid request!');

                            }
                        })
                        .catch((error) => {
                            console.log("Error getting documents: ", error);
                        });
                });
            })
            .catch((error) => {
                console.log("Error getting documents: ", error);
            });


    } else if (action_type === 'getWhenWasItemLastBought') {//conjuct === 'when' && 

        db.collection("items").where("itemName", "==", item).get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    itemIdVal = doc.data().itemId;
                    unitVal = doc.data().unit;
                    console.log('111111111111111111st', itemIdVal);
                    db.collection("logs").where("itemId", "==", itemIdVal).where('logType', '==', temp).orderBy('date', 'desc').get()
                        .then((querySnapshot) => {
                            querySnapshot.forEach((doc1) => {
                                console.log('111111111111111111st', itemIdVal);
                                // doc.data() is never undefined for query doc snapshots
                                lastDay = new Date(doc1.data().date);
                                itemValuu = doc1.data().quantity;
                                adder = doc1.data().addedBy;
                                console.log('docccc', doc1);
                                console.log('value is', itemIdVal, itemValuu, adder);
                                //unitVal = doc.data().cost;
                                if (req.method === 'POST') {
                                    const body = req.body;
                                    console.log('body ', body);
                                    var reply = item + " was last bought on " + lastDay;
                                    res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type
                                    res.send(JSON.stringify({
                                        "speech": reply, "displayText": reply
                                        //"speech" is the spoken version of the response, "displayText" is the visual version
                                    }));
                                } else {
                                    res.status(500).send('Not a valid request!');

                                }


                            });
                        })
                        .catch((error) => {
                            console.log("Error getting documents: ", error);
                        });
                });
            })
            .catch((error) => {
                console.log("Error getting documents: ", error);
            });



    }
    else if (action_type === '') {
        if (exprtime === 'lastmonth') {
            db.collection("items").where("itemName", "==", item).get()
                .then((querySnapshot) => {
                    querySnapshot.forEach((doc) => {
                        itemIdVal = doc.data().itemId;
                        unitVal = doc.data().unit;
                        itemVal = doc.data().itemQuantity;
                        console.log('111111111111111111st', itemIdVal);
                        db.collection("logs").where("itemId", "==", itemIdVal).where('logType', '==', temp).where('date', '>=', aMonth).where('date', '<=', currentDate).orderBy('date').get()
                            .then((querySnapshot) => {

                                querySnapshot.forEach((doc1) => {

                                    console.log('111111111111111111ssst', doc1.data());

                                    // doc.data() is never undefined for query doc snapshots
                                    itemCost = itemCost + doc1.data().cost;
                                    console.log('total is :', itemValuu)
                                    adder = doc1.data().addedBy;
                                    console.log('docccc', doc1);
                                    console.log('value is', itemIdVal, itemVal, itemCost, adder);
                                    //unitVal = doc.data().cost;
                                    console.log('meowwww', doc1.data().date, aYear);

                                });

                                if (req.method === 'POST') {
                                    const body = req.body;
                                    console.log('body ', body);
                                    var reply = " Last month,you spent Rs." + itemCost + " on " + item;
                                    res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type
                                    res.send(JSON.stringify({
                                        "speech": reply, "displayText": reply
                                        //"speech" is the spoken version of the response, "displayText" is the visual version
                                    }));
                                } else {
                                    res.status(500).send('Not a valid request!');

                                }
                            })
                            .catch((error) => {
                                console.log("Error getting documents: ", error);
                            });
                    });
                })
                .catch((error) => {
                    console.log("Error getting documents: ", error);
                });

        }
        else if (exprtime === 'lastyear') {

            db.collection("items").where("itemName", "==", item).get()
                .then((querySnapshot) => {
                    querySnapshot.forEach((doc) => {
                        itemIdVal = doc.data().itemId;
                        unitVal = doc.data().unit;
                        itemVal = doc.data().itemQuantity;
                        console.log('111111111111111111st', itemIdVal);
                        db.collection("logs").where("itemId", "==", itemIdVal).where('logType', '==', temp).where('date', '>=', aYear).where('date', '<=', currentDate).orderBy('date').get()
                            .then((querySnapshot) => {

                                querySnapshot.forEach((doc1) => {

                                    console.log('111111111111111111ssst', doc1.data());

                                    // doc.data() is never undefined for query doc snapshots
                                    itemCost = itemCost + doc1.data().cost;
                                    console.log('total is :', itemValuu)
                                    adder = doc1.data().addedBy;
                                    console.log('docccc', doc1);
                                    console.log('value is', itemIdVal, itemVal, itemCost, adder);
                                    //unitVal = doc.data().cost;
                                    console.log('meowwww', doc1.data().date, aYear);

                                });

                                if (req.method === 'POST') {
                                    const body = req.body;
                                    console.log('body ', body);
                                    var reply = "Last year,you spent Rs." + itemCost + " on " + item;
                                    res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type
                                    res.send(JSON.stringify({
                                        "speech": reply, "displayText": reply
                                        //"speech" is the spoken version of the response, "displayText" is the visual version
                                    }));
                                } else {
                                    res.status(500).send('Not a valid request!');

                                }
                            })
                            .catch((error) => {
                                console.log("Error getting documents: ", error);
                            });
                    });
                })
                .catch((error) => {
                    console.log("Error getting documents: ", error);
                });


        }



    }
    else if (action_type === 'ave') {
        if (exprtime === 'lastmonth') {
            db.collection("items").where("itemName", "==", item).get()
                .then((querySnapshot) => {
                    querySnapshot.forEach((doc) => {
                        itemIdVal = doc.data().itemId;
                        unitVal = doc.data().unit;
                        itemVal = doc.data().itemQuantity;
                        console.log('111111111111111111st', itemIdVal);
                        db.collection("logs").where("itemId", "==", itemIdVal).where('logType', '==', temp).where('date', '>=', aMonth).where('date', '<=', currentDate).orderBy('date').get()
                            .then((querySnapshot) => {

                                querySnapshot.forEach((doc1) => {

                                    console.log('111111111111111111ssst', doc1.data());

                                    // doc.data() is never undefined for query doc snapshots
                                    itemCost = itemCost + doc1.data().cost;
                                    console.log('total is :', itemCost);
                                    adder = doc1.data().addedBy;
                                    console.log('docccc', doc1);
                                    console.log('value is', itemIdVal, itemVal, itemValuu, adder);
                                    //unitVal = doc.data().cost;
                                    console.log('meowwww', doc1.data().date, aMonth);
                                    countVar = countVar + 1;
                                    console.log('count var :', countVar);
                                });
                                avgMonth = Math.ceil(itemCost / countVar);

                                if (req.method === 'POST') {
                                    const body = req.body;
                                    console.log('body ', body);
                                    var reply = " Average spent on " + item + "s in the past month is :  Rs." + avgMonth;
                                    res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type
                                    res.send(JSON.stringify({
                                        "speech": reply, "displayText": reply
                                        //"speech" is the spoken version of the response, "displayText" is the visual version
                                    }));
                                } else {
                                    res.status(500).send('Not a valid request!');

                                }
                            })
                            .catch((error) => {
                                console.log("Error getting documents: ", error);
                            });
                    });
                })
                .catch((error) => {
                    console.log("Error getting documents: ", error);
                });

        }
        else if (exprtime === 'lastyear') {
            db.collection("items").where("itemName", "==", item).get()
                .then((querySnapshot) => {
                    querySnapshot.forEach((doc) => {
                        itemIdVal = doc.data().itemId;
                        unitVal = doc.data().unit;
                        itemVal = doc.data().itemQuantity;
                        console.log('111111111111111111st', itemIdVal);
                        db.collection("logs").where("itemId", "==", itemIdVal).where('logType', '==', temp).where('date', '>=', aYear).where('date', '<=', currentDate).orderBy('date').get()
                            .then((querySnapshot) => {

                                querySnapshot.forEach((doc1) => {

                                    console.log('111111111111111111ssst', doc1.data());

                                    // doc.data() is never undefined for query doc snapshots
                                    itemCost = itemCost + doc1.data().cost;
                                    console.log('total is :', itemCost);
                                    adder = doc1.data().addedBy;
                                    console.log('docccc', doc1);
                                    console.log('value is', itemIdVal, itemVal, itemValuu, adder);
                                    //unitVal = doc.data().cost;
                                    console.log('meowwww', doc1.data().date, aMonth);
                                    console.log('count var :', countVar);
                                    countVar = countVar + 1;
                                    console.log('count var :', countVar);
                                });

                                avgYear = Math.ceil(itemCost / countVar);
                                // a = itemValuu % oneMonth;
                                // console.log('perday', perDay, perDay - a);

                                // daysLeft = Math.ceil(itemVal / perDay);
                                // console.log('daysleft', daysLeft);

                                if (req.method === 'POST') {
                                    const body = req.body;
                                    console.log('body ', body);
                                    var reply = " Average spent on" + item + "s in the past year is :  Rs." + avgYear;
                                    res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type
                                    res.send(JSON.stringify({
                                        "speech": reply, "displayText": reply
                                        //"speech" is the spoken version of the response, "displayText" is the visual version
                                    }));
                                } else {
                                    res.status(500).send('Not a valid request!');

                                }
                            })
                            .catch((error) => {
                                console.log("Error getting documents: ", error);
                            });
                    });
                })
                .catch((error) => {
                    console.log("Error getting documents: ", error);
                });



        }
    }
    else if (action_type == 'getItemQuantity') {

        db.collection("items").where("itemName", "==", item).get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    // doc.data() is never undefined for query doc snapshots
                    itemVal = doc.data().itemQuantity;
                    unitVal = doc.data().unit;
                    const itemIdVal = doc.data().itemId;
                    console.log('itemIdVal is', itemIdVal);

                    if (req.method === 'POST') {
                        const body = req.body;
                        console.log('body ', body);
                        var reply = "Quantity of " + item + "s left :" + itemVal + unitVal;
                        res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type
                        res.send(JSON.stringify({
                            "speech": reply, "displayText": reply
                            //"speech" is the spoken version of the response, "displayText" is the visual version
                        }));
                    } else {
                        res.status(500).send('Not a valid request!');

                    }

                });
            })
            .catch((error) => {
                console.log("Error getting documents: ", error);
            });
    }
    else if (action_type === 'getUserWhoBought') {

        //return this.firestore.collection<ItemLog>(`logs`, ref => ref.where('itemId', '==', itemId)
        //  .where('date', '>=', startDate).where('date', '<=', endDate).orderBy('date')).valueChanges();
        db.collection("items").where("itemName", "==", item).get()
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    itmIdVal = doc.data().itemId;
                    unitVal = doc.data().unit;
                    console.log('111111111111111111st', itmIdVal);
                    db.collection("logs").where("itemId", "==", itmIdVal).where('logType', '==', temp).where('date', '>=', yestPrev).where('date', '<=', yestPost).orderBy('date', 'desc')
                        .get()
                        .then((querySnapshot) => {
                            console.log('qsp', querySnapshot);
                            querySnapshot.forEach((doc1) => {
                                console.log('111111111111111111st2nd', itmIdVal);
                                // doc.data() is never undefined for query doc snapshots
                                itmValuu = doc1.data().quantity;
                                adder = doc1.data().addedBy;
                                console.log('docccc', doc1);
                                console.log('value is', itmIdVal, itmValuu, adder);
                                //unitVal = doc.data().cost;
                                admin.auth().getUser(adder)
                                    .then(function (userRecord) {
                                        console.log('adddddr', adder);
                                        dispName = userRecord.displayName;
                                        if (req.method === 'POST') {
                                            const body = req.body;
                                            console.log('body ', body);
                                            var reply = dispName + " bought " + itmValuu + " " + unitVal + " of " + item + " on " + date;
                                            res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type
                                            res.send(JSON.stringify({
                                                "speech": reply, "displayText": reply
                                                //"speech" is the spoken version of the response, "displayText" is the visual version
                                            }));
                                        } else {
                                            res.status(500).send('Not a valid request!');

                                        }

                                    })
                                    .catch(function (error) {
                                        console.log("Error fetching user data:", error);
                                    });
                            });
                        })
                        .catch((error) => {
                            console.log("Error getting documents: ", error);
                        });

                });
            })
            .catch((error) => {
                console.log("Error getting documents: ", error);
            });

    }
    console.log('yesss');

});



exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {



    let action = request.body.queryResult.action;
    const parameters = request.body.queryResult.parameters;

    const inputContexts = request.body.queryResult.contexts;

    console.log(action);
    console.log(parameters);

    let res = '';
    switch (action) {
        // working
        case 'getItemQuantity':
            getItemQuantity(parameters, response);
            break;
        case 'getAverageSpent':
            getAverageSpent(parameters, response);
            break;
        case 'getUserWhoBought':
            getUserWhoBought(parameters, response);
            break;
        // working
        case 'getWhenWasItemLastBought':
            getWhenWasItemLastBought(parameters, response);
            break;
        // working
        case 'getWhenWillItemRunOut':
            getWhenWillItemRunOut(parameters, response);
            break;
        // case 'getItemBoughtQuantity':
        //     getItemBoughtQuantity(parameters,response);
        //     break;
        default:
            res = {
                "fulfillmentText": "This is a text response",
                "fulfillmentMessages": [
                    {
                        "card": {
                            "title": "card title",
                            "subtitle": "card text",
                            "imageUri": "https://assistant.google.com/static/images/molecule/Molecule-Formation-stop.png",
                            "buttons": [
                                {
                                    "text": "button text",
                                    "postback": "https://assistant.google.com/"
                                }
                            ]
                        }
                    }
                ]
            };
            break;
    }

    // response.send(res);
    // return;
});

function getItemQuantity(parameters, response) {
    console.log('inside get item quantity with params ', parameters);
    const itemName = parameters['item_name'].trim();
    console.log('item is', itemName);
    db.collection("items").where("itemName", "==", itemName).get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                // doc.data() is never undefined for query doc snapshots 
                console.log('doc ', doc);
                itemVal = doc.data().itemQuantity;
                unitVal = doc.data().unit;
                const itemIdVal = doc.data().itemId;
                let res = {};
                res.fulfillmentText = "Quantity of " + itemName + " is " + itemVal + " " + unitVal;
                res.fulfillmentMessages = [
                    {
                        "card": {
                            "title": itemName,
                            "subtitle": "Quantity of " + itemName + "s is " + itemVal + unitVal,
                            "imageUri": "https://assistant.google.com/static/images/molecule/Molecule-Formation-stop.png",
                            "buttons": [
                                {
                                    "text": "Go to " + itemName,
                                    "postback": "http://localhost:4200/item-details/" + itemIdVal
                                }
                            ]
                        }
                    }
                ]
                response.send(res);
            });
        })
        .catch((error) => {
            console.log("Error getting documents: ", error);
        });

}

function getUserWhoBought(parameters, response) {
    const itemName = parameters['item_name'].trim();
    const date = parameters['date'];
    console.log('date is', date);
    var yestPrev = new Date(date);
    var yestPost = new Date(date);
    var daysPrior = 1;
    var temp = "Added";

    yestPost.setDate(yestPost.getDate() + daysPrior);
    console.log('datess', date, yestPost, yestPrev);
    console.log('inside get user who bought ', parameters);

    console.log('item is', itemName);
    db.collection("items").where("itemName", "==", itemName).get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                itmIdVal = doc.data().itemId;
                unitVal = doc.data().unit;
                console.log('111111111111111111st', itmIdVal);
                db.collection("logs").where("itemId", "==", itmIdVal).where('logType', '==', temp).where('date', '>=', yestPrev).where('date', '<', yestPost).orderBy('date', 'desc')
                    .get()
                    .then((querySnapshot) => {
                        console.log('qsp', querySnapshot);
                        querySnapshot.forEach((doc1) => {
                            console.log('111111111111111111st2nd', itmIdVal);
                            // doc.data() is never undefined for query doc snapshots
                            itmValuu = doc1.data().quantity;
                            adder = doc1.data().addedBy;
                            console.log('docccc', doc1);
                            console.log('value is', itmIdVal, itmValuu, adder);
                            // unitVal = doc.data().cost;
                            admin.auth().getUser(adder)
                                .then(function (userRecord) {
                                    console.log('adddddr', adder);
                                    dispName = userRecord.displayName;

                                    let res = {};
                                    res.fulfillmentText = dispName + " bought " + itmValuu + " " + unitVal + " of " + itemName + " on " + date;
                                    res.fulfillmentMessages = [
                                        {
                                            "card": {
                                                "title": itemName,
                                                "subtitle": dispName + " bought " + itmValuu + " " + unitVal + " of " + itemName + " on " + date,
                                                "imageUri": "https://assistant.google.com/static/images/molecule/Molecule-Formation-stop.png",
                                                "buttons": [
                                                    {
                                                        "text": "Go to " + itemName,
                                                        "postback": "http://localhost:4200/item-details/" + itmIdVal
                                                    }
                                                ]
                                            }
                                        }
                                    ]
                                    response.send(res);
                                })
                                .catch(function (error) {
                                    console.log("Error fetching user data:", error);
                                });
                        });
                    })
                    .catch((error) => {
                        console.log("Error getting documents: ", error);
                    });

            });
        })
        .catch((error) => {
            console.log("Error getting documents: ", error);
        });

}

function getAverageSpent(parameters, response) {
    var temp = "Added";
    let itemCost = 0;
    let countVar = 0;
    console.log('inside get item quantity with params ', parameters);
    const itemName = parameters['item_name'].trim();
    var startDate = new Date(parameters.date - period['startDate']);
    var stopDate = new Date(parameters.date - period['endDate']);
    console.log('item is', itemName, startDate, endDate);

    db.collection("items").where("itemName", "==", itemName).get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                itemIdVal = doc.data().itemId;
                unitVal = doc.data().unit;
                itemVal = doc.data().itemQuantity;
                console.log('111111111111111111st', itemIdVal);
                db.collection("logs").where("itemId", "==", itemIdVal).where('logType', '==', temp).where('date', '>=', startDate).where('date', '<=', stopDate).orderBy('date').get()
                    .then((querySnapshot) => {

                        querySnapshot.forEach((doc1) => {

                            console.log('111111111111111111ssst', doc1.data());

                            // doc.data() is never undefined for query doc snapshots
                            itemCost = itemCost + doc1.data().cost;
                            console.log('total is :', itemCost);
                            adder = doc1.data().addedBy;
                            console.log('docccc', doc1);
                            console.log('value is', itemIdVal, itemVal, itemValuu, adder);
                            //unitVal = doc.data().cost;
                            console.log('meowwww', doc1.data().date, aMonth);
                            countVar = countVar + 1;
                            console.log('count var :', countVar);
                        });
                        avgMonth = Math.ceil(itemCost / countVar);

                        let res = {};
                        res.fulfillmentText = "Average amount" + "is Rs" + avgMonth;
                        res.fulfillmentMessages = [
                            {
                                "card": {
                                    "title": itemName,
                                    "subtitle": "Average amount" + "is Rs" + avgMonth,
                                    "imageUri": "https://assistant.google.com/static/images/molecule/Molecule-Formation-stop.png",
                                    "buttons": [
                                        {
                                            "text": "Go to " + itemName,
                                            "postback": "http://localhost:4200/item-details/" + itemIdVal
                                        }
                                    ]
                                }
                            }
                        ]
                        response.send(res);
                    });
            })
                .catch((error) => {
                    console.log("Error getting documents: ", error);
                });

        })
        .catch((error) => {
            console.log("Error getting documents: ", error);
        });



}


function getWhenWasItemLastBought(parameters, response) {
    var temp = "Added";
    console.log('inside get item quantity with params ', parameters);
    const itemName = parameters['item_name'].trim();
    const date = parameters['date'];
    console.log('item is', itemName);
    db.collection("items").where("itemName", "==", itemName).get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                itemIdVal = doc.data().itemId;
                unitVal = doc.data().unit;
                console.log('111111111111111111st', itemIdVal);
                db.collection("logs").where("itemId", "==", itemIdVal).where('logType', '==', temp).orderBy('date', 'desc').get()
                    .then((querySnapshot) => {
                        querySnapshot.forEach((doc1) => {
                            console.log('111111111111111111st', itemIdVal);
                            // doc.data() is never undefined for query doc snapshots
                            lastDay = new Date(doc1.data().date);
                            itemValuu = doc1.data().quantity;
                            adder = doc1.data().addedBy;
                            console.log('docccc', doc1);
                            console.log('value is', itemIdVal, itemValuu, adder);
                            let res = {};
                            res.fulfillmentText = itemName + " was last bought on " + lastDay;
                            res.fulfillmentMessages = [
                                {
                                    "card": {
                                        "title": itemName,
                                        "subtitle": itemName + " was last bought on " + lastDay,
                                        "imageUri": "https://assistant.google.com/static/images/molecule/Molecule-Formation-stop.png",
                                        "buttons": [
                                            {
                                                "text": "Go to " + itemName,
                                                "postback": "http://localhost:4200/item-details/" + itemIdVal
                                            }
                                        ]
                                    }
                                }
                            ]
                            response.send(res);

                        });
                    })
                    .catch((error) => {
                        console.log("Error getting documents: ", error);
                    });
            });
        })
        .catch((error) => {
            console.log("Error getting documents: ", error);
        });


}

function getWhenWillItemRunOut(parameters, response) {
    console.log('inside get item quantity with params ', parameters);
    const itemName = parameters['item_name'].trim();
    console.log('item is', itemName);
    var oneMonth = 30;
    var temps = "Issued";
    var daysLeft;
    var currentDate = new Date(Date.now());
    var aMonth = new Date(Date.now());
    aMonth.setDate(aMonth.getDate() - oneMonth);
    var itemValuu = 0, countVar = 0;
    db.collection("items").where("itemName", "==", itemName).get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                itemIdVal = doc.data().itemId;
                unitVal = doc.data().unit;
                itemVal = doc.data().itemQuantity;
                console.log('111111111111111111st', itemIdVal);
                db.collection("logs").where("itemId", "==", itemIdVal).where('logType', '==', temps).where('date', '>=', aMonth).where('date', '<=', currentDate).orderBy('date').get()
                    .then((querySnapshot) => {

                        querySnapshot.forEach((doc1) => {

                            console.log('111111111111111111ssst', doc1.data());

                            // doc.data() is never undefined for query doc snapshots
                            itemValuu = itemValuu + doc1.data().quantity;
                            console.log('total is :', itemValuu);
                            adder = doc1.data().addedBy;
                            console.log('docccc', doc1);
                            console.log('value is', itemIdVal, itemVal, itemValuu, adder);
                            //unitVal = doc.data().cost;
                            console.log('meowwww', doc1.data().date, aMonth);
                            countVar = countVar + 1;
                            console.log('count var :', countVar);
                        });

                        perDay = Math.ceil(itemValuu / countVar);

                        console.log('perday', perDay);

                        daysLeft = Math.ceil(itemVal / perDay);
                        console.log('daysleft', daysLeft);

                        let res = {};
                        res.fulfillmentText = "You will run out of " + itemName + " in " + daysLeft + " days ";
                        res.fulfillmentMessages = [
                            {
                                "card": {
                                    "title": itemName,
                                    "subtitle": "You will run out of " + itemName + " in " + daysLeft + " days ",
                                    "imageUri": "https://assistant.google.com/static/images/molecule/Molecule-Formation-stop.png",
                                    "buttons": [
                                        {
                                            "text": "Go to " + itemName,
                                            "postback": "http://localhost:4200/item-details/" + itemIdVal
                                        }
                                    ]
                                }
                            }
                        ]
                        response.send(res);

                    })
                    .catch((error) => {
                        console.log("Error getting documents: ", error);
                    });
            });
        })
        .catch((error) => {
            console.log("Error getting documents: ", error);
        });

}

// function getItemBoughtQuantity(parameters,response){

// }


