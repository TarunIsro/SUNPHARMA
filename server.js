var express = require("express");
var app = express(); 
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var sql = require("mssql");
var fs = require('fs');
var cron = require('node-cron');
//const cors = require('cors');



// Requiring the mongodb mongoose models files
require('./models/dbSchema.js');
require('./models/erp.js');
require('./models/wrhs.js');


//Instantiating the variales for mongoose models
var Data = mongoose.model('data');
var Erp = mongoose.model('erp');
var Wrh = mongoose.model('wrh');



//Body Parser Middleware
var jsonParser = bodyParser.json(); 
//app.use(cors);



//CORS Middleware
app.use(function (req, res, next) {
    //Enabling CORS 
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, contentType,Content-Type, Accept, Authorization");
    next();
});

//mongoose connection
mongoose.connect('mongodb://localhost:27017/hellodb');        


//Configuration details of SQL DB.
var dbConfig = {
    user:  "sa",
    password: "admin@123",
    server: "localhost",
    database:"mydb"
   };


1// SCADA DATA RETRIEVAL API FROM SQL DATABASE


cron.schedule('*/1 * * * *',() =>{
 
  var query = "select TOP 1 P1KVA,P2KVA,P3KVA,P1PF,P2PF,P3PF,TOTPF,ImWH,Log_time,Log_date,LPG,DIESEL,timestamp,ID from dbo.sim_data ORDER BY timestamp DESC";
  //var query1 = "select Time,Date,IN5_LPG from dbo.Lpg";
              sql.connect(dbConfig,  (err) => {
                
                
                  if (err) {   
                              console.log("Error while connecting database :- " + err);
                              res.send(err);
                           }
                           
                                  // create Request object
                                  var request = new sql.Request();
                                  // query to the database
                                
                           request.query(query,  (err,result) => {
                                    
                                    if (err) {
                                               console.log("Error while querying database :- " + err);
                                              
                                              }
                                              else {
                                                //console.log (result);
                                                var length = result.length;
                                                //console.log(length);
                                                var i ;
                                                //var dt = "27/02/2019";
                                                for(i=0;i<length;i++){
                                                  var info= new Data({
                                                      ID : result[i].ID,
                                                      Phase_1_volt_amps: result[i].P1KVA,
                                                      Phase_2_volt_amps: result[i].P2KVA,
                                                      Phase_3_volt_amps: result[i].P3KVA,
                                                      Phase_1_power_factor : result[i].P1PF,
                                                      Phase_2_power_factor : result[i].P2PF,
                                                      Phase_3_power_factor : result[i].P3PF,
                                                      Total_system_power_factor: result[i].TOTPF,
                                                      power_consumed: result[i].ImWH,
                                                      Time : result[i].Log_time,
                                                      Date : result[i].Log_date,
                                                      LPG : result[i].LPG,
                                                      DIESEL : result[i].DIESEL,
                                                      timestampM : result[i].timestamp
                                                  })

                                                   
                                                   Data.create(info)
                                                  .then((res,err)=>{
                                                      if(err) console.log(err);
                                                      // else{
                                                      //   Data.find({"Date" : dt }).sort({"ID":'asc'})
                                                      //   .then((resp1)=>{
                                                      //      //console.log(resp1);
                                                      //     var n = resp1.length;
                                                      //     if(n > 1){
                                                      //      for(var x = 0; x < n ;x++){
                                                      //         var y = x+1;
                                                      //         var diff0 = resp1[y].power_consumed - resp1[x].power_consumed;
                                                      //         //var diff1 = result[1][x].HSD_Main_Out - result[1][y].HSD_Main_Out;
                                                      //        // var diff2 = result[1][x].IN5_LPG - result[1][y].IN5_LPG;
                                                      
                                                      //         let updateData = {
                                                      //         power_diff : diff0
                                                      //        }
                                                      
                                                      //      var saving = [
                                                      //       Data.findOneAndUpdate({ID:resp1[y].ID},updateData,{upsert:true})
                                                      //       ]
                                                      
                                                      //       Promise.all(saving)
                                                      //       .then((re) =>{
                                                      //         console.log(re);
                                                      //       });
                                                          
                                                            
                                                      //      }   //for loop close
                                                      //     }
                                                      //     else{
                                                      //       console.log("only one record in database so processing not possible");
                                                      //     }
                                                      //   })
                                                      // }
                                                     
                                                  })
                                                  
                                              
                                                }
                                              }
                                            })
                                            
                                          }); 
                                          
                                        });
              
                      
  // cron.schedule('*/5 * * * * *',() =>{
  //   fs.readFile('barcode.txt', (err, buf) =>{
  //     console.log(buf.toString());
  //   });
  // });
             
              
// 2 POST API for the processing of data based on the given DATE
app.post('/process',jsonParser, (req,res) => {
  var dt  = req.body.date;
  

// finding the data where the Date is given date and sorted in asc oreder of Sno
  var list =[
      Data.find({"Date" : dt}).sort({"ID":'asc'}),
      
    ];
    Promise.all(list)
    .then((result,err) =>{
      if(err) console.log(err);
      var n = result[0].length;
      console.log(n);
      res.send(result);
      if(n === 1){
        console.log("only one record");
        
      // let updateData = {
      //     power_diff : 0,
      //     diesel_diff : 0,
      //     lpg_diff : 0
  
      //    }
  
      //  var saving = [
      //   Data.findOneAndUpdate({ID:result[0][0].ID},updateData,{upsert:true})
      //   ]
  
      //   Promise.all(saving)
      //   .then((re) =>{
      //     console.log(re);
      //   });
        
      //    //for loop close
      }
     else{
     
    //For loop to loop over the result and calculate the differences in power,diesel,lpg  
    for(var x = 1 ; x < n ;x++){
     
      
        var y = x-1;
        var diff0 = result[0][x].power_consumed - result[0][y].power_consumed;
        var diff1 = result[0][x].DIESEL - result[0][y].DIESEL;
        var diff2 = result[0][x].LPG - result[0][y].LPG;

     let updateData = {
        power_diff : diff0,
        diesel_diff : diff1,
        lpg_diff : diff2

       }

     var saving = [
      Data.findOneAndUpdate({ID:result[0][x].ID},updateData,{upsert:true})
      ]

      Promise.all(saving)
      .then((re) =>{
        console.log(re);
      });
      
     }   //for loop close
    }
  
    
   
  });   
       // for the Promise .then() function
});            //for the post call close


// 3 DASHBOARD TAB-1 Data retrieval api
app.post('/dashboard',jsonParser, (req,res) => {
  var Time1 = req.body.time1;
  var dt = req.body.date;
  var Time2 = req.body.time2;
  
  
 
 
  
 //for the power data
   var new1 = [ 
     Data.find({"Time" :{$gte : Time1 , $lte : Time2} , "Date" : dt}),
   
    ];
   
    
    
   Promise.all(new1)
   .then( (result) => {
     console.log(Time1);
     console.log(Time2);
     console.log(result[0]);
     
     // console.log(result[1].length);
     // console.log(result[2].length);
     res.send(result);
   
    
   })
   .catch((err) => {
     res.status(500).send(err);
   })
 
 })


 // 4 Post Api call for the date selection data rendering to client 
app.post('/date',jsonParser, (req,res) => {
  var dt = req.body.date;
  // var time = req.body.Time;
  // var dt1 = new Date(dt);
  // var x = 
console.log(dt);
 // console.log(dt1);

  var dateArr = [ 
    Data.find({"Date" : dt}).sort({"ID" : 'asc'})
   
   ]

   Promise.all(dateArr)
   .then((result) => {
      console.log(result);
      res.send(result);
   })
})


// 5 Post api for the retrieval of the PRODUCTION DATA FOR (DASHBOARD-TAB 2)
app.post('/prdt',jsonParser,(req,res)=>{

  var Dt = req.body.date2;
  var time  = req.body.timex;
  var count = req.body.counter;
  

 
   if(count%12 == 0){
    var x = count - 12;
    
    var new1 = [
      Erp.find({"Date" : Dt, "Time" : time}),
    Erp.find({"Sno" : {$gte : x , $lte : count},"Date": Dt}).sort({"Sno":'asc'})]

    Promise.all(new1)
    .then((resp) =>{
    res.send(resp[0]);
    var n = resp[1].length;
    console.log(n);
    var enrAggr = 0;
    var lpgAggr = 0;
    var dieselAggr = 0;
        for(var i = 0 ; i<n-1;i++){
     
     enrAggr += resp[1][i].eleEnCons;
     lpgAggr += resp[1][i].lpgCons;
     dieselAggr += resp[1][i].dieCons;
  
    }
    console.log(enrAggr,lpgAggr,dieselAggr);
    
    })

  }
  else{
    Erp.find({$and :[{"Date": Dt}, {"Time" : time},{"Sno": count}]})
    .then((result)=>{
      res.send(result);
    })
  }
  });



 // ANDROID APP 
 
 // Initial get api

 app.get('/initreq', (req,res)=>{
  
  async function cv(){
   var resp = await Wrh.find({}).sort({"Sno" : 'asc'});
   var customObj = await getCustomJsonObject(resp);
   await res.send(customObj);
   function getCustomJsonObject(resp){
    var outputArray = [];
    for(var i=0; i< resp.length; i++){
        var jsonObj = {
             "MaterialName": resp[i].MaterialName,
             "MaterialId": resp[i].MaterialId,
             "LocationName": resp[i].LocationName,
             "LocationId": resp[i].LocationId,
             "Quantity": resp[i].Quantity,
             "DeliveryLocationName": resp[i].DeliveryLocationName,
             "DeliveryLocationId": resp[i].DeliveryLocationID
        }
        outputArray.push(jsonObj);     
    }
    return outputArray;
}


  }
  cv();

  
});

app.post('/checklist',(req,res)=>{
 var arr = req.body;
 console.log(arr[0]);
//  async function checkList(arr1){
//    var resp = await Wrh.find({}).sort({"Sno":'asc'});
//    for(var i=0; i< arr1.length; i++){
    
//        if( arr1[i].MaterialId === resp[i].MaterialId &&
//          arr1[i].LocationName === resp[i].LocationName &&
//          arr1[i].LocationId === resp[i].LocationId && 
//          arr1[i].Quantity === resp[i].Quantity){
//           res.send("accepted");
//        }
//  }
// }
// checkList(arr);
var js1 = {
  "status" : "accepted"
}

res.send(js1);
});

 





//Setting up server
var Port = process.env.PORT || 8080;
  var server = app.listen(Port,function () {
    
    console.log("App now running on port", Port);
 });



