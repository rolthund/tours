const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync (async(req, res, next) => {
    // Get currently booked tour 
    const tour = await Tour.findById(req.params.tourID)
    // Create a session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourID}&user=${req.user.id}&price=${tour.price}`,
        cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
        customer_email: req.user.email,
        client_reference_id: req.params.tourID,
        line_items: [
            {
                name: `${tour.name} Tour`,
                description: tour.summary,
                images: [],
                amount: tour.price*100,
                currency: 'usd',
                quantity: 1
            }
        ]
    });

    //Send it to client
    res.status(200).json({
        status: 'success',
        session
    })
});

exports.createBookingCheckout = (req, res, next) => {
    const {tour, user, price} = req.query;

    if(!tour && !user && !price) {
        
    }
}