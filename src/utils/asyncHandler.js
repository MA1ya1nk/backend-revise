const asyncHandler = (requestHandler) => {
    return (req,res,next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}

export { asyncHandler }

    // in basically every route you try to access database that may throw error so inspite of declaring try catch block always we use this 



// const asyncHandler = (fn) => async(req, res, next) => {  // Higher order functions are the functions that accept another function as parameter 
//     try{
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }    