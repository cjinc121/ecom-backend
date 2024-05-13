const { default: mongoose } = require("mongoose");

const productSchema=new mongoose.Schema({

        title: String,
        description: String,
        photoUrl: String,
        originalPrice: String,
        discountPrice: Number,
        categoryName: String,
        featuredProduct: Boolean,
        inStock: Boolean,
        fastDelivery: Boolean,
        rating: Number,

})
const Product=mongoose.model('Product',productSchema);


module.exports=Product