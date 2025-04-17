const fs = require('fs');

const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

exports.getAllTours = factory.getAll(Tour);

exports.createTour = factory.createOne(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' })

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getToursWithin = catchAsync( async(req, res, next) => {
    const {distance, latlng, unit} =  req.params;
    const [lat, lng] = latlng.split(",");

    const radius = unit === 'mi' ? distance/3963.2 : distance/6378.1
    if(!lat || !lng) {
        next(new AppError('Please provide latitiude and longitude in a format lat,lng'), 400);
    }

    const tours = await Tour.find({
        startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
    });

    res.status(200).json({
        status: 'success',
        results: tours.length,
        data: {
            data: tours
        }
    })
})

exports.getDistances = catchAsync( async(req, res, next) => {
    const {latlng, unit} =  req.params;
    const [lat, lng] = latlng.split(",");

    if(!lat || !lng) {
        next(new AppError('Please provide latitiude and longitude in a format lat,lng'), 400);
    }

    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [lng*1, lat*1]
                },
                distanceField: 'distance',
                distanceMultiplier: 0.001
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            distances
        }
    })
})