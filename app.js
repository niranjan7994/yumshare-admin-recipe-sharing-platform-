var createError = require('http-errors');
var express = require('express');
const path = require('path');
const session = require('express-session');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var app = express();

// Configure express-session
app.use(session({
  secret: 'your-secret-key', // Choose a secure secret
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if you're using https
}));

var indexRouter = require('./routes/index');
var userRouter = require('./routes/user');
var authRouter=require("./routes/auth");
var recipeRouter=require("./routes/recipe");
const expressLayouts = require('express-ejs-layouts');
const db = require('./database/db')
const cors = require('cors');



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
//layout setup
app.use(expressLayouts);
app.set('layout', 'layouts/main-layout');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());

app.use('/', indexRouter);
app.use('/api/user', userRouter);
app.use('/api',authRouter);
app.use('/api/recipe',recipeRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
