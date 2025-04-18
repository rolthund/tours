const crypto = require('crypto');
const { promisify } = require('util')
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('./../utils/email')

const signToken = id => {
    return jwt.sign({id: id}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});
}

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true
    };
    if(process.env.NODE_ENV='production') {
        cookieOptions.secure = true;
    }
    res.cookie('jwt', token, cookieOptions);
    user.password = undefined;
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
}

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role
    });
    createSendToken(newUser, 201, res);
});

exports.login = catchAsync (async (req, res, next) => {
    const {email, password} = req.body;
    if(!email || !password) {
        return next(new AppError('Please provide email and password to login', 400));
    }

    const user = await User.findOne({email}).select('+password');

    if(!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password'), 401);
    }

    createSendToken(user, 200, res);
});

exports.protect = catchAsync( async(req, res, next) => {
    // 1) Getting token
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if(!token) {
        return next(new AppError('You are not logged in!', 401));
    }
    

    // 2) Verify the token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if(!currentUser) {
        return next(new AppError('This user no longor exists', 401));
    }
    // 4) Check if user changed passsword after JWT was issued
    if(currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError('User recently changed password', 401));
    }

    req.user = currentUser;
    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user by email
    const user = await User.findOne({email: req.body.email});

    if(!user) {
        return next(new AppError('There is no user with that email address.', 404));
    }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false }); 

    // 3) Send it to user's email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    const message = `Forgot your password? Please, submit a Patch request with your new password and passwordConfirm to ${resetURL}.\n Ingone otherwise.`
    
    try {
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token(valid for 10 min)',
            message
        });
    
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        })
    } catch(err) {
        user.createPasswordResetToken = undefined;
        user.passwordTokenExpires = undefined;
        await user.save({ validateBeforeSave: false }); 

        return next(new AppError('There was an error sending email. Try again later!', 500));
    }
    
})

exports.resetPassword = catchAsync( async(req, res, next) => {
    // 1) Get user based on the token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: {$gt: Date.now()}});
    
    // 2) If there is a user and token not expited, set a new password
    if(!user) {
        return next(new AppError('Token is invalid or expired', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3) Update changedPasswordAt for the user (automaticly done by middleware in userModel.js)

    // 4) Log the user in, send JWT
    createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async(req, res, next) => {
    // 1) Get user from collection
    const user = await User.findById(req.user.id).select('+password');
    // 2) Check if the password is correct
    if(!(await user.correctPassword(req.body.passwordCurrent, user.password))){
        return next(new AppError('Password is not correct. Please try different password', 401));
    } 
    // 3) Update the password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    // 4) Log user in, send jwt
    createSendToken(user, 200, res);
});