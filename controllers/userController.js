const User = require('./../models/userModel');
const multer = require('multer');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
    const newObj = {}
    Object.keys(obj).forEach(el => {
        if(allowedFields.includes(el)) {
            newObj[el] = obj[el];
        }
    })
    return newObj;
}
const upload = multer({ dest: 'public/img/users'});
exports.uploadPhoto = upload.single('photo');

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
}

exports.updateMe = catchAsync( async(req, res, next) => {
    // 1) Create an error if user posted password data
    if(req.body.password || req.body.passwordConfirm) {
        return next(new AppError('This route is not for password updates, Please use /updateMyPassword', 400));
    }

    // Filtered fields that are not allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email');
    // Update user document
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, { new: true, runValidators: true});
    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });
});

exports.deleteMe = catchAsync( async(req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, {active: false});

    res.status(204).json({
        status: 'success',
        data: null
    })
});

exports.getAllUsers = catchAsync( async (req, res, next) => {
    const users = await User.find();
        res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    });
})
exports.createUser = factory.createOne(User);

exports.getUser = factory.getOne(User);
// Do not update password with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);