import express, { Request, Response, NextFunction } from 'express';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import userRouter from './routes/users'
import indexRouter from './routes/index';
import {db} from './config/index';
import adminRouter from './routes/Admin';
import vendorRouter from './routes/Vendor';
import dotenv from 'dotenv';
dotenv.config()

//Sequelize connection
db.sync().then(()=>{
    console.log("Db connected successfully")
}).catch(err =>{
    console.log(err)
})

const app = express();

app.use(express.json());
app.use(logger('dev'));
app.use(cookieParser());

//Router middleware
app.use('/', indexRouter)
app.use('/users', userRouter)
/* users is the base root & must be referenced whenever you're calling your localroot except its the 
index page which will be left as (/). Always put the base root */
app.use('/admins', adminRouter)
app.use ('/vendors', vendorRouter)

const port = 4000
app.listen(port, ()=>{
    console.log(`Server running on http://localhost:${port}`)
})

export default app;