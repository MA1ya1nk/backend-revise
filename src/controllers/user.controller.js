import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadFiletoCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) => {
  try{
    const user = await User.findOne(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    // adding refreshtoken in user
    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})  //  here if save click so through error that username etc field are required so use {} in save() 

    return {refreshToken, accessToken}

  } catch (error){
    throw new ApiError(500, "something went wrong while generating refresh and access token")
  }
}

const registerUser = asyncHandler( async (req, res) => {
    // 1. getting data from frontend
    const {fullName, email, username, password } = req.body
    console.log("email :", email);

    // 2. checking data is empty or not
   // if(fullName === "") throw new ApiError(400, "fullname is required")  you can check all fields like that

   if(
    [fullName, email, username, password].some((field) => field?.trim() === "") // int condition of if cond you are looping an array
   ){  // .trim method in string remove white spaces eg "   hello world   " becomes "hello world"
    throw new ApiError(400, "All fields are required")
   }

   // 3. check if user already exist
   const existedUser = await User.findOne({
    $or: [{username}, {email}]  // return if any among username or email exist
   })
   
   if(existedUser) throw new ApiError(409,"user already existed")

    // 4. check for images

   // multer gives access to files that you invoke in middleware 
   // middlewaare even add data in res.body
   
  const avatarLocalPath = req.files?.avatar[0]?.path // local file path
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;  // re.file send data in [{},{}] form

  let coverImageLocalPath
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
     coverImageLocalPath = req.files.coverImage[0].path

  if(!avatarLocalPath) throw new ApiError(400, "Avatar file required")

  // 5.  upload data on cloudinary
  const avatar = await uploadFiletoCloudinary(avatarLocalPath)
  const coverImage = await uploadFiletoCloudinary(coverImageLocalPath)
  
  // 6. check avatar upload or not
  if(!avatar) throw new ApiError(400, "Avatar file is required")

  // 7.  enter into database
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"  // -pasword means password nhi lena aur refresh token bhi nhi lena

  )
  if(!createdUser) throw new ApiError(500, "something went wrong while registering the user")

  return res.status(201).json(
    new ApiResponse(200, createdUser, "user registered successfully")
  )

  //
  
})

const loginUser = asyncHandler( async (req,res) => {
    // data from req body
    // username or email
    // find the user
    // password check
    // generate access and refresh token 
    // send these through cookie
    console.log("yes")
    const {username, email, password} = req.body
    console.log(username, email)

    if(!username && !email) throw new ApiError(400, "username or email is required")

    const user = await User.findOne({
      $or : [{username}, {email}]
    }) 
    
    if(!user) throw new ApiError(400, "User does not exist")

    // here we use user not User coz such methods belongs to every specific user but not User schema of mongoose(IMP)
    const isPasswordValid = await user.isPasswordCorrect(password)  
    if(!isPasswordValid) throw new ApiError(400, "password is incorrect")

      // acess and generate token is used lot of times so create a new method

      const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)  // refresh token is update here so user does not have refresh token

      // same user is access with new refresh token 
      const loggedInuser = await User.findById(user._id).select("-password -refreshToken")
      
      // sending these tokens into cookies
      const options = {
         httpOnly: true,  // by this no one can update cookie on frontend and modifiable through server only
         secure: true
      }

      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInuser, accessToken,
            refreshToken
          },
          "User logged in succesfully"
        )
      )

})

const logoutUser = asyncHandler( async(req, res) => {
    // remove refresh and access token from cookie
    // remove refresh token from database
     // here a probem hoe to access user we dont have any mail, pass or id

     // due to ading cookie-parser as a midleware we are able to aaccess an object to both req and res that's why we didres.cookie(refreshToken)
     
     await User.findByIdAndUpdate(
        req.user._id,  // find by this
        {
          $set: {  // update by this
            refreshToken: undefined
          }
        },{
          new: true
        }
     )
     console.log("refresh token updated")
     // you can even do search by id then update the user by deleting refresh token

     const options = {
      httpOnly: true,
      secure: true 
     }

     return res.status(200)
     .clearCookie("accessCookie", options)
     .clearCookie("refreshCookie", options)
     .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changePassword = asyncHandler( async(req,res) => {
   const {oldPassword, newPassword} = req.body

   /*
   if confirm password is also params so

   if(confirmPassword !== newPassword) throw new ApiError(400, "confirmPassword and new password are different")
   */

   const userFromDB = await User.findById(req.user?._id)
   const passwordCorrect = await userFromDB.isPasswordCorrect(oldPassword)

   if(!passwordCorrect) throw new ApiError(400, "Password is incorrect")

    userFromDB.password = newPassword

    await userFromDB.save({validateBeforeSave: false})

    return res.status(200)
    .json(new ApiResponse(200, {}, "Password changed"))
})

const getCurrentUser = asyncHandler( async(req, res) => {
  return res
  .status(200)
  .json(200, req.user, "current user fetched successfully")
})

const updateUserDetail = asyncHandler( async(req, res) => {
  const {email, fullName} = req.body

  if(!fullName || !email) throw new ApiError(400, "All fields are required")

  const user = await User.findByIdAndUpdate(
     req.user?._id,
     {
         $set: {
                fullName,
                email
            }
     },
     {new: true}
  ).select("-password")

  return res
  .status(200)
  .json(ApiResponse(200, user, "Details updated sucessfully"))
})

// in production file updation method is always in another method

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})


const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})


export { registerUser, loginUser, logoutUser, refreshAccessToken, changePassword
  , getCurrentUser, updateUserDetail, updateUserAvatar, updateUserCoverImage
  , getUserChannelProfile, getWatchHistory
 }