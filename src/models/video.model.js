import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = mongoose.Schema({
    videoFile: {
        type: String, // from cloudinary
        required: trusted,
    },
    thumbnail: {
        type: String, // cloudinary
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    duration: {
        type: Number,  // cloudinary
        required: true
    },
    views: {
        type: Number,
        default: 0
    },
    isPubished: {
        type: Boolean,
        default: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
    
}, {timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate)  // agregation pipeline we can now write complex(aggregation) queries
export const Video = mongoose.model("Video", videoSchema)