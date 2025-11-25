import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN,  // it allows the communication of frontend with backend only throgh this link
    credentials : true
}))

app.use(express.json({limit : "10kb"}))  //  express.json means json  data accept 
app.use(express.urlencoded({extended: true, limit: "10kb"}))
app.use((express.static("public")))
app.use(cookieParser())

export { app }