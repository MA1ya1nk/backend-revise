//verifies user exist or not
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

export const verifyJWT = asyncHandler( async(req, res, next) => { // a lot of time res type parameter that is not used is written as _(IMP)
    // parsing cookies from http request(IMP)
   try {
     const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")  // req.head for mobile // hear token in Authentication is like Bearer <Token>
     if(!token) throw new ApiError(401, "Unauthorized request")
 
     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
 
     const user = await User.findById(decodedToken?._id).select("-password -refreshToken") // in jwt _id is there it is not from mongodb
     if(!user) throw new ApiError(401, "Invalid access token")
 
     // adding user object to req
     req.user = user
     next()    
   } catch (error) {
     throw new ApiError(401, error?.message || "Invalid access token")
   }
})