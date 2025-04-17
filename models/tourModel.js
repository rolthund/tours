const mongoose = require('mongoose');
const User = require('./userModel');

const tourSchema = mongoose.Schema({
    name: {type: String, required: [true, 'A tour must have a name'], unique: true, trim: true},
    duration: {type: Number, required: [true, 'A tour must have a duration']},
    maxGroupSize: {type: Number, required: [true, 'A tour must have a group size']},
    difficulty: {type: String, required: [true, 'A tour must have difficulty']},
    ratingsAverage: {type: Number, default: 4.5},
    ratingsQuantity: {type: Number, default: 0},
    price: {type: Number, required: [true, 'A tour must have a price']},
    priceDiscount: Number,
    summary: {type: String, trim: true},
    description: {type: String, trim: true, required: [true, 'A tour must have a description']},
    imageCover: {type: String, required: [true, 'A tour must have a cover image']},
    images: [String],
    createdAt: {type: Date, default: Date.now(), select: false},
    startDate: [Date],
    secretTout: { type: Boolean, default: false},
    startLocation: {
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    guides: [
                { type: mongoose.Schema.ObjectId, 
                  ref: 'User'  
                }
            ]
},
{
    toJSON: { virtuals: true },
    toObject: {virtuals: true }
});

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere'});
//Virtual populate
tourSchema.virtual('reviews',{
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
});

tourSchema.pre(/^find/, function(next) {
    
    this.populate({
        path: 'guides',
        select: '-__v -passwordChangedAt'
    });

    next();
});

// Code for emneddong users(guides) into tours. Not using because child referencing makes more sence here. 
// tourSchema.pre('save',async function(next) {
//     const guidesPromises = this.guides.map(async id => User.findById(id));
//     this.guides = await Promise.all(guidesPromises);
//     next();
// });
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;