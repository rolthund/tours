const { stack } = require("../app");
const AppError = require("../utils/appError");

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
}

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    })
}

const sendErrorProd = (err, res) => {
    if(err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } else {
        console.error('ERROR', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        });
    } 
}

const handleJWTError = () => new AppError('Invalid token. Please log in again', 401);
const handleExpiredJWT = () => new AppError('Tokex is expired. Please log in again', 401)

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    
    if(process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if(process.env.NODE_ENV === 'production'){
        let error = {...err};
        error.message = err.message;
        if(error.name === 'CastError') error = handleCastErrorDB(error);
        if(error.name === 'JsonWebTokenError') error = handleJWTError();
        if(error. name === 'TokenExpiredError') error = handleExpiredJWT();
        sendErrorProd(error, res);
    }
        
}