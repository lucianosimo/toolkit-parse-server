/////////BEFORE SAVES/////////
Parse.Cloud.beforeSave('Record', function(request, response) {
    var record = Parse.Object.extend('Record');
    var query = new Parse.Query(record);
  
    //Setting seconds to 0
    request.object.get('checkInDate').setSeconds(0); 
  
    //When Saving checkIn
    if (request.object.get('checkOutDate') == null) {
        //Check if record already exists without a Check-out
        query.equalTo("employee", request.object.get('employee'));
        query.doesNotExist("checkOutDate");
        query.count({
            success: function(count) {
                if (count > 0) {
                    response.error('Ya realizaste un Check-In y aún no hiciste Check-Out.');
                } else {
                    request.object.set("workedHours", 0);
                    response.success();
                }
            },
            error: function(error) {
                response.error('Error al intentar grabar el Check-In.');
            }
        });
    } //When Saving License 
    else if (request.object.get('checkOutDate') != null && request.object.get('forReason') != null) {
        //Set CheckOut Seconds to 0
        request.object.get('checkOutDate').setSeconds(0); 
  
        request.object.set("workedHours", 0);
        response.success();
    } //When Saving CheckOut 
    else {
        //Set CheckIn Seconds to 0
        request.object.get('checkOutDate').setSeconds(0); 
  
        //Get the difference between checkIn and CheckOut. Rounded to 2 decimals.
        var hours = Math.abs(request.object.get('checkOutDate') - request.object.get('checkInDate')) / 36e5;
        request.object.set("workedHours", hours.round(2));
        response.success();
    }
});
Number.prototype.round = function(places) {
    return +(Math.round(this + "e+" + places) + "e-" + places);
}
Parse.Cloud.beforeSave('Company', function(request, response) {
    //When Saving Companies verify all fields are complete.
    if (request.object.get('name') != null) {
        if (request.object.get('isActive') == null) {
            request.object.set("isActive", true);
        }
        response.success();
    } else {
        response.error('Faltan campos.');
    }
});
Parse.Cloud.beforeSave('Employee', function(request, response) {
    //When Saving Employees verify all fields are complete.
    var employee = Parse.Object.extend('Employee');
    var query = new Parse.Query(employee);
    if (request.object.get('employeeID') != null && request.object.get('name') != null && request.object.get('company') != null) {
        if (request.object.get('isActive') == null) {
            request.object.set("isActive", true);
        }
        response.success();
  
    } else {
        response.error('Faltan campos.');
    }
});
Parse.Cloud.beforeSave('Location', function(request, response) {
    //When Saving Locations verify all fields are complete.
    if (request.object.get('name') != null && request.object.get('locationCompany') != null) {
        if (request.object.get('isActive') == null) {
            request.object.set("isActive", true);
        }
        response.success();
    } else {
        response.error('Faltan campos.');
    }
});
Parse.Cloud.beforeSave('Reason', function(request, response) {
    //When Saving Reasons verify all fields are complete.
    if (request.object.get('name') != null && request.object.get('reasonCompany') != null) {
        if (request.object.get('isActive') == null) {
            request.object.set("isActive", true);
        }
        response.success();
    } else {
        response.error('Faltan campos.');
    }
});
Parse.Cloud.beforeSave(Parse.User, function(request, response) {
    //When Saving Users verify all fields are complete.
    if (request.object.get('username') != null && request.object.get('name') != null && request.object.get('email') != null) {
        if (request.object.get('isActive') == null) {
            request.object.set("isActive", true);
        }
        if (request.object.get('needsBeacon') == null) {
            request.object.set("needsBeacon", false);
        }
        if (request.object.get('beaconUUID') == null) {
            request.object.set("beaconUUID", "0");
        }
        response.success();
    } else {
        response.error('Faltan campos.');
    }
});
Parse.Cloud.afterSave('Message', function(request) {
    
    if (request.object.createdAt.getTime() === request.object.updatedAt.getTime() && 
        typeof request.object.attributes.sendNotification != 'undefined' && 
        request.object.attributes.sendNotification) {

        var notificationConditions = [];
        var notificationMessage = request.object.attributes.title + "\n\n";

        var countriesArray = request.object.attributes.country.trim().split(" ");
        var citiesArray = request.object.attributes.city.trim().split(" ");
        var storeArray = request.object.attributes.storeLocation.trim().split(" ");
        var positionsArray = request.object.attributes.employeePosition.trim().split(" ");
        var empIdsArray = request.object.attributes.employeeIds.trim().split(" ");
        var countryCodesArray = request.object.attributes.countryCode.trim().split(" ");

        if (countriesArray.length > 0 && countriesArray[0] !== "") {
            for (var i = 0; i < countriesArray.length; i++) {
                notificationConditions.push(countriesArray[i]);
            }
        }
        if (citiesArray.length > 0 && citiesArray[0] !== "") {
            for (var i = 0; i < citiesArray.length; i++) {
                notificationConditions.push(citiesArray[i]);
            }
        }
        if (storeArray.length > 0 && storeArray[0] !== "") {
            for (var i = 0; i < storeArray.length; i++) {
                notificationConditions.push(storeArray[i]);
            }
        }
        if (empIdsArray.length > 0 && empIdsArray[0] !== "") {
            for (var i = 0; i < empIdsArray.length; i++) {
                notificationConditions.push(empIdsArray[i]);
            }
        }

        if (countryCodesArray.includes("us")) {
            notificationMessage = notificationMessage + process.env.PUSH_MESSAGE_LABEL_EN;
        } else {
            notificationMessage = notificationMessage + process.env.PUSH_MESSAGE_LABEL_ES;
        }

        if (positionsArray.length > 0 && positionsArray[0] !== "") {

            for (var i = 0; i < positionsArray.length; i++) {
                for (var j = 0; j < notificationConditions.length; j++) {
                    var query = new Parse.Query(Parse.Installation);
                    var values = [];

                    values.push(positionsArray[i]);
                    values.push(notificationConditions[j]);

                    query.containsAll('channels', values);

                    Parse.Push.send({
                      where: query,
                      data: {
                        alert: notificationMessage,
                        badge: 1,
                        sound: 'default'
                      }
                    }, { 
                        useMasterKey: true 
                    }).then(() => {
                        console.log('Push ok');
                    }, (e) => {
                        console.log('Push error', e);
                    });
                }
            }
        } else {
            for (var i = 0; i < notificationConditions.length; i++) {
                var query = new Parse.Query(Parse.Installation);

                query.contains('channels', notificationConditions[i]);

                Parse.Push.send({
                  where: query,
                  data: {
                    alert: notificationMessage,
                    badge: 1,
                    sound: 'default'
                  }
                }, { 
                    useMasterKey: true 
                }).then(() => {
                    console.log('Push ok');
                }, (e) => {
                    console.log('Push error', e);
                });
            }
        }
    }
});