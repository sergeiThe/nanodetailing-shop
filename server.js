const express = require('express')
require('dotenv').config()
const fileupload = require('express-fileupload')
const path = require('path')
const session = require('express-session')
const Store = require('connect-pg-simple')(session)



// db
const connection = require('./database/db')

// Route imports
const shopR = require('./routes/shop')
const adminR = require('./routes/admin')
const authR = require('./routes/auth')
const customerR = require('./routes/customer')

// Middlewares
const errorMiddleware = require('./middlewares/error-middleware')

// ========================================================
const PORT = process.env.PORT || 5000
const app = express()



app.use(express.json())
app.use(fileupload({
    debug: false,
}))
// ? sid.signature 
app.use(session({
    secret: "mysecret",
    saveUninitialized: false,
    resave: false,
    cookie: { maxAge: 3600000 },
    store: new Store({
        pool: connection
    })
}))
app.use(express.static(path.join(__dirname, "static")))
app.use('/images', express.static(path.join(__dirname, "images")))



// Allow headers
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // TODO: DEV MODE Should be changed later
    res.setHeader(
        'Access-Control-Allow-Methods',
        'OPTIONS, GET, POST, PUT, PATCH, DELETE'
    );
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});


// Routes
app.use('/admin', adminR)
app.use('/auth', authR)
app.use('/shop', shopR)
app.use('/customer', customerR)
app.use(errorMiddleware)

connection.connect()
    .then(res => {
        app.listen(PORT, () => {
            console.log(`Listening on port ${PORT}`)
        })
    })
    .catch(err => {
        console.log(err)
    })

