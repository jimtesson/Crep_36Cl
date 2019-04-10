//Use once on install to create the tables required to store
//processed production rates 

//Require database instance for ICED Database
var create = require('./crepdb-api').createTables;

create();

