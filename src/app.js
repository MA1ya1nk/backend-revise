import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN,  // it allows the communication of frontend with backend only throgh this link
    credentials : true
}))

app.use(express.json({limit : "10kb"}))  //  express.json means json  data accept 
app.use(express.urlencoded({extended: true, limit: "10kb"})) // url data ko bhi accept karo
app.use((express.static("public"))) // public assets anyone can access it
app.use(cookieParser()) // cookie acceptance and send allowed

// routes import

import userRouter from "./routes/user.routes.js"

// routes declaration
app.use("/api/v1/users",userRouter) // whenever someone goes /user the control gives to userRouter 

export { app }