//var sqlite3 = require('sqlite3').verbose();
var express = require('express');
var http = require('http');
var path = require("path");
var bodyParser = require('body-parser');
var helmet = require('helmet');
var rateLimit = require("express-rate-limit");
var mysql = require('mysql');


var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);   //new
var dir = path.join(__dirname, 'public');
//express.static(root, [options]);
app.use(express.static(dir));
//app.use('/html',express.static(__dirname +'public/html'))
//app.use(express.static(__dirname + '/'));
app.use(bodyParser.urlencoded({extend:true}));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname);

// Require static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));
//app.use(favicon(path.join(__dirname,'public','src','favicon.ico')));
// Set 'views' directory for any views
// being rendered res.render()
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(__dirname + '/public'));
// Set view engine as EJS
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

var selectedFrom;
var transferToVariable;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database : 'bankingsystem',
  port : "3305"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

var customers;
con.query('SELECT * FROM customers', function (error, results, fields) {
  if (error) throw error;
  console.log('The solution is: ', results);
  //customers = JSON.parse(results);
});

app.get('/', function(req,res){
  res.render('index');
});

app.get('/customerlist', function(req,res){
  console.log('Customer List');

  con.query('SELECT * FROM customers', function (error, results, fields) {
    if (error) throw error;
    console.log('The solution is: ', results);
    res.render('Customers', {customers: results});
  });
});

app.post('/transaction', function(req,res){
  console.log('Output - ' + req.body.transferFrom);
  selectedFrom =  req.body.transferFrom;
  var selectedCustomer;
  var toCustomer;
  var queryString = 'SELECT * FROM customers where id = ' + req.body.transferFrom ;
  con.query(queryString, function (error, results, fields) {
    if (error) throw error;
    selectedCustomer = results;
    queryString = 'SELECT * FROM customers where id != ' + req.body.transferFrom ;
    con.query(queryString, function (error2, results2, fields2) {
      if (error2) throw error;
      selectedCustomer = results;
      transferToVariable = results2;
      res.render('Transaction', {customers: results, toBeSelected: results2, message: ''});
    });

  });

});
app.get('/history', function(req,res){
  console.log('Customr List');
  var queryString = 'SELECT * FROM transactions';
  con.query(queryString, function (error, results, fields) {
    console.log(results);
    if (error) throw error;
    res.render('history', {results : results});
  })

});

app.post('/process', function(req,res){
  console.log( 'Send From- ' + selectedFrom);
  console.log( 'Send to- ' + req.body.to);
  console.log( 'Amount- ' + req.body.amount);
  var amountToProcess  = req.body.amount;
  var toCustomer = req.body.to;
  var queryString = 'SELECT * FROM customers where id = ' + selectedFrom ;
  con.query(queryString, function (error, results, fields) {
  console.log(results);
  if (error) throw error;
    var queryString = 'SELECT * FROM customers where id = ' + toCustomer ;
    con.query(queryString, function (error2, results2, fields2) {
    console.log('To Retrieved');
      if (error2) throw error2;
        let fromAmount = parseInt(results[0].Amount) - parseInt(amountToProcess);
        let toAmount = parseInt(results2[0].Amount) + parseInt(amountToProcess);
console.log('fromAmount = ' + fromAmount + ' = toAmount = ' + toAmount);
        if(fromAmount < 0){
          message = 'Invalid amount';
          res.render('Transaction', {customers: results, toBeSelected: transferToVariable, message: message});
        }
        else{
        queryString = 'UPDATE customers SET Amount = ' + fromAmount + ' WHERE customers.Id = ' + selectedFrom ;
        con.query(queryString, function (error3, results3, fields3) {
          console.log('from Updated');
          if (error3) throw error3;
          queryString = 'UPDATE customers SET Amount = ' + toAmount + ' WHERE customers.Id = ' + toCustomer ;
          con.query(queryString, function (error4, results4, fields4) {
        console.log('To Updated');
            if (error4) throw error4;

              queryString = 'SELECT * FROM customers where id = ' + selectedFrom ;
              con.query(queryString, function (error5, results5, fields5) {
                console.log(results5);
                if (error5) throw error5;
                queryString = 'INSERT INTO transactions (`SenderName`, `ReceiverName`, `CreditAmount`) VALUES (\'' +
                              results[0].Name + '\' , \'' +
                              results2[0].Name + '\' , ' +
                              parseInt(amountToProcess) + ' ) ' ;
                con.query(queryString, function (error6, results6, fields6) {

                  if (error6) throw error6;
                  var message = 'Transaction completed'
                  res.render('Transaction', {customers: results5, toBeSelected: transferToVariable, message: message});
                })
              })

          })
        })
      }
    });
  });

});

server.listen(3000, function(){
  console.log("server is listening on port: 3000");
});
/*var db = new sqlite3.Database('./database/employees.db');


app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname,'./public')));
app.use(helmet());
app.use(limiter);

db.run('CREATE TABLE IF NOT EXISTS emp(id TEXT, name TEXT)');
db.run('CREATE TABLE IF NOT EXISTS msg(name TEXT, tele TEXT, email TEXT, message TEXT)');  //new

app.get('/', function(req,res){
  res.sendFile(path.join(__dirname,'./public/index.html'));
});


// Add
app.post('/tra', function(req,res){
  db.serialize(()=>{
    db.run('INSERT INTO emp(id,name) VALUES(?,?)', [req.body.empid, req.body.empname], function(err) {
      if (err) {
        console.log(err.message);
        io.emit('result', 'An error occurred');
      }
      console.log("New employee has been added");
      io.emit('result', 'Employee added successfully');
    });

  });

});


// View
app.post('/view', function(req,res){
  db.serialize(()=>{
    db.each('SELECT id ID, name NAME FROM emp WHERE id =?', [req.body.empid], function(err,row){
      if(err){
        io.emit('result', 'An error occurred');
        console.error(err.message);
      }
      io.emit('result',` ID: ${row.ID},    Name: ${row.NAME}`);
      console.log("Entry displayed successfully");
    });
  });
});


//Update
app.post('/update', function(req,res){
  db.serialize(()=>{
    db.run('UPDATE emp SET name = ? WHERE id = ?', [req.body.empname,req.body.empid], function(err){
      if(err){
        io.emit('result', 'An error occurred');
        console.error(err.message);
      }
      io.emit('result', 'Employee modified successfully');
      console.log("Entry updated successfully");
    });
  });
});

// Delete
app.post('/delete', function(req,res){
  db.serialize(()=>{
    db.run('DELETE FROM emp WHERE id = ?', req.body.empid, function(err) {
      if (err) {
        io.emit('result', 'An error occurred');
        console.error(err.message);
      }
      io.emit('result', 'Employee has been removed');
      console.log("Entry deleted");
    });
  });

});

//new
app.post('/message', function(req, res){
  db.serialize(()=>{
    db.run('INSERT INTO msg(name,tele,email,message) VALUES(?,?,?,?)', [req.body.name, req.body.telnum, req.body.emailid, req.body.message], function(err) {
      if (err) {
        console.log(err.message);
        io.emit('result', 'An error occurred');
      }
      console.log("Message recorded");
      io.emit('result', 'Message sent successfully');
    });

  });
});


// Closing the database connection.
app.get('/close', function(req,res){
  db.close((err) => {
    if (err) {
      res.send('There is some error in closing the database');
      return console.error(err.message);
    }
    console.log('Closing the database connection.');
    res.send('Database connection successfully closed');
  });

});



server.listen(3000, function(){
  console.log("server is listening on port: 3000");
});*/
// app.get('/', function(req,res){
//   res.sendFile(path.join(__dirname,'./public/html/index.html'));
// });
