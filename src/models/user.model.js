import mongoose from "mongoose";
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
        index: true  //  if you want it in serching field
    },
    email: {
       type: String,
       required: true,
       trim: true,
       index: true
    },
    fulName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
       type: String, 
       required: true
    },
    coverImage: {
        type: String,
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
    refreshTokens: {
        type: String
    }
}, {timestamps: true})

userSchema.pre("save", async function (next) {      // here we dont use callback fun bcoz this keyword cant be used and we cant access user schema
    if(!this.isModifies("password")) return next();

     this.password = bcrypt.hash(this.password, 10) // 
     next()
}) 
// mongoose also provide method just like middleware

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
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
    return jwt,sign(
        {
            _id: this._id
        },
        process.env.ACCESS_TOKEN_EXPIRY,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema)