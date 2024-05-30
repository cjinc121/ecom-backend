const express = require('express');
const cors=require('cors')
require("dotenv").config();
const { default: mongoose } = require('mongoose');
const Categories = require('./models/Categories');
const bcrypt = require("bcrypt");

const User = require('./models/User');
const Product = require('./models/Products');
const jwt=require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const JWT_SECRET = process.env.JWT_SECRET
const {z}=require('zod');
const { ObjectId } = require('mongodb');

const signupSchema =z.object( {
    firstName:z.string().min(1,{ message: "Must be 1 or more characters long" }),
lastName:z.string().min(1,{ message: "Must be 1 or more characters long" }),
email:z.string().email({ message: "Invalid email address" }),
password:z.string().min(6,{ message: "Must be 6 or more characters long" })
})
const loginSchema =z.object( {
email:z.string().email({ message: "Invalid email address" }),
password:z.string().min(6,{ message: "Must be 6 or more characters long" })
})

const url = process.env.MONGO_URL;
const dbName = process.env.MONGO_NAME;


const app = express();
const PORT = process.env.PORT
mongoose.connect(url+dbName)
.then(() => {
    console.log('Connected to MongoDB');
    // Start your Express server
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
})
.catch(error => {
    console.error('Error connecting to MongoDB:', error);
});


app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: ["http://localhost:3000", "https://gentleman-shoes.vercel.app"]
}));

// unauthorised endpoints
app.get('/', async (req, res) => {
    
    res.send('Hello, World!');
});
app.get('/api/categories', async (req, res) => {
    const categories=await Categories.find({})
    res.status(200).send({categories});
});
app.get('/api/products', async (req, res) => {
    const products=await Product.find({})
    res.status(200).send({products});
});
app.get('/api/products/:id', async (req, res) => {
    try{
        if(req.params.id)
       { const product=await Product.findOne({_id:new ObjectId(req.params.id)});
        if(product)
       { 
        res.status(200).send({product});}
        else
{    res.status(400).send({success:false,message:'id not provided'})
}
    }else
    res.status(400).send({success:false,message:'id not provided'})
    }catch(err){
console.log(err)
    }
    
});

//auth endpoints
app.post('/api/auth/signup',async(req,res)=>{
    const result=signupSchema.safeParse(req.body)
    console.log(result.success)
    if(result.success)
    {
       const userAlreadyExists=await User.findOne({email:req.body.email})
if(userAlreadyExists)
{
    res.status(400).send({sucess:false,error:'Email already Exists'});

}
else{
   const newUser= await User.create(req.body);
   console.log('User:',newUser);
    const token = jwt.sign({firstName:newUser.firstName,email:newUser.email,lastName:newUser.lastName}, JWT_SECRET,{expiresIn:'1h'});

    const cookieOptions = {
        expires: new Date(Date.now() + 1 * 60 * 60 * 1000),
    };

    newUser.password = undefined;
    res.status(200).cookie("token", token,cookieOptions).send({success:'true',createdUser:newUser});
}
       }
    else
    res.status(400).send(result.error.issues)

})
app.post('/api/auth/login',async(req,res)=>{
const result=loginSchema.safeParse(req.body);
if(result.success){
    const user=await User.findOne({email:req.body.email}).select('+password');
    if(user)
    {
        const isPasswordValid=await bcrypt.compare(req.body.password, user.password);
        if(!isPasswordValid)
        return res.status(401).send({success:'false',message:'Wrong password'})
        const userRes=await User.findOne({email:req.body.email});
        const token = jwt.sign({firstName:userRes.firstName,email:userRes.email,lastName:userRes.lastName}, JWT_SECRET,{expiresIn:'1h'});

        const cookieOptions = {
            expires: new Date(Date.now() + 1 * 60 * 60 * 1000),
            
        };
        return res.status(200).cookie("token", token,cookieOptions).send({success:'true',foundUser:userRes})
    }else
    return res.status(401).send({success:'false',message:'Wrong email'})
}
    res.status(200).send("recieved")

})
app.get('/api/auth/logout',async(req,res)=>{
    console.log('logout')
    try{
        res.cookie("token", null, {
            expires: new Date(Date.now()),
            httpOnly: true,
          });
        
          res.status(200).json({
            success: true,
            message: "Logout Success",
          });
    }catch(err){
        console.log(err)
    }
    
})

//authorised endpoints
   //wishlist
app.get('/api/user/wishlist',async(req,res)=>{
    try{
        if(req.cookies.token)
        {
            const decode = jwt.verify(req.cookies.token, JWT_SECRET);
const user=await User.findOne({email:decode.email})
if(user)
res.status(200).send({success:'true',wishlist:user.wishlist})

        }
        else
        res.status(401).send({success:false,message:'Unauthorised request'})
    }
catch(err){
    console.log(err);
}
})
app.post('/api/user/wishlist',async(req,res)=>{
    try{
        if(req.cookies.token)
        {
            const decode = jwt.verify(req.cookies.token, JWT_SECRET);
const user=await User.findOneAndUpdate({email:decode.email},{$push:{wishlist:req.body.product}})
if(user)
res.status(200).send({success:'true',wishlist:user.wishlist})

        }
        else
        res.status(401).send({success:false,message:'Unauthorised request'})
    }
catch(err){
    console.log(err);
}
})

app.delete('/api/user/wishlist/:id',async(req,res)=>{
    try{
        if(req.cookies.token)
        {
            const itemid=req.params.id;
            
            const decode = jwt.verify(req.cookies.token, JWT_SECRET);
const user=await User.findOneAndUpdate({email:decode.email},{$pull:{wishlist:{_id:itemid}}},{new:true})
if(user)
res.status(200).send({success:'true',wishlist:user.wishlist})

        }
        else
        res.status(401).send({success:false,message:'Unauthorised request'})
    }
catch(err){
    console.log(err);
}
})

  //cart endpoints
app.get('/api/user/cart',async(req,res)=>{
    try{
        if(req.cookies.token)
        {
            const decode = jwt.verify(req.cookies.token, JWT_SECRET);
const user=await User.findOne({email:decode.email})
if(user)
res.status(200).send({success:'true',cart:user.cart})

        }
        else
        res.status(401).send({success:false,message:'Unauthorised request'})
    }
catch(err){
    console.log(err);
}
})
app.post('/api/user/cart',async(req,res)=>{
    try{
        if(req.cookies.token)
        {
            const decode = jwt.verify(req.cookies.token, JWT_SECRET);
const user=await User.findOneAndUpdate({email:decode.email},{$push:{cart:{...req.body.product,qty:1}}},{new:true})
if(user)
res.status(200).send({success:'true',cart:user.cart})

        }
        else
        res.status(401).send({success:false,message:'Unauthorised request'})
    }
catch(err){
    console.log(err);
}
})
app.post('/api/user/cart/:id',async(req,res)=>{
try{
    if(req.cookies.token)
    {
    const itemid=req.params.id;
    const decode = jwt.verify(req.cookies.token, JWT_SECRET);
if(req.body.action.type==='increment')
{
    const user=await User.findOneAndUpdate({email:decode.email,'cart._id':itemid},{$inc:{'cart.$.qty':1}},{new:true})
    if(user)
res.status(201).send({success:true,cart:user.cart});
}
else if(req.body.action.type==='decrement')
{
    const user=await User.findOneAndUpdate({email:decode.email,'cart._id':itemid},{$inc:{'cart.$.qty':-1}},{new:true})
if(user)
res.status(201).send({success:true,cart:user.cart});
}}
else
res.status(401).send({success:false,message:'Unauthorised request'})

}catch(err){
    console.log(err)
}}
)
app.delete('/api/user/cart/:id',async(req,res)=>{
    try{
        if(req.cookies.token)
        {
            const itemid=req.params.id;
            console.log(itemid)
            const decode = jwt.verify(req.cookies.token, JWT_SECRET);
const user=await User.findOneAndUpdate({email:decode.email},{$pull:{cart:{_id:itemid}}},{new:true})
if(user)
res.status(200).send({success:'true',cart:user.cart})

        }
        else
        res.status(401).send({success:false,message:'Unauthorised request'})
    }
catch(err){
    console.log(err);
}
})

//user endpoint
app.get('/users', async (req, res) => {
    try {
        if(req.cookies.token)
        {
            const decode = jwt.verify(req.cookies.token, JWT_SECRET);
const user=await User.findOne({email:decode.email})
if(user){
    res.status(200).send({success:true,foundUser:user   });

}
else{
    res.status(200).send({success:false,message:'user Not found'  });
}

        }
        else
        res.status(401).send({success:false,message:'Unauthorised request'})
        
    } catch (error) {
        res.status(400).send(error);
    }
});


//order endpoint
app.get('/api/user/orders',async(req,res)=>{
    try{
if(req.cookies.token){
const decode =jwt.verify(req.cookies.token,JWT_SECRET);
const user=await User.findOne({email:decode.email});
if(user)
res.status(200).send({success:true,orders:user.orders})
}else
res.status(401).send({success:false,message:'Unauthorised request'})
    }catch(err){
        console.log(err)
    }
})
app.post('/api/user/orders',async(req,res)=>{
    try{
        if(req.cookies.token){
            const decode =jwt.verify(req.cookies.token,JWT_SECRET);
            const user=await User.findOneAndUpdate({email:decode.email},{$push:{orders:req.body.order}},{new:true})
            if(user)
            res.status(201).send({success:true,orders:user.orders})
        }else
            res.status(401).send({success:false,message:'Unauthorised request'})
    }catch(err){
        console.log(err)
    }
})
//address endpoint

app.get('/api/user/address',async(req,res)=>{
    try{
        console.log('here')
if(req.cookies.token){
const decode =jwt.verify(req.cookies.token,JWT_SECRET);
const user=await User.findOne({email:decode.email});
if(user)
res.status(200).send({success:true,address:user.addresses})
}
    }catch(err){
        console.log(err)
    }
})
app.post('/api/user/address',async(req,res)=>{
    try{
        if(req.cookies.token){
            const decode =jwt.verify(req.cookies.token,JWT_SECRET);
            const user=await User.findOneAndUpdate({email:decode.email},{$push:{addresses:{...req.body.address,_id:new ObjectId()}}},{new:true})
            if(user)
            res.status(201).send({success:true,address:user.addresses})
        }else
            res.status(401).send({success:false,message:'Unauthorised request'})
    }catch(err){
        console.log(err)
    }
})
app.put('/api/user/address/:id',async(req,res)=>{
    try{
        if(req.cookies.token){
            console.log(req.body.address)
            const decode =jwt.verify(req.cookies.token,JWT_SECRET);
            const user=await User.findOneAndUpdate({email:decode.email,'addresses._id':new ObjectId(req.params.id)},{$set:{'addresses.$':{...req.body.address,_id:new ObjectId(req.params.id)}}},{new:true})
            if(user)
            res.status(201).send({success:true,address:user.addresses})
        }else
            res.status(401).send({success:false,message:'Unauthorised request'})
    }catch(err){
        console.log(err)
    }
})
app.delete('/api/user/address/:id',async(req,res)=>{
    try{
        if(req.cookies.token && req.params.id){
            const decode =jwt.verify(req.cookies.token,JWT_SECRET);
            const user=await User.findOneAndUpdate({email:decode.email},{$pull:{addresses:{_id:new ObjectId(req.params.id)}}},{new:true})
            if(user)
            res.status(201).send({success:true,address:user.addresses})
        }else
        res.status(401).send({success:false,message:'Unauthorised request'})
    }catch(err){
console.log(err);
    }
})