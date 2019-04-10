import mysqldump from 'mysqldump'
// or const mysqldump = require('mysqldump')

// dump the result straight to a file
mysqldump({
    connection: {
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'CREP',
    },
    dumpToFile: './dump_crep.sql',
})

// return the dump from the function and not to a file
const result = await mysqldump({
    connection: {
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'CREP',
    },
})