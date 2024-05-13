const mongoose = require('mongoose');
const bcrypt = require("bcrypt");

// Define user schema
const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email:String,
    password:{ type:String,select:false},
    createdAt: String,
    updatedAt: String,
    orders:[],
    wishlist:[],
    cart:[],
    addresses:[],

});
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
      try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
      } catch (error) {
        next(error);
      }
    } else {
      next();
    }
  });

// Create User model
const User = mongoose.model('User', userSchema);

module.exports = User;
