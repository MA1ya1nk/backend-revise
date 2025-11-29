import { v2 as cloudinary } from "cloudinary";
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// it durectly work like
// cloudinary.v2.uploader.upload("<link>")  but we use professional approach

const uploadFiletoCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) return null;
        // upload file on cloudinary
        const res = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"  // img,file etc
        })
        // file uploaded successfully
        // console.log("file uploaded", res.url)
        // return res
        
        fs.unlinkSync(localFilePath) // delete file from local storage after upload
        return res

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the localy save file 
        return null;
    }
}

export { uploadFiletoCloudinary }