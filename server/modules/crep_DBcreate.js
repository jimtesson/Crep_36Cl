 var mysql      = require('mysql');
 var connection = mysql.createConnection({
	 		host: 'localhost',
	 		user: 'root',
	 		password: 'chlore36',
	  });
 
 connection.connect(function(err){
	 if(err) throw err;
	 console.log("Connected");
	 connection.query("CREATE DATABASE CREP",function(err,result) {
		 if(err) throw err;
		 console.log("DB created");
	 });
 });

