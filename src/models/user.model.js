import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
// we wnt password encrption before data save using mongoose middleware

const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowecase: true,
        trim: true,
        index: true  //  if you want it in serching field of database basically you want database to use this field as searching index
    },
    email: {
       type: String,
       required: true,
       trim: true,
       index: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
       type: String, // cloudinary
       required: true
    },
    coverImage: {
        type: String,  // cloudinary
    },
    watchHistory: [
        {
        type: Schema.Types.ObjectId,
        ref: "Video"
        }
    ],
    password: {
        type: String,  // data store in string(encrypted) format
        required: [true, 'Password is required']
    },
    refreshToken: {
        type: String,
    }
}, {timestamps: true})

// userSchema.pre("save", async function (next) {      // here we dont use callback fun bcoz this keyword cant be used and we cant access user schema
//     if(!this.isModifies("password")) return next();

//      this.password = await bcrypt.hash(this.password, 10) // 
//      next()
// }) 

userSchema.pre("save", async function () {
  // if password field is not modified, skip hashing
  if (!this.isModified("password")) return ; // isModified is a method

  // hash password
  this.password = await bcrypt.hash(this.password, 10);

});


// mongoose also provide method just like middleware
// dcrypting the passwpord
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(  // this generate token
        {
            _id: this._id, // mongodb id
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },

        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)