import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadFiletoCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler( async (req, res) => {
    // 1. getting data from frontend
    const {fullName, email, username, password } = req.body
    console.log("email :", email);

    // 2. checking data is empty or not
   // if(fullName === "") throw new ApiError(400, "fullname is required")  you can check all fields like that

   if(
    [fullName, email, username, password].some((field) => field?.trim() === "")
   ){
    throw new ApiError(400, "All fields are required")
   }

   // 3. check if user already exist
   const existedUser = User.findOne({
    $or: [{username}, {email}]  // return if anything among username or email exist
   })
   
   if(existedUser) throw new ApiError(409,"user already existed")

    // 4. check for images

   // multer gives access to files that you invoke in middleware 
   // middlewaare even add data in res.body
   
  const avatarLocalPath = req.files?.avatar[0]?.path // local file path
  const coverImageLocalPath = req.files?.coverImage[0]?.path;
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
    "-password -refreshToken"  // -pasword means password nhi lena

  )
  if(!createdUser) throw new ApiError(500, "something went wrong while registering the user")

  return res.status(201).json(
    new ApiResponse(200, createdUser, "user registered successfully")
  )

  //
  
})

export { registerUser }