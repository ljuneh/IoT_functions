const functions = require("firebase-functions");
const admin = require("firebase-admin");
const moment = require("moment");
require("moment-timezone");
moment.tz.setDefault("Asia/Seoul");
admin.initializeApp(functions.config().firebase);
// // Create and deploy your first functions
// // https://firebase.google.com/docs/functions/get-started
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const db = admin.firestore();

exports.sendFallNotification = functions.firestore.document("Users/{userId}").onUpdate((change, context) => {
    const newValue = change.after.data();
    const isfall = newValue.is_fall;
    const nowdate = moment().format("YYYY-MM-DD HH:mm:ss");
    console.log("낙상감지함수실행");
    if (isfall == false) {
        return null;
    }
    if (isfall == true) {
        const token = newValue.token;
        const payload = {
            notification: {
              title: "경고",
              body: "낙상감지 시간 : " + nowdate,
            },
            token: token,
        };
        admin.messaging().send(payload)
        .then(function(response) {
            console.log("Successfully sent message:", response);
            change.after.ref.update({
                is_send: true,
            });
        })
        .catch(function(error) {
            console.log("Error sending message:", error);
            change.after.ref.update({
                is_send: false,
            });
        });
        console.log("is_fall change", isfall);
        return change.after.ref.update({
            is_fall: false,
        });
    }
})

exports.updateTodo = functions.firestore.document("Res/{userId}").onUpdate((change, context) => {
    const uid = context.params.userId;
    const newValue = change.after.data();
    const nowdate = moment().format("YYYY-MM-DD");
    let reservation;
    let reservationdata;
    for (const [key, value] of Object.entries(newValue)) {
        reservation = key;
        reservationdata = value;
        for (const [key2, value2] of Object.entries(reservationdata)) {
            if (key2 == nowdate) {
                if (value2.ismorning == "yet") {
                    db.doc("Todo/" + uid).update({morning: value2.morning});
                }
                if (value2.islunch == "yet") {
                    db.doc("Todo/" + uid).update({lunch: value2.lunch});
                }
                if (value2.isdinner == "yet") {
                    db.doc("Todo/" + uid).update({dinner: value2.dinner});
                }
                db.doc("Todo/" + uid).update({reservation: reservation});
            }
        }
    }
})

exports.scheduledUpdateTodo = functions.pubsub.schedule("1 0 * * *").timeZone("Asia/Seoul").onRun((context) => {
    const nowdate = moment().format("YYYY-MM-DD");
    const nowdatetest = moment().format("YYYY-MM-DD HH:mm:ss");
    let reservation;
    let reservationdata;
    db.collection("Res").get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            for (const [key, value] of Object.entries(doc.data())) {
                reservation = key;
                reservationdata = value;
                if (reservationdata != {}) {
                    for (const [key2, value2] of Object.entries(reservationdata)) {
                        if (key2 == nowdate) {
                            console.log(key2 + "day exist in list Todo update");
                            db.doc("Todo/" + doc.id).update({morning: value2.morning});
                            db.doc("Todo/" + doc.id).update({lunch: value2.lunch});
                            db.doc("Todo/" + doc.id).update({dinner: value2.dinner});
                            db.doc("Todo/" + doc.id).update({reservation: reservation});
                        }
                    }
                    console.log("Todo update" + reservation);
                }
            }
            db.doc("Todo/" + doc.id).update({key: nowdatetest});
        })
    })
    console.log("nowday" + nowdatetest);
    return null;
})
