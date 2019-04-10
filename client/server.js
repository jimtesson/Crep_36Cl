var connect = require('connect');
var serveStatic = require('serve-static');
connect().use(serveStatic(__dirname)).listen(55580, function(){
    console.log('Server running on 55580...');
});
