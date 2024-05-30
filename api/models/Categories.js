const { default: mongoose, models } = require("mongoose");

const categoriesSchema=new mongoose.Schema({
    categoryName:String,
    photoUrl:String,
})

 const Categories=mongoose.model("Categories",categoriesSchema);

 module.exports =Categories;
