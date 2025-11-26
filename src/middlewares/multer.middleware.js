import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp")
  },
  filename: function (req, file, cb) { // req has json data etc but file has files cb is callback
    cb(null, file.originalname) // here file.originalname is file name in local you can even change it 
  }
})

export const upload = multer({ storage: storage })
