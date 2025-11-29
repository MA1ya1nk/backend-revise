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
         httpOnly: true,  // by this no one can update cookie ob frontend and modifiable through server only
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


export { registerUser, loginUser, logoutUser, refreshAccessToken }